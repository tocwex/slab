import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import type {
  Loadable, Nullable, Address, ChainAddress, Tax, UrbitID,
  Contract, Token, Transaction, TokenHolding, TokenHoldings,
  TokenboundAccount, SafeAccount, UrbitAccount, UrbitNetworkLayer,
  SafeResponse, SafeOwners, SafeArchive,
} from '@/type/slab';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import {
  getWalletClient, getBalance,
  readContract, writeContract,
  sendTransaction, waitForTransactionReceipt,
} from '@web3-onboard/wagmi';
import { TokenboundClient } from '@tokenbound/sdk';
import Safe, { getSafeAddressFromDeploymentTx } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { OperationType } from '@safe-global/types-kit';
import {
  recoverAddress, recoverMessageAddress, verifyMessage,
  formatUnits, hexToNumber, hexToBigInt, numberToHex, pad,
  parseEther, parseUnits, encodePacked, encodeFunctionData,
} from 'viem';
import { useWalletMeta, useTokenboundClient } from '@/hook/wallet';
import { useLocalTokens, useTokensAddMutation } from '@/hook/local';
import {
  createSafe, signTBSafeTx, fetchSafeAccount, fetchTBAddress,
  fetchToken, fetchUrbitID, decodeProposal,
} from '@/lib/web3';
import {
  getChainMeta, formContract, formToken, formUrbitID,
  isValidPDO, compareUrbitIDs, encodeSet, decodeSet, clamp,
} from '@/lib/util';
import { update as updateLocal } from '@/dat/local';
import { APP, ABI, ACCOUNT, CONTRACT, MATH, ERROR } from '@/dat/const';

// TODO: Secondary query invalidations don't seem to be working for tokenbound
// accounts (e.g. in `useTokenboundSendMutation`)

export function usePDOExecMutation(
  urbitPDO: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const pdoSafe = useSafeAccount(urbitPDO);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);
  const pdoKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({txHash}: {txHash: Address}) => {
      if (!wallet || !pdoSafe) throw Error(ERROR.INVALID_QUERY);
      const safeAccount: Safe = await fetchSafeAccount(wallet, (pdoSafe.address as Address));
      const safeClient = new SafeApiKit({chainId: wallet.chain});

      const safeTransaction = await safeClient.getTransaction(txHash);
      const executeTxResponse = await safeAccount.executeTransaction(safeTransaction);
      const executeReceipt = await waitForTransactionReceipt(wallet.wagmi, {
        hash: (executeTxResponse.hash as Address),
      });

      return executeReceipt.transactionHash;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData);
    },
    onSettled: async (_data, _error, {txHash}) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: pdoKey });
      if (!!wallet && !!tbClient) {
        const safeClient = new SafeApiKit({chainId: wallet.chain});
        const safeRawTx = await safeClient.getTransaction(txHash);
        const safeRawData = ((safeRawTx?.data || "0x0") as Address);
        const safeTx = await decodeProposal(wallet, safeRawData);
        if (safeTx.type === "transfer") {
          const urbitID = await fetchUrbitID(wallet, tbClient, safeTx.to);
          queryClient.invalidateQueries({queryKey: [
            APP.TAG, "tokenbound", "account", wallet.chainID, urbitID.id,
          ]});
        }
      }
    },
    ...options,
  });
}

