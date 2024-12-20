import type { Nullable, UrbitID } from '@/type/slab';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { formUrbitID } from '@/lib/util';

export function useRouteUrbitID(): Nullable<UrbitID> {
  const params = useParams<{id: string}>();
  const routeID: UrbitID | undefined = useMemo(() => (
    !(params?.id) ? undefined : formUrbitID(params?.id)
  ), [params?.id]);
  return routeID;
}
