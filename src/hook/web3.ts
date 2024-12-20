import type { Config as WagmiConfig } from '@wagmi/core';
import type { UrbitID } from '@/type/urbit';

import { useMemo } from 'react';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import { getWalletClient } from '@web3-onboard/wagmi';
import { TokenboundClient } from '@tokenbound/sdk';
import { hexToNumber } from 'viem';

import { QueryKey, useQuery } from '@tanstack/react-query';
import { APP, ACCOUNT, CONTRACT } from '@/dat/const';

export function useTokenboundAccount(urbitID: UrbitID): [string, boolean] | null | undefined {
  const [{wallet}, _, __] = useConnectWallet();
  const tbClient = useTokenboundClient();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chains?.[0]?.id, urbitID?.id,
  ], [wallet, urbitID.id]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const tbAddress: string = await tbClient.getAccount({
        tokenContract: CONTRACT.ECLIPTIC.ADDRESS.ETHEREUM,
        tokenId: urbitID.id,
      });
      const tbIsDeployed: boolean = await tbClient.checkAccountDeployment({
        accountAddress: tbAddress,
      });
      return [tbAddress, tbIsDeployed];
    },
    enabled: !!tbClient,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return (data as [string, boolean]);
}

export function useTokenboundClient(): TokenboundClient | null | undefined {
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
