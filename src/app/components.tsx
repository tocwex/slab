"use client";
import type { Address } from "@/type/slab";
import { useCallback, useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { Web3OnboardProvider } from '@web3-onboard/react';
import { useConnectWallet } from '@web3-onboard/react';
import { useWalletUrbitIDs } from '@/hook/wallet';
import { AddressFrame } from '@/comp/Frames';
import { HugeLoadingIcon } from '@/comp/Icons';
import { trimAddress } from '@/lib/util';
import { web3onboard } from '@/dat/web3onboard';
import { react_query } from '@/dat/react-query';

export function AppWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  const UrbitIDGate = useCallback(({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>): React.ReactNode => {
    const [{wallet, connecting}, connect, disconnect] = useConnectWallet();
    const urbitIDs = useWalletUrbitIDs();

    const isUrbitProvider: boolean = useMemo(() => (
      !connecting && !!wallet && !!urbitIDs && urbitIDs.length > 0
    ), [connecting, wallet, urbitIDs]);
    const address: Address = useMemo(() => (
      ((wallet?.accounts?.[0]?.address ?? "0x0") as Address)
    ), [wallet]);

    return (
      <div className="w-full flex flex-col justify-center items-center">
        {isUrbitProvider ? children : (
          <div className="h-lvh main">
            <h1 className="text-4xl font-bold underline">
              %slab
            </h1>
            <h4 className="font-medium">
              {(!wallet) ? (
                <span>
                  Connect a Web3 wallet holding an Urbit ID to continue.
                </span>
              ) : (connecting || urbitIDs === undefined) ? (
                <HugeLoadingIcon />
              ) : (urbitIDs === null) ? (
                <>
                  <span>Unable to fetch Web3 wallet details for </span>
                  <AddressFrame address={address} />
                  <span>; please try again.</span>
                </>
              ) : (
                <>
                  <span>Web3 wallet </span>
                  <AddressFrame address={address} />
                  <span> doesn't contain an Urbit ID; please connect another.</span>
                </>
              )}
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
        )}
      </div>
    );
  }, []);

  return (
    <QueryClientProvider client={react_query}>
      <Web3OnboardProvider web3Onboard={web3onboard}>
        <UrbitIDGate>
          {children}
        </UrbitIDGate>
      </Web3OnboardProvider>
    </QueryClientProvider>
  );
}
