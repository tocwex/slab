"use client";
import type { UrbitID } from "@/type/urbit";
import { useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useConnectWallet } from '@web3-onboard/react';
import { useUrbitIDs } from '@/lib/wallet';
import { trimAddress, formUrbitID } from '@/lib/util';

export function IDRouteWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  const [{wallet, connecting}, connect, disconnect] = useConnectWallet();
  const urbitIDs = useUrbitIDs();
  const router = useRouter();
  const params = useParams<{id: string}>();

  const address: string | undefined = useMemo(() => (
    trimAddress(wallet?.accounts?.[0]?.address ?? "")
  ), [wallet]);
  const routeID: UrbitID = useMemo(() => (
    formUrbitID(params?.id ?? "")
  ), [params?.id]);
  const isRouteIDHolder: boolean = useMemo(() => (
    (urbitIDs ?? []).map(({id}) => id).includes(routeID.id)
  ), [routeID, urbitIDs]);

  return !routeID.id ? (
    <div className="h-lvh main">
      <h1 className="text-4xl font-bold underline">
        %slab
      </h1>
      <h4 className="font-medium">
        <span>Attempting to log in using </span>
        <span className="font-bold">{params?.id}</span>
        <span>, which isn't a valid Urbit ID.</span>
      </h4>
      <h4 className="font-medium">
        <span>Please log in with a valid Urbit ID.</span>
      </h4>
      <button
        onClick={async () => router.push(`/`)}
        className="mt-4 button-lg"
      >
        Retry
      </button>
    </div>
  ) : !isRouteIDHolder ? (
    <div className="h-lvh main">
      <h1 className="text-4xl font-bold underline">
        %slab
      </h1>
      <h4 className="font-medium">
        <span>Web3 wallet </span>
        <code className="font-bold">{address}</code>
        <span> doesn't hold Urbit ID </span>
        <span className="font-bold">{params?.id}</span>
        <span>.</span>
      </h4>
      <h4 className="font-medium">
        <span>Please connect the owning wallet to continue.</span>
      </h4>
      <button
        disabled={connecting}
        onClick={async () => (wallet ? disconnect(wallet) : connect())}
        className="mt-4 button-lg"
      >
        {connecting
          ? "Connecting…"
          : (wallet
            ? "Disconnect Wallet"
            : "Connect Wallet"
          )
        }
      </button>
    </div>
  ) : children;
}