export function usePDOMintMutation(
  urbitID: UrbitID,
  urbitPDO: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const idAccount = useTokenboundAccount(urbitID);
  const pdoAccount = useTokenboundAccount(urbitPDO);
  const pdoSafe = useSafeAccount(urbitPDO);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);
  const pdoKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({amount, recipient}: {
      amount: string,
      recipient: string,
    }) => {
      if (!wallet || !tbClient || !idAccount || !pdoAccount || !pdoSafe)
        throw Error(ERROR.INVALID_QUERY);
      if (!pdoAccount.token)
        throw Error("Cannot mint tokens for PDO without dedicated token");
      const recipientAddress = await fetchTBAddress(wallet, tbClient, recipient);
      const recipientAmount = parseUnits(amount, pdoAccount.token.decimals);

      const tbMintTransaction = await tbClient.prepareExecution({
        account: pdoAccount.address,
        to: pdoAccount.token.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: ABI.TOCWEX_TOKEN_V1,
          functionName: "mint",
          args: [recipientAddress, recipientAmount],
        }),
      });

      const safeAccount: Safe = await fetchSafeAccount(wallet, (pdoSafe.address as Address));
      const safeTransaction = await safeAccount.createTransaction({
        transactions: [{
          operation: OperationType.Call,
          to: tbMintTransaction.to,
          data: tbMintTransaction.data,
          value: tbMintTransaction.value.toString(),
        }],
      });
      const safeTxHash = await safeAccount.getTransactionHash(safeTransaction);
      const safeTxSign = await signTBSafeTx(wallet, idAccount.address, safeTxHash);

      const safeClient = new SafeApiKit({chainId: wallet.chain});
      await safeClient.proposeTransaction({
        safeAddress: pdoSafe.address,
        safeTransactionData: safeTransaction.data,
        safeTxHash: safeTxHash,
        senderAddress: idAccount.address,
        senderSignature: safeTxSign,
      });

      return (safeTxSign as Address);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: pdoKey });
    },
    ...options,
  });
}

export function usePDOLaunchMutation(
  urbitID: UrbitID,
  urbitPDO: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const idAccount = useTokenboundAccount(urbitID);
  const pdoAccount = useTokenboundAccount(urbitPDO);
  const pdoSafe = useSafeAccount(urbitPDO);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);
  const pdoKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({name, symbol, init_supply, max_supply}: {
      name: string,
      symbol: string,
      init_supply: string,
      max_supply: string,
    }) => {
      if (!wallet || !tbClient || !idAccount || !pdoAccount || !pdoSafe)
        throw Error(ERROR.INVALID_QUERY);
      const initSupply = clamp(parseUnits(init_supply, 18), BigInt(0), MATH.MAX_UINT256);
      const maxSupply = clamp(parseUnits(max_supply, 18), BigInt(0), MATH.MAX_UINT256);
      const salt = pad("0x0"); // TODO: Customize or randomize salt?
      if (maxSupply < initSupply)
        throw Error("Maximum token supply must be at least as large as initial supply.");

      const DEPLOY_V1: Contract = formContract(wallet.chain, "DEPLOYER_V1");
      const TOKENBOUND: Contract = formContract(wallet.chain, "TOKENBOUND");
      const tbLaunchTransaction = await tbClient.prepareExecution({
        account: pdoAccount.address,
        to: DEPLOY_V1.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DEPLOY_V1.abi,
          functionName: "deploySyndicate",
          args: [TOKENBOUND.address, salt, initSupply, maxSupply, urbitPDO.id, name, symbol],
        }),
      });

      const safeAccount: Safe = await fetchSafeAccount(wallet, (pdoSafe.address as Address));
      const safeTransaction = await safeAccount.createTransaction({
        transactions: [{
          operation: OperationType.Call,
          to: tbLaunchTransaction.to,
          data: tbLaunchTransaction.data,
          value: tbLaunchTransaction.value.toString(),
        }],
      });
      const safeTxHash = await safeAccount.getTransactionHash(safeTransaction);
      const safeTxSign = await signTBSafeTx(wallet, idAccount.address, safeTxHash);

      const safeClient = new SafeApiKit({chainId: wallet.chain});
      await safeClient.proposeTransaction({
        safeAddress: pdoSafe.address,
        safeTransactionData: safeTransaction.data,
        safeTxHash: safeTxHash,
        senderAddress: idAccount.address,
        senderSignature: safeTxSign,
      });

      return (safeTxSign as Address);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: pdoKey });
    },
    ...options,
  });
}

