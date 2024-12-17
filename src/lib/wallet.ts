import type { UrbitID } from '@/type/urbit';
import type { Config as WagmiConfig } from '@wagmi/core';

import { useMemo } from 'react';
import { QueryKey, useQuery } from '@tanstack/react-query';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import { readContract } from '@web3-onboard/wagmi';
import * as ob from "urbit-ob";

import { delay } from '@/lib/util';
import { APP, CONTRACT } from '@/dat/const';

export function useUrbitIDs(): UrbitID[] | null | undefined {
  const [{wallet, connecting}, connect, disconnect] = useConnectWallet();
  const wagmiConfig = useWagmiConfig();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "urbit-ids", wallet?.chains?.[0]?.id, wallet?.accounts?.[0]?.address,
  ], [wallet]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const chainId: string = (queryKey[2] as string);
      const address: string = (queryKey[3] as string);
      console.log(`querying ${chainId}:${address}`);
      const points = await readContract((wagmiConfig as WagmiConfig), {
        abi: CONTRACT.AZIMUTH.ABI,
        address: CONTRACT.AZIMUTH.ADDRESS.ETHEREUM,
        // address: CONTRACT.AZIMUTH.ADDRESS.SEPOLIA,
        functionName: "getOwnedPoints",
        args: [address],
      });
      return (points as number[]).map((id: number): UrbitID => ({
        id,
        patp: ob.patp(id),
        clan: ob.clan(ob.patp(id)),
      }));
    },
    enabled: !!(queryKey[2]) && !!(queryKey[3]) && !!wagmiConfig,
    staleTime: 10 * 60 * 1000,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as UrbitID[]);
}
