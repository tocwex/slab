import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import type {
  Loadable, Nullable, Address, ChainAddress, Tax, UrbitID,
  Contract, Token, TokenHolding, TokenHoldings, SlabTransaction,
  TokenboundAccount, SafeAccount, UrbitAccount, UrbitNetworkLayer,
  SafeResponse, SafeOwners, SafeArchive,
} from '@/type/slab';
import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import {
  getWalletClient, getBalance, readContract, writeContract,
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
  createSafe, signTBSafeTx, fetchSafeAccount, fetchUrbitAccount,
  fetchRecipient, fetchTBAddress, fetchToken, fetchUrbitID,
  fetchAzimuthEcliptic, decodeProposal, awaitReceipt,
} from '@/lib/web3';
import { useBasicMutation } from '@/lib/hook';
import {
  clamp, formContract, formToken, formUrbitID,
  includeTax, isValidSyndicate, isValidUrbitID, compareUrbitIDs,
  encodeList, decodeList, encodeSet, decodeSet,
} from '@/lib/util';
import { update as updateLocal } from '@/dat/local';
import { APP, ABI, ACCOUNT, CONTRACT, MATH, REGEX, ERROR } from '@/dat/const';

export function useSyndicateExecMutation(
  urbitSyndicate: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const sySafe = useSafeAccount(urbitSyndicate);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitSyndicate.id,
  ], [wallet?.chainID, urbitSyndicate.id]);
  const syKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID, urbitSyndicate.id,
  ], [wallet?.chainID, urbitSyndicate.id]);
  const taxKey: QueryKey = useMemo(() => [
    APP.TAG, "tax", "syndicate", wallet?.chainID, urbitSyndicate.id,
  ], [wallet?.chainID, urbitSyndicate.id]);

  const queryClient = useQueryClient();
  return useBasicMutation([queryKey, syKey, taxKey], {
    mutationFn: async ({txHash}: {txHash: Address}) => {
      if (!wallet || !sySafe) throw Error(ERROR.INVALID_QUERY);
      const safeAccount: Safe = await fetchSafeAccount(wallet, (sySafe.address as Address));
      const safeClient = new SafeApiKit({chainId: wallet.chain});

      const safeTransaction = await safeClient.getTransaction(txHash);
      const executeTxResponse = await safeAccount.executeTransaction(safeTransaction);
      const { transactionHash } = await awaitReceipt(wallet, (executeTxResponse.hash as Address));

      return transactionHash;
    },
    onSettled: async (_, __, {txHash}, ___) => {
      if (!!wallet && !!tbClient) {
        const safeClient = new SafeApiKit({chainId: wallet.chain});
        const safeRawTx = await safeClient.getTransaction(txHash);
        const safeRawData = ((safeRawTx?.data || "0x0") as Address);
        const slabTx = await decodeProposal(wallet, safeRawData);

        // NOTE: Always refetch this syndicate's safe information first so
        // dependent data (e.g. taxes, depending on token address) works
        await queryClient.invalidateQueries({ queryKey: syKey });
        if (slabTx.type === "transfer") {
          const urbitID = await fetchUrbitID(wallet, tbClient, slabTx.to);
          await queryClient.invalidateQueries({queryKey: [
            APP.TAG, "tokenbound", "account", wallet.chainID, urbitID.id,
          ]});
        } else if (slabTx.type === "launch") {
          await queryClient.invalidateQueries({ queryKey: taxKey });
        } else if (slabTx.type === "mint") {
          for (const transfer of slabTx.transfers) {
            const urbitID = await fetchUrbitID(wallet, tbClient, transfer.to);
            await queryClient.invalidateQueries({queryKey: [
              APP.TAG, "tokenbound", "account", wallet.chainID, urbitID.id,
            ]});
          }
        }
        await queryClient.invalidateQueries({ queryKey: queryKey });
      }
    },
    ...options,
  });
}

