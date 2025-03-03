import type { Nullable, UrbitID } from '@/type/slab';
import { useMemo, useCallback } from 'react';
import { useRouter, useMatches, useNavigate } from '@tanstack/react-router';
import { formUrbitID } from '@/lib/util';

export function useRouteParams(): Record<string, any> {
  return useMatches({ select: (matches) => matches.reduce(
    (acc, nex) => ({...acc, ...nex.params}),
    {},
  )});
}

export function useRouteUrbitParam(param: string): Nullable<UrbitID> {
  const params = useRouteParams();
  const routeID: UrbitID | null = useMemo(() => (
    !(params?.[param]) ? null : formUrbitID(String(params?.[param]))
  ), [params?.[param]]);
  return routeID;
}

export function useRouteUrbitID(): Nullable<UrbitID> {
  return useRouteUrbitParam("id");
}

export function useRouteUrbitSyndicate(): Nullable<UrbitID> {
  return useRouteUrbitParam("sy");
}

export function useRedirect(link: string): () => void {
  const navigate = useNavigate();
  const redirect = useCallback(() => (
    navigate({ to: link })
  ), [navigate]);
  return redirect;
}

export function useGoHome(): () => void {
  return useRedirect("/");
}

export function useGoBack(): () => void {
  const router = useRouter();
  const goBack = useCallback(() => (
    router.history.back()
  ), [router]);
  return goBack;
}
