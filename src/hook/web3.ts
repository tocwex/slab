import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import type { SafeMultisigTransactionResponse } from '@safe-global/types-kit';
import type { Config as WagmiConfig } from '@wagmi/core';
import type { EIP1193Provider } from 'viem';
import type {
  Loadable, Nullable, Address, UrbitID, WalletMeta,
  Contract, Token, TokenHolding, TokenHoldings,
  TokenboundAccount, SafeAccount,
} from '@/type/slab';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import {
  getWalletClient, getAccount, getBalance,
  signMessage, readContract, waitForTransactionReceipt,
} from '@web3-onboard/wagmi';
import { TokenboundClient } from '@tokenbound/sdk';
import Safe from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { OperationType } from '@safe-global/types-kit';
import {
  formatUnits, hexToNumber, hexToBigInt, pad,
  parseEther, parseUnits, encodePacked, encodeFunctionData,
} from 'viem';
import { formContract, formToken, formUrbitID } from '@/lib/util';
import { APP, ACCOUNT, CONTRACT } from '@/dat/const';

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
    APP.TAG, "safe", "proposals", wallet?.chainID?.toString(), urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);
  // const queryKey: QueryKey = useMemo(() => [
  //   APP.TAG, "tokenbound", "account", wallet?.stateID, urbitID.id,
  // ], [wallet?.stateID, urbitPDO.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({token: symbol, recipient, amount}: {
      token: string,
      recipient: string,
      amount: string,
    }) => {
      if (!wallet) throw Error("Invalid wallet");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      if (!idAccount) throw Error("TokenboundAccount for ID unavailable");
      if (!pdoAccount) throw Error("TokenboundAccount for PDO unavailable");
      if (!pdoSafe) throw Error("SAFEAccount for PDO unavailable");
      const token = formToken(wallet.chainID, symbol);
      const tbTransferTransaction = await ((symbol === "ETH") ? tbClient.prepareExecution({
        account: pdoAccount.address,
        to: ACCOUNT.NULL.ETHEREUM,
        value: parseEther(amount),
        data: "0x",
      }) : tbClient.prepareExecution({
        account: pdoAccount.address,
        to: token.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: token.abi,
          functionName: "transfer",
          args: [recipient, parseUnits(amount, token.decimals)],
        }),
      }));
      const tbApproveTransaction = await tbClient.prepareExecution({
        account: idAccount.address,
        ...tbTransferTransaction,
      });

      // NOTE: Formula for extracting "provider" from Wagmi taken from:
      // https://github.com/wevm/wagmi/discussions/639#discussioncomment-9588515
      const { connector } = await getAccount(wallet.wagmi);
      const provider = await connector?.getProvider();
      if (!provider) throw Error("EIP1193Provider unavailable");
      const safeAccount: Safe = await Safe.init({
        // @ts-ignore
        provider: (provider as EIP1193Provider),
        signer: wallet.address,
        safeAddress: pdoSafe.address,
      });
      const safeTransaction = await safeAccount.createTransaction({
        transactions: [{
          operation: OperationType.Call,
          to: tbApproveTransaction.to,
          data: tbApproveTransaction.data,
          value: tbApproveTransaction.value.toString(),
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

      const safeClient = new SafeApiKit({chainId: wallet.chainID});
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

export function useSafeProposals(urbitPDO: UrbitID): Loadable<SafeMultisigTransactionResponse[]> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "proposals", wallet?.chainID?.toString(), urbitPDO.id,
  ], [wallet?.chainID, urbitPDO.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error("Invalid wallet");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      const ecliptic: Token = formToken(wallet.chainID, "ECL");
      const safeAddress = ((await readContract(wallet.wagmi, {
        abi: ecliptic.abi,
        address: ecliptic.address,
        functionName: "ownerOf",
        args: [urbitPDO.id],
      })) as Address);

      const safeClient = new SafeApiKit({chainId: wallet.chainID});
      const safeProposals = await safeClient.getPendingTransactions(safeAddress);
      return safeProposals.results;
    },
    enabled: !!wallet && !!tbClient,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as SafeMultisigTransactionResponse[]);
}

export function useSafePDOs(urbitID: UrbitID): Loadable<UrbitID[]> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "pdos", wallet?.stateID, urbitID.id,
  ], [wallet?.stateID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error("Invalid wallet");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      const azimuth: Contract = formContract(wallet.chainID, "AZP");
      const ecliptic: Token = formToken(wallet.chainID, "ECL");
      const safeClient = new SafeApiKit({chainId: wallet.chainID});

      const tbAddress: Address = await tbClient.getAccount({
        tokenContract: ecliptic.address,
        tokenId: urbitID.id,
      });
      // TODO: Consider EOA-owned safes as well, or just TBA safes?
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
          const safePoint: number = safePoints[0];
          const safePointAddress: Address = await tbClient.getAccount({
            tokenContract: ecliptic.address,
            tokenId: String(safePoint),
          });
          const safePointIsDeployed: boolean = await tbClient.checkAccountDeployment({
            accountAddress: safePointAddress,
          });
          if (safePointIsDeployed) {
            urbitPDOs.push(formUrbitID(safePoint));
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
  urbitPDO?: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const tbAccount = useTokenboundAccount(urbitID);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.stateID, urbitID.id,
  ], [wallet?.stateID, urbitID.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({token: symbol, recipient, amount}: {
      token: string,
      recipient: string,
      amount: string,
    }) => {
      if (!wallet) throw Error("Invalid wallet");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      if (!tbAccount) throw Error("TokenboundAccount unavailable");
      const ecliptic: Token = formToken(wallet.chainID, "ECL");
      const address: Address = await tbClient.getAccount({
        tokenContract: ecliptic.address,
        tokenId: formUrbitID(recipient).id,
      });
      const sendToken = formToken(wallet.chainID, symbol);
      const txHash = await ((symbol === "ETH") ? tbClient.transferETH({
        account: tbAccount.address,
        amount: Number(amount),
        recipientAddress: address,
      }) : tbClient.transferERC20({
        account: tbAccount.address,
        amount: Number(amount),
        recipientAddress: address,
        erc20tokenAddress: sendToken.address,
        erc20tokenDecimals: sendToken.decimals,
      }));
      // FIXME: This doesn't really seem to work, but it hasn't been tested
      // very thoroughly
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
    APP.TAG, "tokenbound", "account", wallet?.stateID, urbitID.id,
  ], [wallet?.stateID, urbitID.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!wallet) throw Error("Invalid wallet");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      const ecliptic: Token = formToken(wallet.chainID, "ECL");
      const { txHash } = await tbClient.createAccount({
        tokenContract: ecliptic.address,
        tokenId: urbitID.id,
      });
      // FIXME: This doesn't really seem to work, but it hasn't been tested
      // very thoroughly
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
    APP.TAG, "tokenbound", "account", wallet?.stateID, urbitID.id,
  ], [wallet?.stateID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error("Invalid wallet");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      const ecliptic: Token = formToken(wallet.chainID, "ECL");
      const tbAddress: Address = await tbClient.getAccount({
        tokenContract: ecliptic.address,
        tokenId: urbitID.id,
      });
      const tbIsDeployed: boolean = await tbClient.checkAccountDeployment({
        accountAddress: tbAddress,
      });
      const tbHoldings: TokenHoldings = {};
      for (const symbol of ["ETH", "USDC"]) {
        const holdToken = formToken(wallet.chainID, symbol);
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
      return {
        address: tbAddress,
        deployed: tbIsDeployed,
        holdings: tbHoldings,
      };
    },
    enabled: !!wallet && !!tbClient,
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
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "account", wallet?.stateID, urbitID.id,
  ], [wallet?.stateID, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error("Invalid wallet");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      const ecliptic: Token = formToken(wallet.chainID, "ECL");
      const safeAddress = ((await readContract(wallet.wagmi, {
        abi: ecliptic.abi,
        address: ecliptic.address,
        functionName: "ownerOf",
        args: [urbitID.id],
      })) as Address);

      const safeClient = new SafeApiKit({chainId: wallet.chainID});
      const safeInfo = await safeClient.getSafeInfo(safeAddress);
      const safeOwnurs: UrbitID[] = [];
      for (const owner of safeInfo.owners) {
        // TODO: Assert that 'tokenContract' is the Ecliptic contract address
        try {
          const { tokenContract, tokenId } = await tbClient.getNFT({
            accountAddress: (owner as Address),
          });
          const ownur: UrbitID = formUrbitID(tokenId);
          safeOwnurs.push(ownur);
        } catch (error) {
          safeOwnurs.push(formUrbitID(0));
        }
      }

      return {
        ownurs: safeOwnurs,
        ...safeInfo,
      };
    },
    enabled: !!wallet && !!tbClient,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as SafeAccount);
}

export function useTokenboundClient(): Loadable<TokenboundClient> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "client", wallet?.stateID,
  ], [wallet?.stateID]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error("Invalid wallet");
      const walletClient = await getWalletClient(wallet.wagmi);
      return new TokenboundClient({
        walletClient: walletClient,
        chainId: Number(wallet.chainID),
        implementationAddress: formContract(wallet.chainID, "TKB").address,
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
    const chainID: bigint = hexToBigInt(((wallet?.chains?.[0]?.id ?? "0x0") as Address));
    const address: Address = wallet?.accounts?.[0]?.address ?? ACCOUNT.NULL.ETHEREUM;
    return {
      stateID: `${chainID}:${address}`, // FIXME: `wagmiConfig.state.current`
      wagmi: (wagmiConfig as WagmiConfig),
      chainID: chainID,
      address: address,
    };
  })()), [wagmiConfig?.state?.current]);
}