export function useSyndicateSignMutation(
  urbitID: UrbitID,
  urbitSyndicate: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const idAccount = useTokenboundAccount(urbitID);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitSyndicate.id,
  ], [wallet?.chainID, urbitSyndicate.id]);

  return useBasicMutation([queryKey], {
    mutationFn: async ({txHash}: {txHash: Address}) => {
      if (!wallet || !idAccount) throw Error(ERROR.INVALID_QUERY);
      const txSign = await signTBSafeTx(wallet, idAccount.address, txHash);
      const safeClient = new SafeApiKit({chainId: wallet.chain});
      await safeClient.confirmTransaction(txHash, txSign);
      return (txSign as Address);
    },
    ...options,
  });
}

export function useSyndicateMintMutation(
  urbitID: UrbitID,
  urbitSyndicate: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const idAccount = useTokenboundAccount(urbitID);
  const syAccount = useTokenboundAccount(urbitSyndicate);
  const twTax = useSyndicateTax(urbitSyndicate);
  const sySafe = useSafeAccount(urbitSyndicate);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitSyndicate.id,
  ], [wallet?.chainID, urbitSyndicate.id]);

  return useBasicMutation([queryKey], {
    mutationFn: async ({amounts, recipients}: {
      amounts: string[],
      recipients: string[],
    }) => {
      if (!wallet || !tbClient || !idAccount || !syAccount || !sySafe || !twTax)
        throw Error(ERROR.INVALID_QUERY);
      if (!syAccount.token)
        throw Error("Cannot mint tokens for Syndicate without dedicated token");
      if (amounts.length !== recipients.length)
        throw Error("Mismatch in the number of minting amounts and recipients");
      const recipientAmounts: bigint[] = amounts.map((amount) => {
        const bigAmount = parseUnits(amount, (syAccount?.token?.decimals ?? 18));
        const bigAmountWTax = includeTax(bigAmount, twTax);
        return bigAmountWTax;
      });
      const recipientAddresses: Address[] = await Promise.all(recipients.map((recipient) => (
        fetchRecipient(wallet, tbClient, recipient)
      )));

      const tbMintTransaction = await tbClient.prepareExecution({
        account: syAccount.address,
        to: syAccount.token.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: ABI.TOCWEX_TOKEN_V1,
          ...((recipientAmounts.length === 1) ? ({
            functionName: "mint",
            args: [recipientAddresses[0], recipientAmounts[0]],
          }) : ({
            functionName: "batchMint",
            args: [recipientAddresses, recipientAmounts],
          })),
        }),
      });

      const safeAccount: Safe = await fetchSafeAccount(wallet, (sySafe.address as Address));
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
        safeAddress: sySafe.address,
        safeTransactionData: safeTransaction.data,
        safeTxHash: safeTxHash,
        senderAddress: idAccount.address,
        senderSignature: safeTxSign,
      });

      return (safeTxSign as Address);
    },
    ...options,
  });
}

export function useSyndicateLaunchMutation(
  urbitID: UrbitID,
  urbitSyndicate: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const idAccount = useTokenboundAccount(urbitID);
  const syAccount = useTokenboundAccount(urbitSyndicate);
  const sySafe = useSafeAccount(urbitSyndicate);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitSyndicate.id,
  ], [wallet?.chainID, urbitSyndicate.id]);

  return useBasicMutation([queryKey], {
    mutationFn: async ({name, symbol, init_supply, max_supply}: {
      name: string,
      symbol: string,
      init_supply: string,
      max_supply: string,
    }) => {
      if (!wallet || !tbClient || !idAccount || !syAccount || !sySafe)
        throw Error(ERROR.INVALID_QUERY);
      const initSupply = clamp(parseUnits(init_supply, 18), BigInt(0), MATH.MAX_UINT256);
      const maxSupply = clamp(parseUnits(max_supply, 18), BigInt(0), MATH.MAX_UINT256);
      const salt = pad("0x0"); // TODO: Customize or randomize salt?
      if (maxSupply < initSupply)
        throw Error("Maximum token supply must be at least as large as initial supply.");

      const DEPLOY_V1: Contract = formContract(wallet.chain, "DEPLOYER_V1");
      const TOKENBOUND: Contract = formContract(wallet.chain, "TOKENBOUND");
      const tbLaunchTransaction = await tbClient.prepareExecution({
        account: syAccount.address,
        to: DEPLOY_V1.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DEPLOY_V1.abi,
          functionName: "deploySyndicate",
          args: [TOKENBOUND.address, salt, initSupply, maxSupply, urbitSyndicate.id, name, symbol],
        }),
      });

      const safeAccount: Safe = await fetchSafeAccount(wallet, (sySafe.address as Address));
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
        safeAddress: sySafe.address,
        safeTransactionData: safeTransaction.data,
        safeTxHash: safeTxHash,
        senderAddress: idAccount.address,
        senderSignature: safeTxSign,
      });

      return (safeTxSign as Address);
    },
    ...options,
  });
}

