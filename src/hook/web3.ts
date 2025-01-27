import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import type { Config as WagmiConfig } from '@wagmi/core';
import type { EIP1193Provider } from 'viem';
import type {
  Loadable, Nullable, Address, UrbitID, WalletMeta,
  Contract, Token, TokenHolding, TokenHoldings,
  TokenboundAccount, SafeAccount, SafeResponse,
} from '@/type/slab';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import {
  getWalletClient, getAccount, getBalance,
  signMessage, readContract, writeContract,
  sendTransaction, waitForTransactionReceipt,
} from '@web3-onboard/wagmi';
import { TokenboundClient } from '@tokenbound/sdk';
import Safe, { getSafeAddressFromDeploymentTx } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { OperationType } from '@safe-global/types-kit';
import {
  recoverAddress, recoverMessageAddress, verifyMessage,
  formatUnits, hexToNumber, hexToBigInt, numberToHex, keccak256, pad,
  parseEther, parseUnits, encodePacked, encodeFunctionData,
} from 'viem';
import { fetchSafeAccount, fetchTBAddress } from '@/lib/web3';
import { formContract, formToken, formUrbitID, decodePDOProposal } from '@/lib/util';
import { APP, ACCOUNT, CONTRACT, ERROR } from '@/dat/const';

export function usePDOExecMutation(
  urbitPDO: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const pdoSafe = useSafeAccount(urbitPDO);
  // TODO: Need the query key of the PDO TBA as well
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);
  // const queryKey: QueryKey = useMemo(() => [
  //   APP.TAG, "tokenbound", "account", wallet?.stateID, urbitID.id,
  // ], [wallet?.stateID, urbitPDO.id]);

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
      queryClient.setQueryData(queryKey, oldData)
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey })
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
  // TODO: Need the query key of the PDO TBA as well
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);
  // const queryKey: QueryKey = useMemo(() => [
  //   APP.TAG, "tokenbound", "account", wallet?.stateID, urbitPDO.id,
  // ], [wallet?.stateID, urbitPDO.id]);

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
      const initSupply = parseUnits(init_supply, 18);
      const maxSupply = parseUnits(max_supply, 18);

      const deployer: Contract = formContract(wallet.chain, "DEPLOYER_V1");
      const tbLaunchTransaction = await tbClient.prepareExecution({
        account: pdoAccount.address,
        to: deployer.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: deployer.abi,
          functionName: "deploySyndicate",
          args: [initSupply, maxSupply, urbitPDO.id, name, symbol],
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
      const safeTransactionHash = await safeAccount.getTransactionHash(safeTransaction);
      // NOTE: We can't use `Safe.signHash` because we need the TBA's signature
      // (see EIP-1271: https://eips.ethereum.org/EIPS/eip-1271)
      // const safeTransactionSig = await safeAccount.signHash(safeTransactionHash);
      const walletTransactionSig = await signMessage(wallet.wagmi, {
        account: wallet.address,
        message: { raw: (safeTransactionHash as Address) },
      });
      const safeTransactionSig = encodePacked(
        ["bytes32", "uint256", "uint8", "uint256", "bytes"],
        [pad(idAccount.address), BigInt(65), 0, BigInt((walletTransactionSig.length - 2) / 2), walletTransactionSig],
      );

      const safeClient = new SafeApiKit({chainId: wallet.chain});
      await safeClient.proposeTransaction({
        safeAddress: pdoSafe.address,
        safeTransactionData: safeTransaction.data,
        safeTxHash: safeTransactionHash,
        senderAddress: idAccount.address,
        senderSignature: safeTransactionSig,
      });

      return ("0x0" as Address);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData)
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey })
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
  // TODO: Need the query key of the PDO TBA as well
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);
  // const queryKey: QueryKey = useMemo(() => [
  //   APP.TAG, "tokenbound", "account", wallet?.stateID, urbitID.id,
  // ], [wallet?.stateID, urbitPDO.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({txHash}: {txHash: Address}) => {
      if (!wallet || !idAccount) throw Error(ERROR.INVALID_QUERY);
      // NOTE: We can't use `Safe.signHash` because we need the TBA's signature
      // (see EIP-1271: https://eips.ethereum.org/EIPS/eip-1271)
      // const safeTransactionSig = await safeAccount.signHash(safeTransactionHash);
      const walletTransactionSig = await signMessage(wallet.wagmi, {
        account: wallet.address,
        message: { raw: txHash },
      });
      const safeTransactionSig = encodePacked(
        ["bytes32", "uint256", "uint8", "uint256", "bytes"],
        [pad(idAccount.address), BigInt(65), 0, BigInt((walletTransactionSig.length - 2) / 2), walletTransactionSig],
      );

      const safeClient = new SafeApiKit({chainId: wallet.chain});
      await safeClient.confirmTransaction(txHash, safeTransactionSig);

      return ("0x0" as Address);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData)
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey })
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
  // TODO: Need the query key of the PDO TBA as well
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);
  // const queryKey: QueryKey = useMemo(() => [
  //   APP.TAG, "tokenbound", "account", wallet?.stateID, urbitPDO.id,
  // ], [wallet?.stateID, urbitPDO.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({token: symbol, recipient, amount}: {
      token: string,
      recipient: string,
      amount: string,
    }) => {
      if (!wallet || !tbClient || !idAccount || !pdoAccount || !pdoSafe)
        throw Error(ERROR.INVALID_QUERY);
      const recipientAddress = await fetchTBAddress(tbClient, urbitID, wallet.chain);
      const token: Token = formToken(wallet.chain, symbol);
      const tbTransferTransaction = await ((symbol === "ETH") ? tbClient.prepareExecution({
        account: pdoAccount.address,
        to: recipientAddress,
        value: parseEther(amount),
        data: "0x",
      }) : tbClient.prepareExecution({
        account: pdoAccount.address,
        to: token.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: token.abi,
          functionName: "transfer",
          args: [recipientAddress, parseUnits(amount, token.decimals)],
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
      const safeTransactionHash = await safeAccount.getTransactionHash(safeTransaction);
      // NOTE: We can't use `Safe.signHash` because we need the TBA's signature
      // (see EIP-1271: https://eips.ethereum.org/EIPS/eip-1271)
      // const safeTransactionSig = await safeAccount.signHash(safeTransactionHash);
      const walletTransactionSig = await signMessage(wallet.wagmi, {
        account: wallet.address,
        message: { raw: (safeTransactionHash as Address) },
      });
      const safeTransactionSig = encodePacked(
        ["bytes32", "uint256", "uint8", "uint256", "bytes"],
        [pad(idAccount.address), BigInt(65), 0, BigInt((walletTransactionSig.length - 2) / 2), walletTransactionSig],
      );

      const safeClient = new SafeApiKit({chainId: wallet.chain});
      await safeClient.proposeTransaction({
        safeAddress: pdoSafe.address,
        safeTransactionData: safeTransaction.data,
        safeTxHash: safeTransactionHash,
        senderAddress: idAccount.address,
        senderSignature: safeTransactionSig, // safeTransactionSig.data,
      });

      return ("0x0" as Address);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData)
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey })
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
  const tbAccount = useTokenboundAccount(urbitID);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "wallet", "urbit-ids", wallet?.chainID, wallet?.address,
  ], [wallet?.chainID, wallet?.address]);
  // TODO: also need to invalidate each owner's 'pdos' query key

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({managers, threshold}: {
      managers: string[],
      threshold: number,
    }) => {
      if (!wallet || !tbClient || !tbAccount) throw Error(ERROR.INVALID_QUERY);
      const owners: Address[] = [];
      for (const managerID of managers.map(formUrbitID)) {
        if (!managerID.id) throw Error("Invalid Urbit IDs");
        const managerAddress = await fetchTBAddress(tbClient, managerID, wallet.chain);
        owners.push(managerAddress);
      }

      const safeAccount: Safe = await fetchSafeAccount(wallet, [owners, threshold]);
      const deployTransaction = await safeAccount.createSafeDeploymentTransaction();
      // @ts-ignore
      const deployTxHash = await sendTransaction(wallet.wagmi, deployTransaction);
      const deployReceipt = await waitForTransactionReceipt(wallet.wagmi, {
        hash: deployTxHash,
      });
      const safeAddress = getSafeAddressFromDeploymentTx(deployReceipt, "1.4.1");

      const ECLIPTIC: Token = formToken(wallet.chain, "ECL");
      const transferTransaction = await writeContract(wallet.wagmi, {
        abi: ECLIPTIC.abi,
        address: ECLIPTIC.address,
        functionName: "safeTransferFrom",
        args: [wallet.address, safeAddress, Number(urbitID.id)],
      });
      const transferReceipt = await waitForTransactionReceipt(wallet.wagmi, {
        hash: transferTransaction,
      });

      return transferReceipt.transactionHash;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData)
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey })
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
      const safeTransactions: SafeResponse[] = safeProposals.results.map((proposal) => ({
        ...proposal,
        // TODO: Our custom ERC-6551 implementation calls are too exotic to be
        // decoded by Safe's in-house solution
        // dataDecoded: await safeClient.decodeData(safeProposal.data),
        transaction: decodePDOProposal(wallet.chain, ((proposal.data ?? "0x0") as Address)),
      }));

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

      const tbAddress = await fetchTBAddress(tbClient, urbitID, wallet.chain);
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
          const safeUrbitID = formUrbitID(safePoints[0]);
          const safeAddress = await fetchTBAddress(tbClient, safeUrbitID, wallet.chain);
          const safePointIsDeployed: boolean = await tbClient.checkAccountDeployment({
            accountAddress: safeAddress,
          });
          if (safePointIsDeployed) {
            urbitPDOs.push(safeUrbitID);
          }
        }
      }

      return urbitPDOs;
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
      const tbAddress = await fetchTBAddress(tbClient, recipient, wallet.chain);
      const sendToken = formToken(wallet.chain, symbol);
      const txHash = await ((symbol === "ETH") ? tbClient.transferETH({
        account: tbAccount.address,
        amount: Number(amount),
        recipientAddress: tbAddress,
      }) : tbClient.transferERC20({
        account: tbAccount.address,
        amount: Number(amount),
        recipientAddress: tbAddress,
        erc20tokenAddress: sendToken.address,
        erc20tokenDecimals: sendToken.decimals,
      }));
      const txReceipt = await waitForTransactionReceipt(wallet.wagmi, {hash: txHash});
      return txReceipt.transactionHash;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData)
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey })
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
      queryClient.setQueryData(queryKey, oldData)
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey })
    },
    ...options,
  });
}