export function usePDOSignMutation(
  urbitID: UrbitID,
  urbitPDO: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const idAccount = useTokenboundAccount(urbitID);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({txHash}: {txHash: Address}) => {
      if (!wallet || !idAccount) throw Error(ERROR.INVALID_QUERY);
      const txSign = await signTBSafeTx(wallet, idAccount.address, txHash);
      const safeClient = new SafeApiKit({chainId: wallet.chain});
      await safeClient.confirmTransaction(txHash, txSign);
      return (txSign as Address);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    ...options,
  });
}

export function usePDOSendMutation(
  urbitID: UrbitID,
  urbitPDO: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const idAccount = useTokenboundAccount(urbitID);
  const pdoAccount = useTokenboundAccount(urbitPDO);
  const pdoSafe = useSafeAccount(urbitPDO);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({token: symbol, recipient, amount}: {
      token: string,
      recipient: string,
      amount: string,
    }) => {
      if (!wallet || !tbClient || !idAccount || !pdoAccount || !pdoSafe)
        throw Error(ERROR.INVALID_QUERY);
      const TOKEN: Token = await fetchToken(wallet, symbol);
      const recipientAddress = await fetchTBAddress(wallet, tbClient, recipient);
      const tbTransferTransaction = await ((symbol === "ETH") ? tbClient.prepareExecution({
        account: pdoAccount.address,
        to: recipientAddress,
        value: parseEther(amount),
        data: "0x",
      }) : tbClient.prepareExecution({
        account: pdoAccount.address,
        to: TOKEN.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: TOKEN.abi,
          functionName: "transfer",
          args: [recipientAddress, parseUnits(amount, TOKEN.decimals)],
        }),
      }));

      const safeAccount: Safe = await fetchSafeAccount(wallet, (pdoSafe.address as Address));
      const safeTransaction = await safeAccount.createTransaction({
        transactions: [{
          operation: OperationType.Call,
          to: tbTransferTransaction.to,
          data: tbTransferTransaction.data,
          value: tbTransferTransaction.value.toString(),
        }],
      });
      const safeTxHash = await safeAccount.getTransactionHash(safeTransaction);
      const safeTxSign = await signTBSafeTx(wallet, idAccount.address, safeTxHash);

      const safeClient = new SafeApiKit({chainId: wallet.chain});
      await safeClient.proposeTransaction({
        safeAddress: pdoSafe.address,
        safeTransactionData: safeTransaction.data,
        safeTxHash: safeTxHash,
        senderAddress: idAccount.address,
        senderSignature: safeTxSign,
      });

      return (safeTxSign as Address);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    ...options,
  });
}

export function usePDOCreateMutation(
  urbitID: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "wallet", "urbit-ids", wallet?.chainID, wallet?.address,
  ], [wallet?.chainID, wallet?.address]);
  const localKey: QueryKey = useMemo(() => [
    APP.TAG, "local", "safes", wallet?.chainID,
  ], [wallet?.chainID]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({safe, managers, reset}: {
      safe: Address,
      managers: UrbitID[],
      reset: boolean,
    }) => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      const ECLIPTIC: Token = formToken(wallet.chain, "ECL");

      const transferTransaction = await writeContract(wallet.wagmi, {
        abi: ECLIPTIC.abi,
        address: ECLIPTIC.address,
        functionName: "transferPoint",
        args: [Number(urbitID.id), safe, reset],
      });
      const transferReceipt = await waitForTransactionReceipt(wallet.wagmi, {
        hash: transferTransaction,
      });

      { // remove safe from local safes cache
        const owners: Address[] = await Promise.all(managers.map((urbitID) => (
          fetchTBAddress(wallet, tbClient, urbitID)
        )));
        const tbContract = formContract(wallet.chain, "TOKENBOUND");
        const tbKey: ChainAddress = `${wallet.chain}:${tbContract.address}`;
        await updateLocal("safes", (oldArchive: SafeArchive | undefined) => {
          const newArchive: SafeArchive = (oldArchive ?? {});
          const oldOwners: SafeOwners = (newArchive?.[tbKey] ?? {});
          delete oldOwners[encodeSet(new Set<Address>(owners))];
          newArchive[tbKey] = oldOwners;
          return newArchive;
        });
      }

      return transferReceipt.transactionHash;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData);
    },
    onSettled: (_data, _error, {managers}) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: localKey });
      for (const managerID of managers) {
        queryClient.invalidateQueries({queryKey: [
          APP.TAG, "safe", "pdos", wallet?.chainID, managerID.id,
        ]});
      }
    },
    ...options,
  });
}