export function useSyndicateSendMutation(
  urbitID: UrbitID,
  urbitSyndicate: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const idAccount = useTokenboundAccount(urbitID);
  const syAccount = useTokenboundAccount(urbitSyndicate);
  const sySafe = useSafeAccount(urbitSyndicate);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitSyndicate.id,
  ], [wallet?.chainID, urbitSyndicate.id]);

  return useBasicMutation([queryKey], {
    mutationFn: async ({token: symbol, recipient, amount}: {
      token: string,
      recipient: string,
      amount: string,
    }) => {
      if (!wallet || !tbClient || !idAccount || !syAccount || !sySafe)
        throw Error(ERROR.INVALID_QUERY);
      const TOKEN: Token = await fetchToken(wallet, symbol);
      const toAddress = await fetchRecipient(wallet, tbClient, recipient);
      const tbTransferTransaction = await ((symbol === "ETH") ? tbClient.prepareExecution({
        account: syAccount.address,
        to: toAddress,
        value: parseEther(amount),
        data: "0x",
      }) : tbClient.prepareExecution({
        account: syAccount.address,
        to: TOKEN.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: TOKEN.abi,
          functionName: "transfer",
          args: [toAddress, parseUnits(amount, TOKEN.decimals)],
        }),
      }));

      const safeAccount: Safe = await fetchSafeAccount(wallet, (sySafe.address as Address));
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
        safeAddress: sySafe.address,
        safeTransactionData: safeTransaction.data,
        safeTxHash: safeTxHash,
        senderAddress: idAccount.address,
        senderSignature: safeTxSign,
      });

      return (safeTxSign as Address);
    },
    ...options,
  });
}

