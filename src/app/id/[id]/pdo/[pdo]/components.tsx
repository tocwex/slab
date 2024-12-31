"use client";
import type { UrbitID } from "@/type/slab";
import { useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSafeAccount } from '@/hook/web3';
import { useUrbitIDs } from '@/hook/wallet';
import { UrbitIDFrame } from '@/comp/Frames';
import { HugeLoadingIcon } from '@/comp/Icons';
import { formUrbitID } from '@/lib/util';

export function PDORouteWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  const router = useRouter();
  const params = useParams<{id: string; pdo: string;}>();

  const routeID: UrbitID = useMemo(() => formUrbitID(params?.id ?? ""), [params?.id]);
  const routePDO: UrbitID = useMemo(() => formUrbitID(params?.pdo ?? ""), [params?.pdo]);

  const safeAccount = useSafeAccount(routePDO);
  const isRoutePDOHolder: boolean = useMemo(() => (
    (safeAccount?.ownurs ?? []).map(({id}) => id).includes(routeID.id)
  ), [safeAccount, routeID]);

  const gotoHome = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    router.push(`/`);
  }, [router]);
  const gotoUrbitID = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    router.push(`/id/${routeID.patp}`);
  }, [router, routeID]);

  return !routePDO.id ? (
    <div className="h-lvh main">
      <h1 className="text-4xl font-bold underline">
        %slab
      </h1>
      <h4 className="font-medium">
        <span>Attempting to access the PDO for </span>
        <span className="font-bold">{params?.pdo}</span>
        <span>, which isn't a valid Urbit ID.</span>
      </h4>
      <h4 className="font-medium">
        <span>Please retry with a valid Urbit ID.</span>
      </h4>
      <button
        onClick={gotoUrbitID}
        className="mt-4 button-lg"
      >
        Retry
      </button>
    </div>
  ) : !isRoutePDOHolder ? (
    <div className="h-lvh main">
      <h1 className="text-4xl font-bold underline">
        %slab
      </h1>
      {(safeAccount === undefined) ? (
        <HugeLoadingIcon />
      ) : (safeAccount === null) ? (
        <div className="flex flex-col gap-2 text-center">
          <h4 className="font-medium">
            <span>Unable to load PDO for </span>
            <UrbitIDFrame urbitID={routePDO} />
            <span>.</span>
          </h4>
          <h4 className="font-medium">
            <span>Either the Urbit ID isn't a PDO or there were network errors.</span>
          </h4>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <h4 className="font-medium">
            <span>Urbit ID </span>
            <UrbitIDFrame urbitID={routeID} />
            <span> is not a signer for PDO </span>
            <UrbitIDFrame urbitID={routePDO} />
            <span>.</span>
          </h4>
          <h4 className="font-medium">
            <span>Please select a valid Urbit ID to continue.</span>
          </h4>
        </div>
      )}
      <button
        disabled={(safeAccount === undefined)}
        onClick={gotoHome}
        className="mt-4 button-lg"
      >
        Retry
      </button>
    </div>
  ) : children;
}
