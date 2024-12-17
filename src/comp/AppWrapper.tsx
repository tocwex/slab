"use client";
import { useCallback, useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { Web3OnboardProvider } from '@web3-onboard/react';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import { getAccount, readContract } from '@web3-onboard/wagmi';
import * as ob from "urbit-ob";

import { web3onboard } from '@/dat/web3onboard';
import { react_query } from '@/dat/react-query';
import { useUrbitIDs } from '@/lib/wallet';

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
    const urbitIDs = useUrbitIDs();
    const isUrbitProvider: boolean = useMemo(() => (
      !connecting && !!wallet && !!urbitIDs && urbitIDs.length > 0
    ), [wallet, urbitIDs]);

    return (
      <div className="w-full flex flex-col justify-center items-center">
        {isUrbitProvider ? children : (
          <div className="h-lvh flex flex-col gap-4 justify-center items-center">
            <h1 className="text-4xl font-bold underline">
              %slab
            </h1>
            <h4 className="font-medium">
              {!urbitIDs
                ? "Connect a Web3 wallet holding an Urbit ID to continue."
                : "Web3 wallet doesn't contain an Urbit ID; please connect another."
              }
            </h4>
            <button
              disabled={connecting}
              onClick={async () => (wallet ? disconnect(wallet) : connect())}
              className={`
                flex items-center justify-center mt-4 px-4 py-1.5 rounded-full
                border border-white font-bold text-white whitespace-nowrap
              `}
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
