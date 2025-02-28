import type { Nullable, UrbitID } from '@/type/slab';
import { useMemo, useCallback } from 'react';
// import { useRouter, useParams } from 'next/navigation';
import { formUrbitID } from '@/lib/util';

export function useRouteUrbitParam(param: string): Nullable<UrbitID> {
  // const params = useParams();
  // const routeID: UrbitID | null = useMemo(() => (
  //   !(params?.[param]) ? null : formUrbitID(String(params?.[param]))
  // ), [params?.[param]]);
  // return routeID;
  return null;
}

export function useRouteUrbitID(): Nullable<UrbitID> {
  return useRouteUrbitParam("id");
}

export function useRouteUrbitSyndicate(): Nullable<UrbitID> {
  return useRouteUrbitParam("sy");
}

export function useRedirect(link: string): () => void {
  // const router = useRouter();
  // const redirect = useCallback(() => (
  //   router.push(link)
  // ), [router]);
  // return redirect;
  return () => {};
}

export function useGoHome(): () => void {
  return useRedirect("/");
}

export function useGoBack(): () => void {
  // const router = useRouter();
  // const goBack = useCallback(() => (
  //   router.back()
  // ), [router]);
  // return goBack;
  return () => {};
}
