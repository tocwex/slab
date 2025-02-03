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
  return (
    <QueryClientProvider client={react_query}>
      <Web3OnboardProvider web3Onboard={web3onboard}>
        {children}
      </Web3OnboardProvider>
    </QueryClientProvider>
  );
}
