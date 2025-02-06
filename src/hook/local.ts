import type {
  Loadable, Address, ChainAddress,
  SafeOwners, SafeArchive,
} from '@/type/slab';
import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWalletMeta } from '@/hook/wallet';
import { formContract, encodeSet, decodeSet } from '@/lib/util';
import { get as getLocal } from '@/dat/local';
import { APP, ERROR } from '@/dat/const';

// export function useLocalTokens(): Loadable<Record<Address, Token>> { ... }

export function useLocalSafes(): Loadable<SafeOwners> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "local", "safes", wallet?.chainID,
  ], [wallet?.chainID]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const localArchive = (((await getLocal("safes")) ?? {}) as SafeArchive);
      const tbContract = formContract(wallet.chain, "TOKENBOUND");
      const tbKey: ChainAddress = `${wallet.chain}:${tbContract.address}`;
      return ((localArchive?.[tbKey] ?? {}) as SafeOwners);
    },
    enabled: !!wallet,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as SafeOwners);
}
