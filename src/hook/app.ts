import type { UrbitID } from '@/type/urbit';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { formUrbitID } from '@/lib/util';

export function useRouteUrbitID(): UrbitID | undefined {
  const params = useParams<{id: string}>();
  const routeID: UrbitID | undefined = useMemo(() => (
    params?.id && formUrbitID(params?.id)
  ), [params?.id]);
  return routeID;
}
