import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import type {
  Loadable, Nullable, Address, ChainAddress, Tax, CallData, TBACallData, UrbitID,
  Contract, Token, TokenHolding, TokenHoldings, SlabTransaction,
  SlabTransferOperation, SlabLaunchOperation, SlabMintOperation,
  SlabDissolveOperation, SlabTerminateOperation,
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
import {
  recoverAddress, recoverMessageAddress, verifyMessage,
  formatUnits, hexToNumber, hexToBigInt, numberToHex, pad,
  parseEther, parseUnits, encodePacked, encodeFunctionData,
} from 'viem';
import { useWalletMeta, useTokenboundClient } from '@/hook/wallet';
import { useLocalTokens, useTokensDiffMutation } from '@/hook/local';
import {
  createSafe, submitSafeTx, submitDirectTx, proposeSafeTx,
  signSafeTx, fetchSafeAccount, fetchUrbitAccount,
  fetchRecipient, fetchTBAddress, fetchToken, fetchUrbitID,
  buildTransferCall, buildLaunchCall, buildMintCall, buildDissolveCall,
  fetchAzimuthEcliptic, decodeProposal, awaitReceipt, compareAPIUrbitIDs,
} from '@/lib/web3';
import { useBasicMutation } from '@/lib/hook';
import {
  clamp, resolve, encodeList,
  formContract, formToken, formUrbitID,
  includeTax, isValidSyndicate, isValidUrbitID
} from '@/lib/util';
import { update as updateLocal } from '@/dat/local';
import { APP, ABI, ACCOUNT, CONTRACT, MATH, REGEX, ERROR } from '@/dat/const';

////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                            Syndicate Operations                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////

export function useSyndicateExecMutation(
  urbitSyndicate: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const syAccount = useTokenboundAccount(urbitSyndicate);
  const sySafe = useSafeAccount(urbitSyndicate);
  const { mutateAsync: diffTokenMutate } = useTokensDiffMutation();
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
  return useBasicMutation([queryKey, syKey], {
    mutationFn: async ({txHash}: {txHash: Address}) => {
      if (!wallet || !sySafe) throw Error(ERROR.INVALID_QUERY);
      const safeAccount: Safe = await fetchSafeAccount(wallet, (sySafe.address as Address));
      const safeClient = new SafeApiKit({chainId: wallet.chain});

      const safeTransaction = await safeClient.getTransaction(txHash);
      // console.log(safeTransaction);
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

        try {
          if (slabTx.type === "transfer") {
            const urbitID = await fetchUrbitID(wallet, tbClient, slabTx.to);
            await queryClient.invalidateQueries({ queryKey: [
              APP.TAG, "tokenbound", "account", wallet.chainID, urbitID.id,
            ], refetchType: "all" });
          } else if (slabTx.type === "mint") {
            for (const transfer of slabTx.transfers) {
              const urbitID = await fetchUrbitID(wallet, tbClient, transfer.to);
              await queryClient.invalidateQueries({ queryKey: [
                APP.TAG, "tokenbound", "account", wallet.chainID, urbitID.id,
              ], refetchType: "all" });
            }
          } else if (slabTx.type === "dissolve") {
            if (!!syAccount && !!syAccount.token) {
              await diffTokenMutate({ rem: [syAccount.token.address] });
            }
          } else if (slabTx.type === "launch") {
            await queryClient.invalidateQueries({ queryKey: taxKey, refetchType: "all" });
            { // add new token to local token list
              const REGISTRY: Token = formToken(wallet.chain, "REGISTRY");
              const tokenAddress: Address = ((await readContract(wallet.wagmi, {
                abi: REGISTRY.abi,
                address: REGISTRY.address,
                functionName: "getSyndicateTokenAddressUsingAzimuthPoint",
                args: [urbitSyndicate.id],
              })) as Address);
              await diffTokenMutate({ add: [tokenAddress] });
            }
          } else if (slabTx.type === "terminate") {
            await queryClient.invalidateQueries({ queryKey: [
              APP.TAG, "wallet", "urbit-ids", wallet.chainID, slabTx.to.toLowerCase(),
            ], refetchType: "all" });
            await queryClient.invalidateQueries({ queryKey: [
              APP.TAG, "wallet", "urbit-tbas", wallet.chainID, slabTx.to.toLowerCase(),
            ], refetchType: "all" });
            await queryClient.invalidateQueries({ queryKey: [
              APP.TAG, "safe", "account", wallet.chainID, urbitSyndicate.id,
            ], refetchType: "all" });
            if (!!sySafe) {
              const safeInfo = await safeClient.getSafeInfo((sySafe.address as Address));
              for (const owner of safeInfo.owners) {
                const urbitID = await fetchUrbitID(wallet, tbClient, (owner as Address));
                await queryClient.invalidateQueries({ queryKey: [
                  APP.TAG, "safe", "syndicates", wallet.chainID, urbitID.id,
                ], refetchType: "all" });
              }
            }
          }
        } catch (error) {
          // TODO: Consider changing this to invalidate all safe information
          // so that everything updates, even in the case of an error
          // no-op
          console.log(error);
        }
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
      const txSign = await signSafeTx(wallet, idAccount.address, txHash);
      const safeClient = new SafeApiKit({chainId: wallet.chain});
      await safeClient.confirmTransaction(txHash, txSign);
      return (txSign as Address);
    },
    ...options,
  });
}

export function useSyndicateTransferMutation(
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
    mutationFn: async (transferOp: SlabTransferOperation) => {
      if (!wallet || !tbClient || !idAccount || !syAccount || !sySafe)
        throw Error(ERROR.INVALID_QUERY);
      const transferCall: TBACallData = await buildTransferCall(wallet, tbClient, syAccount, transferOp);
      const txHash: Address = await submitSafeTx(
        wallet, tbClient, transferCall,
        (sySafe.address as Address),
        (idAccount.address as Address),
      );
      return txHash;
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
    mutationFn: async (launchOp: SlabLaunchOperation) => {
      if (!wallet || !tbClient || !idAccount || !syAccount || !sySafe)
        throw Error(ERROR.INVALID_QUERY);
      const launchCall: TBACallData = await buildLaunchCall(wallet, tbClient, syAccount, {
        ...launchOp,
        urbitID: urbitSyndicate.id,
      });
      const txHash: Address = await submitSafeTx(
        wallet, tbClient, launchCall,
        (sySafe.address as Address),
        (idAccount.address as Address),
      );
      return txHash;
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
  const syTax = useSyndicateTax(urbitSyndicate);
  const sySafe = useSafeAccount(urbitSyndicate);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID, urbitSyndicate.id,
  ], [wallet?.chainID, urbitSyndicate.id]);

  return useBasicMutation([queryKey], {
    mutationFn: async (mintOp: SlabMintOperation) => {
      if (!wallet || !tbClient || !idAccount || !syAccount || !sySafe || !syTax)
        throw Error(ERROR.INVALID_QUERY);
      const mintCall: TBACallData = await buildMintCall(wallet, tbClient, syAccount, {
        ...mintOp,
        tax: syTax,
      });
      const txHash: Address = await submitSafeTx(
        wallet, tbClient, mintCall,
        (sySafe.address as Address),
        (idAccount.address as Address),
      );
      return txHash;
    },
    ...options,
  });
}

export function useSyndicateDissolveMutation(
  urbitID: UrbitID,
  urbitSyndicate: UrbitID,
  options?: UseMutationOptions<Address, unknown, void, unknown>,
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
    mutationFn: async () => {
      if (!wallet || !tbClient || !idAccount || !syAccount || !sySafe)
        throw Error(ERROR.INVALID_QUERY);
      const dissolveCall: TBACallData = await buildDissolveCall(wallet, tbClient, syAccount, {});
      const txHash: Address = await submitSafeTx(
        wallet, tbClient, dissolveCall,
        (sySafe.address as Address),
        (idAccount.address as Address),
      );
      return txHash;
    },
    ...options,
  });
}

