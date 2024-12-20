import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import type { Config as WagmiConfig } from '@wagmi/core';
import type { Address, Loadable, UrbitID, TokenboundAccount } from '@/type/slab';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import { getWalletClient, waitForTransactionReceipt } from '@web3-onboard/wagmi';
import { TokenboundClient } from '@tokenbound/sdk';
import { hexToNumber } from 'viem';
import { APP, ACCOUNT, CONTRACT } from '@/dat/const';

export function useTokenboundCreateMutation(
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
    mutationFn: async () => {
      if (!tbClient) throw Error("TokenboundClient unavailable");
      if (!wagmiConfig) throw Error("TokenboundClient unavailable");
      const { txHash } = await tbClient.createAccount({
        // tokenContract: CONTRACT.ECLIPTIC.ADDRESS.ETHEREUM,
        tokenContract: CONTRACT.ECLIPTIC.ADDRESS.SEPOLIA,
        tokenId: urbitID.id,
      });
      // FIXME: This doesn't really seem to work, but it hasn't been tested
      // very thoroughly
      const txReceipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: txHash,
      });
      return txReceipt;
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
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chains?.[0]?.id, urbitID.id,
  ], [wallet, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!tbClient) throw Error("TokenboundClient unavailable");
      const tbAddress: Address = await tbClient.getAccount({
        // tokenContract: CONTRACT.ECLIPTIC.ADDRESS.ETHEREUM,
        tokenContract: CONTRACT.ECLIPTIC.ADDRESS.SEPOLIA,
        tokenId: urbitID.id,
      });
      const tbIsDeployed: boolean = await tbClient.checkAccountDeployment({
        accountAddress: tbAddress,
      });
      return {
        address: tbAddress,
        deployed: tbIsDeployed,
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
