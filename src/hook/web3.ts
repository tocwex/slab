import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import type { Config as WagmiConfig } from '@wagmi/core';
import type {
  Address, Loadable, UrbitID,
  Token, TokenHolding, TokenHoldings, TokenboundAccount,
} from '@/type/slab';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import { getWalletClient, getBalance, waitForTransactionReceipt } from '@web3-onboard/wagmi';
import { TokenboundClient } from '@tokenbound/sdk';
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

export function useTokenboundClient(): Loadable<TokenboundClient> {
  const [{wallet}, _, __] = useConnectWallet();
  const wagmiConfig = useWagmiConfig();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "client", wallet?.chains?.[0]?.id, wagmiConfig?.state?.current,
  ], [wallet?.chains?.[0]?.id, wagmiConfig?.state?.current]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const chainId: number = hexToNumber((queryKey[3] as `0x${string}`));
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