export function useSyndicateCreateMutation(
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
  return useBasicMutation([queryKey, localKey], {
    mutationFn: async ({safe, managers, reset}: {
      safe: Address,
      managers: UrbitID[],
      reset: boolean,
    }) => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      // TODO: Use Azimuth to get latest Ecliptic
      const ECLIPTIC: Token = formToken(wallet.chain, "ECL");

      const transferTransaction = await writeContract(wallet.wagmi, {
        abi: ECLIPTIC.abi,
        address: ECLIPTIC.address,
        functionName: "transferPoint",
        args: [Number(urbitID.id), safe, reset],
      });
      const { transactionHash } = await awaitReceipt(wallet, transferTransaction);

      // NOTE: Probably more appropriate in dependent 'onSuccess', but that
      // makes the UI update behavior a bit more wonky.
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

      return transactionHash;
    },
    onSettled: async (_, __, {managers}, ___) => {
      await queryClient.invalidateQueries({ queryKey: queryKey });
      for (const managerID of managers) {
        await queryClient.invalidateQueries({queryKey: [
          APP.TAG, "safe", "syndicates", wallet?.chainID, managerID.id,
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
  const localKey: QueryKey = useMemo(() => [
    APP.TAG, "local", "safes", wallet?.chainID,
  ], [wallet?.chainID]);

  const queryClient = useQueryClient();
  return useBasicMutation([localKey], {
    mutationFn: async ({managers, threshold}: {
      managers: UrbitID[],
      threshold: number,
    }) => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      const owners: Address[] = await Promise.all(managers.map((urbitID) => (
        fetchTBAddress(wallet, tbClient, urbitID)
      )));
      const safeAddress = await createSafe(wallet, tbClient, owners, threshold);

      // NOTE: Probably more appropriate in dependent 'onSuccess', but that
      // makes the UI update behavior a bit more wonky.
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

      return safeAddress;
    },
    ...options,
  });
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
  return useBasicMutation([queryKey], {
    mutationFn: async ({token: symbol, recipient, amount}: {
      token: string,
      recipient: string,
      amount: string,
    }) => {
      if (!wallet || !tbClient || !tbAccount) throw Error(ERROR.INVALID_QUERY);
      const TOKEN = await fetchToken(wallet, symbol);
      const toAddress = await fetchRecipient(wallet, tbClient, recipient);
      const txHash = await ((symbol === "ETH") ? tbClient.transferETH({
        account: tbAccount.address,
        amount: Number(amount),
        recipientAddress: toAddress,
      }) : tbClient.transferERC20({
        account: tbAccount.address,
        amount: Number(amount),
        recipientAddress: toAddress,
        erc20tokenAddress: TOKEN.address,
        erc20tokenDecimals: TOKEN.decimals,
      }));
      const { transactionHash } = await awaitReceipt(wallet, txHash);
      return transactionHash;
    },
    onSettled: async (_, __, {recipient}, ___) => {
      await queryClient.invalidateQueries({ queryKey: queryKey });
      await queryClient.invalidateQueries({queryKey: [
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

  return useBasicMutation([queryKey], {
    mutationFn: async () => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      const REGISTRY: Token = formToken(wallet.chain, "REGISTRY");
      const { txHash } = await tbClient.createAccount({
        tokenContract: REGISTRY.address,
        tokenId: urbitID.id,
      });
      const { transactionHash } = await awaitReceipt(wallet, txHash);
      return transactionHash;
    },
    ...options,
  });
}

export function useSafeProposals(urbitSyndicate: UrbitID): Loadable<SafeResponse[]> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitSyndicate.id,
  ], [wallet?.chainID, urbitSyndicate.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet && !!tbClient,
    queryFn: async (): Promise<SafeResponse[] | false> => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      if (!isValidUrbitID(urbitSyndicate)) return false;
      const REGISTRY: Token = formToken(wallet.chain, "REGISTRY");
      const safeAddress = ((await readContract(wallet.wagmi, {
        abi: REGISTRY.abi,
        address: REGISTRY.address,
        functionName: "ownerOf",
        args: [urbitSyndicate.id],
      })) as Address);

      const safeClient = new SafeApiKit({chainId: wallet.chain});
      const safeProposals = await safeClient.getPendingTransactions(safeAddress);

      const safeTransactions: SafeResponse[] = [];
      for (const proposal of safeProposals.results) {
        const proposalData: Address = ((proposal.data ?? "0x0") as Address);
        // TODO: Our custom ERC-6551 implementation calls are too exotic to be
        // decoded by Safe's in-house solution
        const safeTransaction: SlabTransaction = await decodeProposal(wallet, proposalData);
        safeTransactions.push({...proposal, transaction: safeTransaction});
      }

      return safeTransactions;
    },
  });

  return isLoading ? undefined
    : isError ? null
    : !data ? false
    : (data as SafeResponse[]);
}

export function useSafeSyndicates(urbitID: UrbitID): Loadable<UrbitID[]> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "syndicates", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet && !!tbClient,
    queryFn: async (): Promise<UrbitID[] | false> => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      const azimuth: Contract = formContract(wallet.chain, "AZP");
      const safeClient = new SafeApiKit({chainId: wallet.chain});

      const tbAddress = await fetchTBAddress(wallet, tbClient, urbitID);
      const { safes } = await safeClient.getSafesByOwner(tbAddress);

      // NOTE: A Gnosis-recognized escrow contract, i.e. SAFE, is a Syndicate iff:
      // - The SAFE holds exactly 1 Urbit ID
      // - The Urbit ID held by the SAFE has a deployed TBA
      const urbitSyndicates: UrbitID[] = [];
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
          if (safePointIsDeployed && isValidSyndicate(safeUrbitID)) {
            urbitSyndicates.push(safeUrbitID);
          }
        }
      }

      return urbitSyndicates.sort(compareUrbitIDs);
    },
  });

  return isLoading ? undefined
    : isError ? null
    : !data ? false
    : (data as UrbitID[]);
}