export function useSyndicateTerminateMutation(
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
    mutationFn: async ({recipient, breach}: SlabTerminateOperation) => {
      if (!wallet || !tbClient || !idAccount || !syAccount || !sySafe)
        throw Error(ERROR.INVALID_QUERY);
      if (!!syAccount.token)
        throw Error("Cannot terminate a Syndicate that has a token");

      const ECLIPTIC: Token = formToken(wallet.chain, "ECL");
      const toAddress = await fetchRecipient(wallet, tbClient, recipient);
      const terminateTransaction = {
        to: ECLIPTIC.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: ECLIPTIC.abi,
          functionName: "transferPoint",
          args: [Number(urbitSyndicate.id), toAddress, breach],
        }),
      };

      const terminateTxSign = await proposeSafeTx(
        wallet, terminateTransaction,
        (sySafe.address as Address),
        (idAccount.address as Address),
      );
      return terminateTxSign;
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
    mutationFn: async ({safe, managers, breach}: {
      safe: Address,
      managers: UrbitID[],
      breach: boolean,
    }) => {
      if (!wallet || !tbClient) throw Error(ERROR.INVALID_QUERY);
      // TODO: Use Azimuth to get latest Ecliptic
      const ECLIPTIC: Token = formToken(wallet.chain, "ECL");

      const transferTransaction = await writeContract(wallet.wagmi, {
        abi: ECLIPTIC.abi,
        address: ECLIPTIC.address,
        functionName: "transferPoint",
        args: [Number(urbitID.id), safe, breach],
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
        delete oldOwners[encodeList(owners)];
        newArchive[tbKey] = oldOwners;
        return newArchive;
      });

      return transactionHash;
    },
    onSettled: async (_, __, {managers}, ___) => {
      for (const managerID of managers) {
        await queryClient.invalidateQueries({ queryKey: [
          APP.TAG, "safe", "syndicates", wallet?.chainID, managerID.id,
        ], refetchType: "all" });
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
          [encodeList(owners)]: safeAddress,
        })};
        newArchive[tbKey] = newOwners;
        return newArchive;
      });

      return safeAddress;
    },
    ...options,
  });
}

