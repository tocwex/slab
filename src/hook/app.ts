import type { Nullable, UrbitID } from '@/type/slab';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { formUrbitID } from '@/lib/util';

export function useRouteUrbitID(): Nullable<UrbitID> {
  const params = useParams<{id: string}>();
  const routeID: UrbitID | null = useMemo(() => (
    !(params?.id) ? null : formUrbitID(params?.id)
  ), [params?.id]);
  return routeID;
}

export function useRouteUrbitPDO(): Nullable<UrbitID> {
  const params = useParams<{pdo: string}>();
  const routePDO: UrbitID | null = useMemo(() => (
    !(params?.pdo) ? null : formUrbitID(params?.pdo)
  ), [params?.pdo]);
  return routePDO;
}
