import type { Loadable, Version } from '@/type/slab';
import type { Charge, Charges, ChargeUpdateInitial } from '@urbit/api';
import type { QueryKey, UseMutationOptions  } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scryCharges } from '@urbit/api';
import { URBIT } from '@/dat/apis';
import { APP } from '@/dat/const';

export function useDeskVersion(): Loadable<Version> {
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "urbit", "version", window.desk,
  ], [window.desk]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    // enabled: !!window.desk,
    queryFn: async (): Promise<Version> => {
      const apps = (await URBIT.scry<ChargeUpdateInitial>(scryCharges)).initial;
      return ((apps?.[window.desk]?.version ?? "?.?.?") as Version);
    },
  });

  return isLoading ? undefined
    : isError ? null
    : (data as Version);
}
