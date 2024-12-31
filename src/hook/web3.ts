import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import type { Config as WagmiConfig } from '@wagmi/core';
import type { EIP1193Provider } from 'viem';
import type {
  Address, Loadable, UrbitID,
  Token, TokenHolding, TokenHoldings,
  TokenboundAccount, SafeAccount,
} from '@/type/slab';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import {
  getWalletClient, getAccount, getBalance,
  readContract, waitForTransactionReceipt,
} from '@web3-onboard/wagmi';
import { TokenboundClient } from '@tokenbound/sdk';
import Safe from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit'
import { formatUnits, hexToNumber } from 'viem';
import { formToken, formUrbitID } from '@/lib/util';
import { APP, ACCOUNT, CONTRACT } from '@/dat/const';

export function useTokenboundSendMutation(
  urbitID: UrbitID,
  options?: UseMutationOptions<Address, unknown, any, unknown>,
) {
  const [{wallet}, _, __] = useConnectWallet();
  const wagmiConfig = useWagmiConfig();
  const tbClient = useTokenboundClient();
  const tbAccount = useTokenboundAccount(urbitID);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chains?.[0]?.id, urbitID.id,
  ], [wallet, urbitID.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({token: symbol, recipient, amount}: {
      token: string,
      recipient: string,
      amount: number,
    }) => {
      if (!wagmiConfig) throw Error("WagmiClient unavailable");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      if (!tbAccount) throw Error("TokenboundAccount unavailable");
      const address: Address = await tbClient.getAccount({
        // tokenContract: CONTRACT.ECLIPTIC.ADDRESS.ETHEREUM,
        tokenContract: CONTRACT.ECLIPTIC.ADDRESS.SEPOLIA,
        tokenId: formUrbitID(recipient).id,
      });
      const token = formToken(wallet, symbol);
      const txHash = await ((symbol === "ETH") ? tbClient.transferETH({
        account: tbAccount.address,
        amount: amount,
        recipientAddress: address,
      }) : tbClient.transferERC20({
        account: tbAccount.address,
        amount: amount,
        recipientAddress: address,
        erc20tokenAddress: token.address,
        erc20tokenDecimals: token.decimals,
      }));
      // FIXME: This doesn't really seem to work, but it hasn't been tested
      // very thoroughly
      const txReceipt = await waitForTransactionReceipt(wagmiConfig, {hash: txHash});
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
  const [{wallet}, _, __] = useConnectWallet();
  const wagmiConfig = useWagmiConfig();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chains?.[0]?.id, urbitID.id,
  ], [wallet, urbitID.id]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!wagmiConfig) throw Error("WagmiConfig unavailable");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      const { txHash } = await tbClient.createAccount({
        // tokenContract: CONTRACT.ECLIPTIC.ADDRESS.ETHEREUM,
        tokenContract: CONTRACT.ECLIPTIC.ADDRESS.SEPOLIA,
        tokenId: urbitID.id,
      });
      // FIXME: This doesn't really seem to work, but it hasn't been tested
      // very thoroughly
      const txReceipt = await waitForTransactionReceipt(wagmiConfig, {hash: txHash});
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
  const [{wallet}, _, __] = useConnectWallet();
  const tbClient = useTokenboundClient();
  const wagmiConfig = useWagmiConfig();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chains?.[0]?.id, urbitID.id,
  ], [wallet, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wagmiConfig) throw Error("WagmiConfig unavailable");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      const tbAddress: Address = await tbClient.getAccount({
        // tokenContract: CONTRACT.ECLIPTIC.ADDRESS.ETHEREUM,
        tokenContract: CONTRACT.ECLIPTIC.ADDRESS.SEPOLIA,
        tokenId: urbitID.id,
      });
      const tbIsDeployed: boolean = await tbClient.checkAccountDeployment({
        accountAddress: tbAddress,
      });
      const tbHoldings: TokenHoldings = {};
      for (const symbol of ["ETH", "USDC"]) {
        const token = formToken(wallet, symbol);
        const holding = await getBalance((wagmiConfig as WagmiConfig), {
          address: tbAddress,
          token: (symbol === "ETH")
            ? undefined
            : token.address,
        });
        tbHoldings[symbol] = {
          balance: holding.value,
          token: token,
        };
      }
      return {
        address: tbAddress,
        deployed: tbIsDeployed,
        holdings: tbHoldings,
      };
    },
    enabled: !!tbClient,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as TokenboundAccount);
}

