"use client";
import { useCallback } from 'react';
import { web3onboard } from '@/lib/web3onboard';
import { Web3OnboardProvider } from '@web3-onboard/react';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';

export function UrbitIDProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  const UrbitIDGate = useCallback(({
    children
  }: Readonly<{
    children: React.ReactNode;
  }>): React.ReactNode => {
    const [{wallet, connecting}, connect, disconnect] = useConnectWallet();

    return (
      <div className="w-full flex flex-col justify-center items-center">
        {!!wallet ? children : (
          <div className="h-lvh flex flex-col justify-center items-center">
            <h1 className="text-3xl font-bold">
              %slab
            </h1>
            <h4 className="font-medium">
              Connect a Web3 wallet holding an Urbit ID to continue.
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
                ? 'Connecting…'
                : (wallet
                  ? 'Disconnect Wallet'
                  : 'Connect Wallet'
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
