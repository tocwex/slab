"use client";
import type { UrbitID } from "@/type/slab";
import { useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useConnectWallet } from '@web3-onboard/react';
import { LoadingFrame, AddressFrame, UrbitIDFrame } from '@/comp/Frames';
import { useGoHome, useRouteUrbitParam } from '@/hook/app';
import { useWalletMeta, useWalletUrbitIDs } from '@/hook/wallet';
import { toTitleCase, formUrbitID } from '@/lib/util';

export function ConnectedWalletGuard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  const walletMeta = useWalletMeta();
  const [{wallet, connecting}, connect, disconnect] = useConnectWallet();

  return (
    <LoadingFrame status={walletMeta !== null} error={
      <h4 className="font-medium">
        Please connect a Web3 wallet to continue.
      </h4>
    } action={
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
    }>
      {children}
    </LoadingFrame>
  );
}

export function RouteUIDValidGuard({
  param,
  children,
}: Readonly<{
  param: string;
  children: React.ReactNode;
}>): React.ReactNode {
  const [{wallet, connecting}, connect, disconnect] = useConnectWallet();
  const params = useParams();
  const routeID: UrbitID | null = useRouteUrbitParam(param);

  return (
    <LoadingFrame status={routeID?.id} error={
      <div className="flex flex-col gap-2 items-center text-center">
        <h4 className="font-medium">
          <span>Attempting to access </span>
          <span className="font-bold">{params?.[param]}</span>
          <span>, which isn't a valid Urbit ID.</span>
        </h4>
        <h4 className="font-medium">
          <span>Please try again with a valid Urbit ID.</span>
        </h4>
      </div>
    }>
      {children}
    </LoadingFrame>
  );
}

export function RouteUIDOwnerGuard({
  param,
  children,
}: Readonly<{
  param: string;
  children: React.ReactNode;
}>): React.ReactNode {
  const params = useParams();
  const routeID: UrbitID | null = useRouteUrbitParam(param);
  const wallet = useWalletMeta();
  const urbitIDs = useWalletUrbitIDs();

  const isRouteIDHolder: boolean = useMemo(() => (
    (urbitIDs || []).map(({id}) => id).includes(routeID?.id ?? "")
  ), [routeID, urbitIDs]);

  return (
    <ConnectedWalletGuard>
      <RouteUIDValidGuard param={param}>
        <LoadingFrame status={wallet && urbitIDs && isRouteIDHolder} error={
          (!!wallet && !!routeID) && (
            <div className="flex flex-col gap-2 items-center text-center">
              <h4 className="font-medium">
                <span>Web3 wallet </span>
                <AddressFrame address={wallet.address} />
                <span> doesn't hold Urbit ID </span>
                <UrbitIDFrame urbitID={routeID} />
                <span> on chain </span>
                <span className="font-bold">{toTitleCase(wallet.chainID)}</span>
                <span>.</span>
              </h4>
              <h4 className="font-medium">
                <span>Please connect the owning wallet to continue.</span>
              </h4>
            </div>
          )
        }>
          {children}
        </LoadingFrame>
      </RouteUIDValidGuard>
    </ConnectedWalletGuard>
  );
}
