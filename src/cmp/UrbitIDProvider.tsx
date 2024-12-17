"use client";
import { useCallback, useMemo } from 'react';
import { Web3OnboardProvider } from '@web3-onboard/react';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import { getAccount, readContract } from '@web3-onboard/wagmi';
import * as ob from "urbit-ob";

import { web3onboard } from '@/lib/web3onboard';
import { useUrbitIDs } from '@/lib/wallet';

export function UrbitIDProvider({
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
    <Web3OnboardProvider web3Onboard={web3onboard}>
      <UrbitIDGate children={children} />
    </Web3OnboardProvider>
  );
}