export function useSafeCreateMutation(
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "local", "safes", wallet?.chainID,
  ], [wallet?.chainID]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({managers, threshold}: {
      managers: UrbitID[],
      threshold: number,
    }) => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      const owners: Address[] = await Promise.all(managers.map((urbitID) => (
        fetchTBAddress(wallet, tbClient, urbitID)
      )));

      const safeAddress = await createSafe(wallet, tbClient, owners, threshold);
      { // add new safe to local safes cache
        const tbContract = formContract(wallet.chain, "TOKENBOUND");
        const tbKey: ChainAddress = `${wallet.chain}:${tbContract.address}`;
        await updateLocal("safes", (oldArchive: SafeArchive | undefined) => {
          const newArchive: SafeArchive = (oldArchive ?? {});
          const oldOwners: SafeOwners = (newArchive?.[tbKey] ?? {});
          const newOwners: SafeOwners = {...oldOwners, ...({
            [encodeSet(new Set<Address>(owners))]: safeAddress,
          })};
          newArchive[tbKey] = newOwners;
          return newArchive;
        });
      }

      return safeAddress;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData);
    },
    onSettled: (_data, _error, {managers}) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    ...options,
  });
}

export function useSafeProposals(urbitPDO: UrbitID): Loadable<SafeResponse[]> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      const ECLIPTIC: Token = formToken(wallet.chain, "ECL");
      const safeAddress = ((await readContract(wallet.wagmi, {
        abi: ECLIPTIC.abi,
        address: ECLIPTIC.address,
        functionName: "ownerOf",
        args: [urbitPDO.id],
      })) as Address);

      const safeClient = new SafeApiKit({chainId: wallet.chain});
      const safeProposals = await safeClient.getPendingTransactions(safeAddress);

      const safeTransactions: SafeResponse[] = [];
      for (const proposal of safeProposals.results) {
        const proposalData: Address = ((proposal.data ?? "0x0") as Address);
        // TODO: Our custom ERC-6551 implementation calls are too exotic to be
        // decoded by Safe's in-house solution
        const safeTransaction: Transaction = await decodeProposal(wallet, proposalData);
        safeTransactions.push({...proposal, transaction: safeTransaction});
      }

      return safeTransactions;
    },
    enabled: !!wallet && !!tbClient,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as SafeResponse[]);
}

export function useSafePDOs(urbitID: UrbitID): Loadable<UrbitID[]> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "pdos", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      const azimuth: Contract = formContract(wallet.chain, "AZP");
      const safeClient = new SafeApiKit({chainId: wallet.chain});

      const tbAddress = await fetchTBAddress(wallet, tbClient, urbitID);
      const { safes } = await safeClient.getSafesByOwner(tbAddress);

      // NOTE: A Gnosis-recognized escrow contract, i.e. SAFE, is a PDO iff:
      // - The SAFE holds exactly 1 Urbit ID
      // - The Urbit ID held by the SAFE has a deployed TBA
      const urbitPDOs: UrbitID[] = [];
      for (const safe of safes) {
        const safePoints = ((await readContract(wallet.wagmi, {
          abi: azimuth.abi,
          address: azimuth.address,
          functionName: "getOwnedPoints",
          args: [safe],
        })) as number[]);
        if (safePoints.length === 1) {
          const safeUrbitID: UrbitID = formUrbitID(safePoints[0]);
          const safeAddress = await fetchTBAddress(wallet, tbClient, safeUrbitID);
          const safePointIsDeployed: boolean = await tbClient.checkAccountDeployment({
            accountAddress: safeAddress,
          });
          if (safePointIsDeployed && isValidPDO(safeUrbitID)) {
            urbitPDOs.push(safeUrbitID);
          }
        }
      }

      return urbitPDOs.sort(compareUrbitIDs);
    },
    enabled: !!wallet && !!tbClient,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as UrbitID[]);
}

