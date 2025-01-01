import type { Loadable, Address, Contract, UrbitID } from '@/type/slab';
import { useMemo } from 'react';
import { QueryKey, useQuery } from '@tanstack/react-query';
import { readContract } from '@web3-onboard/wagmi';
import { useWalletMeta } from '@/hook/web3';
import { formContract, formUrbitID } from '@/lib/util';
import { APP, ACCOUNT, CONTRACT } from '@/dat/const';

export function useWalletUrbitIDs(): Loadable<UrbitID[]> {
  const wallet = useWalletMeta();
  return useUrbitIDs(wallet?.address ?? ACCOUNT.NULL.ETHEREUM);
}

export function useUrbitIDs(account: Address): Loadable<UrbitID[]> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "wallet", "urbit-ids", wallet?.chainId?.toString(), account,
  ], [wallet?.chainId, account]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error("Invalid wallet");
      const azimuth: Contract = formContract(wallet.chainId, "AZP");
      const points = await readContract(wallet.wagmi, {
        abi: azimuth.abi,
        address: azimuth.address,
        functionName: "getOwnedPoints",
        args: [account],
      });
      return (points as number[]).map(formUrbitID);
    },
    enabled: !!wallet,
    staleTime: 10 * 60 * 1000,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as UrbitID[]);
}