export function useSafeAccount(urbitID: UrbitID): Loadable<SafeAccount> {
  const [{wallet}, _, __] = useConnectWallet();
  const tbClient = useTokenboundClient();
  const wagmiConfig = useWagmiConfig();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "safe", "account", wallet?.chains?.[0]?.id, wagmiConfig?.state?.current, urbitID.id,
  ], [wallet, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wagmiConfig) throw Error("WagmiConfig unavailable");
      if (!tbClient) throw Error("TokenboundClient unavailable");
      // NOTE: Formula for extracting "provider" from Wagmi taken from:
      // https://github.com/wevm/wagmi/discussions/639#discussioncomment-9588515
      const { connector } = await getAccount(wagmiConfig);
      const provider = await connector?.getProvider();
      if (!provider) throw Error("EIP1193Provider unavailable");
      const chainId: number = hexToNumber((queryKey[3] as Address));

      const token = formToken(wallet, "ECLIPTIC");
      const safeAddress = ((await readContract(wagmiConfig, {
        abi: CONTRACT.ECLIPTIC.ABI,
        address: token.address,
        functionName: "ownerOf",
        args: [urbitID.id],
      })) as Address);

      const safeClient = new SafeApiKit({chainId: BigInt(chainId)});
      const safeInfo = await safeClient.getSafeInfo(safeAddress);
      const safeOwnurs: UrbitID[] = [];
      for (const owner of safeInfo.owners) {
        // TODO: Assert that 'tokenContract' is the Ecliptic contract address
        const { tokenContract, tokenId } = await tbClient.getNFT({
          accountAddress: (owner as Address),
        });
        const ownur: UrbitID = formUrbitID(tokenId);
        safeOwnurs.push(ownur);
      }

      return {
        ownurs: safeOwnurs,
        ...safeInfo,
      };

      // NOTE: I suspect that the following alternative method goes through the
      // RPC endpoint instead of the safe.global API, which may be desirable at
      // some point in the future.
      //
      // const safeClient: Safe = await Safe.init({
      //   // @ts-ignore
      //   provider: (provider as EIP1193Provider),
      //   signer: wallet?.accounts?.[0]?.address,
      //   safeAddress: safeAddress,
      // });
      // const safeOwners: Address[] = ((await safeClient.getOwners()) as Address[]);
      // const safeThreshold: number = await safeClient.getThreshold();
      // return {
      //   address: safeAddress,
      //   owners: safeOwners,
      //   threshold: safeThreshold,
      // };
    },
    enabled: !!tbClient && !!(queryKey[3]) && !!(queryKey[4]),
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as SafeAccount);
}

export function useTokenboundClient(): Loadable<TokenboundClient> {
  const [{wallet}, _, __] = useConnectWallet();
  const wagmiConfig = useWagmiConfig();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "client", wallet?.chains?.[0]?.id, wagmiConfig?.state?.current,
  ], [wallet?.chains?.[0]?.id, wagmiConfig?.state?.current]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const chainId: number = hexToNumber((queryKey[3] as Address));
      const walletClient = await getWalletClient((wagmiConfig as WagmiConfig));
      return new TokenboundClient({walletClient, chainId});
    },
    enabled: !!(queryKey[3]) && !!(queryKey[4]),
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as TokenboundClient);
}

// export function useChain(): Loadable<bigint> {
// }