export function useTokenboundSendMutation(
  urbitID: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const tbAccount = useTokenboundAccount(urbitID);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({token: symbol, recipient, amount}: {
      token: string,
      recipient: string,
      amount: string,
    }) => {
      if (!wallet || !tbClient || !tbAccount) throw Error(ERROR.INVALID_QUERY);
      const TOKEN = await fetchToken(wallet, symbol);
      const tbAddress = await fetchTBAddress(wallet, tbClient, recipient);
      const txHash = await ((symbol === "ETH") ? tbClient.transferETH({
        account: tbAccount.address,
        amount: Number(amount),
        recipientAddress: tbAddress,
      }) : tbClient.transferERC20({
        account: tbAccount.address,
        amount: Number(amount),
        recipientAddress: tbAddress,
        erc20tokenAddress: TOKEN.address,
        erc20tokenDecimals: TOKEN.decimals,
      }));
      const txReceipt = await waitForTransactionReceipt(wallet.wagmi, {hash: txHash});
      return txReceipt.transactionHash;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData);
    },
    onSettled: (_data, _error, {recipient}) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({queryKey: [
        APP.TAG, "tokenbound", "account", wallet?.chainID, formUrbitID(recipient).id,
      ]});
    },
    ...options,
  });
}

export function useTokenboundCreateMutation(
  urbitID: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      const ECLIPTIC: Token = formToken(wallet.chain, "ECL");
      const { txHash } = await tbClient.createAccount({
        tokenContract: ECLIPTIC.address,
        tokenId: urbitID.id,
      });
      const txReceipt = await waitForTransactionReceipt(wallet.wagmi, {hash: txHash});
      return txReceipt.transactionHash;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    ...options,
  });
}

export function useTokenboundAccount(urbitID: UrbitID): Loadable<TokenboundAccount> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const localTokens = useLocalTokens();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet || !tbClient || !localTokens) throw Error(ERROR.INVALID_QUERY);
      const tbAddress = await fetchTBAddress(wallet, tbClient, urbitID);
      const tbIsDeployed: boolean = await tbClient.checkAccountDeployment({
        accountAddress: tbAddress,
      });

      const NULL: Contract = formContract(wallet.chain, "NULL");
      const REGISTRY: Contract = formContract(wallet.chain, "REGISTRY");
      const tbTokenAddress: Address = ((await readContract(wallet.wagmi, {
        abi: REGISTRY.abi,
        address: REGISTRY.address,
        functionName: "getSyndicateTokenAddressUsingAzimuthPoint",
        args: [urbitID.id],
      })) as Address);

      let tbToken: Token | undefined = undefined;
      if (tbTokenAddress !== NULL.address) {
        tbToken = await fetchToken(wallet, tbTokenAddress);
      }

      const tbHoldings: TokenHoldings = {};
      for (const token of [
        formToken(wallet.chain, "ETH"),
        formToken(wallet.chain, "USDC"),
        ...(!tbToken ? [] : [tbToken]),
        ...(Object.values(localTokens)),
      ]) {
        const holding = await getBalance(wallet.wagmi, {
          address: tbAddress,
          token: (token.address === NULL.address)
            ? undefined
            : token.address,
        });
        tbHoldings[token.symbol] = {
          balance: holding.value,
          token: token,
        };
      }

      return {
        address: tbAddress,
        deployed: tbIsDeployed,
        holdings: tbHoldings,
        token: tbToken,
      };
    },
    enabled: !!wallet && !!tbClient && !!localTokens && !!urbitID.id,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as TokenboundAccount);
}