export function useTokenboundAccount(urbitID: UrbitID): Loadable<TokenboundAccount> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      const tbAddress = await fetchTBAddress(tbClient, urbitID, wallet.chain);
      const tbIsDeployed: boolean = await tbClient.checkAccountDeployment({
        accountAddress: tbAddress,
      });
      const tbHoldings: TokenHoldings = {};
      for (const symbol of ["ETH", "USDC"]) {
        const holdToken = formToken(wallet.chain, symbol);
        const holding = await getBalance(wallet.wagmi, {
          address: tbAddress,
          token: (symbol === "ETH")
            ? undefined
            : holdToken.address,
        });
        tbHoldings[symbol] = {
          balance: holding.value,
          token: holdToken,
        };
      }
      const deployer: Contract = formContract(wallet.chain, "DEPLOYER_V1");
      const tbHasToken = ((await readContract(wallet.wagmi, {
        abi: deployer.abi,
        address: deployer.address,
        functionName: "isValidSyndicate",
        args: [tbAddress, urbitID.id],
      })) as boolean);
      let tbToken: Token | undefined = undefined;
      if (tbHasToken) {
        // TODO: Implement logic to show token information once the address
        // can be queried
        tbToken = {
          address: "0x0",
          abi: [],
          name: "",
          symbol: "",
          decimals: 18,
        };
      }
      return {
        address: tbAddress,
        deployed: tbIsDeployed,
        holdings: tbHoldings,
        token: tbToken,
      };
    },
    enabled: !!wallet && !!tbClient && !!urbitID.id,
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
      const ECLIPTIC: Token = formToken(wallet.chain, "ECL");
      const { tokenContract, tokenId } = await tbClient.getNFT({
        accountAddress: address,
      });
      if (ECLIPTIC.address !== tokenContract)
        throw Error(`Address ${address} is not a ERC-6551 contract`)
      return formUrbitID(tokenId);
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

export function useTokenboundClient(): Loadable<TokenboundClient> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "client", wallet?.chainID,
  ], [wallet?.chainID]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const walletClient = await getWalletClient(wallet.wagmi);
      return new TokenboundClient({
        walletClient: walletClient,
        chainId: Number(wallet.chain),
        implementationAddress: formContract(wallet.chain, "TOKENBOUND").address,
      });
    },
    enabled: !!wallet,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as TokenboundClient);
}

export function useWalletMeta(): Nullable<WalletMeta> {
  const [{wallet}, _, __] = useConnectWallet();
  const wagmiConfig = useWagmiConfig();

  return useMemo(() => (!wagmiConfig?.state?.current ? null : (() => {
    const chain: bigint = hexToBigInt(((wallet?.chains?.[0]?.id ?? "0x0") as Address));
    const address: Address = wallet?.accounts?.[0]?.address ?? ACCOUNT.NULL.ETHEREUM;
    return {
      wagmi: (wagmiConfig as WagmiConfig),
      chain: chain,
      address: address,
      stateID: `${chain}:${address}`,
      chainID: `${chain}`,
    };
  })()), [wallet?.chains?.[0]?.id, wallet?.accounts?.[0]?.address]);
}