export function useTokenboundAccount(urbitID: UrbitID): Loadable<TokenboundAccount> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const localTokens = useLocalTokens();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account",
    wallet?.chainID, urbitID.id, encodeList(Object.keys(localTokens ?? {})),
  ], [wallet?.chainID, urbitID.id, localTokens]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet && !!tbClient && !!localTokens,
    queryFn: async (): Promise<TokenboundAccount | false> => {
      if (!wallet || !tbClient || !localTokens) throw Error(ERROR.INVALID_QUERY);
      if (!isValidUrbitID(urbitID)) return false;
      // console.log(`querying for ${queryKey}`);
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
  });

  return isLoading ? undefined
    : isError ? null
    : !data ? false
    : (data as TokenboundAccount);
}

export function useSafeAccount(urbitID: UrbitID): Loadable<SafeAccount> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "account", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet,
    queryFn: async (): Promise<SafeAccount | false> => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      if (!isValidUrbitID(urbitID)) return false;
      const REGISTRY: Token = formToken(wallet.chain, "REGISTRY");
      const safeAddress = ((await readContract(wallet.wagmi, {
        abi: REGISTRY.abi,
        address: REGISTRY.address,
        functionName: "ownerOf",
        args: [urbitID.id],
      })) as Address);

      const safeClient = new SafeApiKit({chainId: wallet.chain});
      const safeInfo = await safeClient.getSafeInfo(safeAddress);

      return safeInfo;
    },
  });

  return isLoading ? undefined
    : isError ? null
    : !data ? false
    : (data as SafeAccount);
}

export function useUrbitAccount(urbitID: UrbitID): Loadable<UrbitAccount> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "urbit", "account", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet,
    queryFn: async (): Promise<UrbitAccount | false> => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      if (!isValidUrbitID(urbitID)) return false;
      const urbitAccount = await fetchUrbitAccount(wallet, urbitID);
      return urbitAccount;
    },
  });

  return isLoading ? undefined
    : isError ? null
    : !data ? false
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
    enabled: !!wallet && !!idAccount,
    queryFn: async (): Promise<Tax | false> => {
      if (!wallet || !idAccount) throw Error(ERROR.INVALID_QUERY);
      if (!isValidUrbitID(urbitID)) return false;
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
  });

  return isLoading ? undefined
    : isError ? null
    : !data ? false
    : (data as Tax);
}

export function useDeployerTax(): Loadable<Tax> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tax", "deployer", wallet?.chainID,
  ], [wallet?.chainID]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet,
    queryFn: async (): Promise<Tax> => {
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
  });

  return isLoading ? undefined
    : isError ? null
    : (data as Tax);
}

export function useRecipientAddress(value: string): Loadable<Address> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  // FIXME: Should share state between values like {0, "~zod"}
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "recipient", wallet?.chainID, value,
  ], [wallet?.chainID, value]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet && !!tbClient,
    queryFn: async (): Promise<Address | false> => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      if (!value.match(REGEX.RECIPIENT)) return false;
      const NULL: Token = formToken(wallet.chain, "NULL");
      const recipientAddress = await fetchRecipient(wallet, tbClient, value);
      if (recipientAddress === NULL.address) return false;
      return recipientAddress;
    },
  });

  return isLoading ? undefined
    : isError ? null
    : !data ? false
    : (data as Address);
}

export function useTokenboundUrbitID(address: Address): Loadable<UrbitID> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "urbit", wallet?.chainID, address,
  ], [wallet?.chainID, address]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet && !!tbClient,
    queryFn: async (): Promise<UrbitID | false> => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      if (!address.match(REGEX.ETHEREUM.ADDRESS)) return false;
      const urbitID = await fetchUrbitID(wallet, tbClient, address);
      return urbitID;
    },
  });

  return isLoading ? undefined
    : isError ? null
    : !data ? false
    : (data as UrbitID);
}

// NOTE: Not in use yet because it's much faster to just cache the current
// Ecliptic address; may be used in the future to determine if cached value
// is out of date
export function useAzimuthEcliptic(): Loadable<Address> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "ecliptic", wallet?.chainID,
  ], [wallet?.chainID]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet,
    queryFn: async (): Promise<Address> => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const azimuthEcliptic = fetchAzimuthEcliptic(wallet);
      return azimuthEcliptic;
    },
  });

  return isLoading ? undefined
    : isError ? null
    : (data as Address);
}