export function useSafeAccount(urbitID: UrbitID): Loadable<SafeAccount> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "account", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const ECLIPTIC: Token = formToken(wallet.chain, "ECL");
      const safeAddress = ((await readContract(wallet.wagmi, {
        abi: ECLIPTIC.abi,
        address: ECLIPTIC.address,
        functionName: "ownerOf",
        args: [urbitID.id],
      })) as Address);

      const safeClient = new SafeApiKit({chainId: wallet.chain});
      const safeInfo = await safeClient.getSafeInfo(safeAddress);

      return safeInfo;
    },
    enabled: !!wallet,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as SafeAccount);
}

export function useUrbitAccount(urbitID: UrbitID): Loadable<UrbitAccount> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "urbit", "account", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const [ , chainTag] = getChainMeta(wallet.chain);
      const AZP_L2: Address = ACCOUNT.AZP_L2?.[chainTag] ?? ACCOUNT.AZP_L2.ETHEREUM;
      const ECLIPTIC: Token = formToken(wallet.chain, "ECL");

      let owner: Address = AZP_L2;
      let layer: UrbitNetworkLayer = "l2";
      const pointExists: boolean = ((await readContract(wallet.wagmi, {
        abi: ECLIPTIC.abi,
        address: ECLIPTIC.address,
        functionName: "exists",
        args: [urbitID.id],
      })) as boolean);
      if (pointExists) {
        owner = ((await readContract(wallet.wagmi, {
          abi: ECLIPTIC.abi,
          address: ECLIPTIC.address,
          functionName: "ownerOf",
          args: [urbitID.id],
        })) as Address);
        layer = (owner === AZP_L2) ? "l2" : "l1";
      }

      return { layer, owner };
    },
    enabled: !!wallet,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as UrbitAccount);
}

export function useSyndicateTax(urbitID: UrbitID): Loadable<Tax> {
  const wallet = useWalletMeta();
  const idAccount = useTokenboundAccount(urbitID);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tax", "syndicate", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet || !idAccount) throw Error(ERROR.INVALID_QUERY);
      let syndicateFee: bigint = BigInt(0);
      let syndicateTo: Address = formContract(wallet.chain, "NULL").address;

      if (!!idAccount.token) {
        syndicateFee = ((await readContract(wallet.wagmi, {
          abi: ABI.TOCWEX_TOKEN_V1,
          address: idAccount.token.address,
          functionName: "getProtocolFee",
        })) as bigint);
        syndicateTo = ((await readContract(wallet.wagmi, {
          abi: ABI.TOCWEX_TOKEN_V1,
          address: idAccount.token.address,
          functionName: "getFeeRecipient",
        })) as Address);
      }

      return {
        fee: syndicateFee,
        to: syndicateTo,
      };
    },
    enabled: !!wallet && !!idAccount,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as Tax);
}

export function useDeployerTax(): Loadable<Tax> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tax", "deployer", wallet?.chainID,
  ], [wallet?.chainID]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const DEPLOY_V1: Contract = formContract(wallet.chain, "DEPLOYER_V1");
      const deployFee = ((await readContract(wallet.wagmi, {
        abi: DEPLOY_V1.abi,
        address: DEPLOY_V1.address,
        functionName: "getFee",
      })) as bigint);
      const deployRecipient = ((await readContract(wallet.wagmi, {
        abi: DEPLOY_V1.abi,
        address: DEPLOY_V1.address,
        functionName: "getFeeRecipient",
      })) as Address);

      return {
        fee: deployFee,
        to: deployRecipient,
      };
    },
    enabled: !!wallet,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as Tax);
}

export function useTokenboundUrbitID(address: Address): Loadable<UrbitID> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "urbit", wallet?.chainID, address,
  ], [wallet?.chainID, address]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      const urbitID = await fetchUrbitID(wallet, tbClient, address);
      return urbitID;
    },
    enabled: !!wallet && !!tbClient,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as UrbitID);
}