////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                            Tokenbound Operations                           //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////

export function useTokenboundTransferMutation(
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
    mutationFn: async (transferOp: SlabTransferOperation) => {
      if (!wallet || !tbClient || !tbAccount) throw Error(ERROR.INVALID_QUERY);
      const transferCall: TBACallData = await buildTransferCall(wallet, tbClient, tbAccount, transferOp);
      const txHash: Address = await submitDirectTx(wallet, tbClient, transferCall);
      return txHash;
    },
    onSettled: async (_, __, {to}, ___) => {
      await queryClient.invalidateQueries({ queryKey: [
        APP.TAG, "tokenbound", "account", wallet?.chainID, formUrbitID(to).id,
      ], refetchType: "all" });
    },
    ...options,
  });
}

export function useTokenboundLaunchMutation(
  urbitID: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const tbAccount = useTokenboundAccount(urbitID);
  const { mutateAsync: diffTokenMutate } = useTokensDiffMutation();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  return useBasicMutation([queryKey], {
    mutationFn: async (launchOp: SlabLaunchOperation) => {
      if (!wallet || !tbClient || !tbAccount) throw Error(ERROR.INVALID_QUERY);
      const launchCall: TBACallData = await buildLaunchCall(wallet, tbClient, tbAccount, {
        ...launchOp,
        urbitID: urbitID.id,
      });
      const txHash: Address = await submitDirectTx(wallet, tbClient, launchCall);
      return txHash;
    },
    onSettled: async () => {
      if (!!wallet && !!tbClient) {
        const REGISTRY: Token = formToken(wallet.chain, "REGISTRY");
        const tokenAddress: Address = ((await readContract(wallet.wagmi, {
          abi: REGISTRY.abi,
          address: REGISTRY.address,
          functionName: "getSyndicateTokenAddressUsingAzimuthPoint",
          args: [urbitID.id],
        })) as Address);
        await diffTokenMutate({ add: [tokenAddress] });
      }
    },
    ...options,
  });
}

export function useTokenboundMintMutation(
  urbitID: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const tbAccount = useTokenboundAccount(urbitID);
  const syTax = useSyndicateTax(urbitID);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mintOp: SlabMintOperation) => {
      if (!wallet || !tbClient || !tbAccount || !syTax) throw Error(ERROR.INVALID_QUERY);
      const mintCall: TBACallData = await buildMintCall(wallet, tbClient, tbAccount, {
        ...mintOp,
        tax: syTax,
      });
      const txHash: Address = await submitDirectTx(wallet, tbClient, mintCall);
      return txHash;
    },
    onSettled: async (_, __, {transfers}, ___) => {
      if (!!wallet && !!tbClient) {
        for (const transfer of transfers) {
          const { to: recipient } = transfer;
          if (isValidUrbitID(recipient)) {
            const recipientID = formUrbitID(recipient);
            await queryClient.invalidateQueries({ queryKey: [
              APP.TAG, "tokenbound", "account", wallet.chainID, recipientID.id,
            ], refetchType: "all" });
          }
        }
      }
    },
    ...options,
  });
}

export function useTokenboundDissolveMutation(
  urbitID: UrbitID,
  options?: UseMutationOptions<Address, unknown, void, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const tbAccount = useTokenboundAccount(urbitID);
  const { mutateAsync: diffTokenMutate } = useTokensDiffMutation();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID, urbitID.id,
  ], [wallet?.chainID, urbitID.id]);

  return useBasicMutation([queryKey], {
    mutationFn: async () => {
      if (!wallet || !tbClient || !tbAccount) throw Error(ERROR.INVALID_QUERY);
      const dissolveCall: TBACallData = await buildDissolveCall(wallet, tbClient, tbAccount, {});
      const txHash: Address = await submitDirectTx(wallet, tbClient, dissolveCall);
      return txHash;
    },
    onSettled: async () => {
      if (!!wallet && !!tbClient && !!tbAccount && !!tbAccount.token) {
        await diffTokenMutate({ rem: [tbAccount.token.address] });
      }
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

      return urbitSyndicates.sort(compareAPIUrbitIDs);
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
      // console.log(`querying ${queryKey}`);
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
    APP.TAG, "tax", "syndicate",
    wallet?.chainID, urbitID.id, (idAccount || {})?.token?.address,
  ], [wallet?.chainID, urbitID.id, (idAccount || {})?.token?.address]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet && !!idAccount,
    queryFn: async (): Promise<Tax | false> => {
      if (!wallet || !idAccount) throw Error(ERROR.INVALID_QUERY);
      if (!isValidUrbitID(urbitID)) return false;
      // console.log(`querying ${queryKey}`);
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
