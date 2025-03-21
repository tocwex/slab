import type { CommonPositions } from '@web3-onboard/core/dist/types';
import Urbit from '@urbit/http-api';
import { QueryClient } from '@tanstack/react-query';
import { init as web3Init } from '@web3-onboard/react';
import wagmi from '@web3-onboard/wagmi';
import injectedModule from '@web3-onboard/injected-wallets';
// @ts-ignore
import iconURL from '@/file/favicon.svg';
import { APP, BLOCKCHAIN } from '@/dat/const';

export const URBIT = new Urbit("", "", window.desk);
URBIT.ship = window.ship;

export const REACT_QUERY = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity,
      staleTime: Infinity,
      retryOnMount: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      retry: 3,
    },
  },
});

export const WEB3ONBOARD = web3Init({
  wallets: [
    injectedModule(),
  ],
  chains: [
    {
      id: BLOCKCHAIN.ID.ETHEREUM,
      rpcUrl: BLOCKCHAIN.RPC.ETHEREUM,
      label: "Ethereum",
      token: "ETH",
    }, {
      id: BLOCKCHAIN.ID.SEPOLIA,
      rpcUrl: BLOCKCHAIN.RPC.SEPOLIA,
      label: "Sepolia",
      token: "sepoliaETH",
    },
  ],
  appMetadata: {
    name: "%slab",
    icon: iconURL,
    description: "A Syndicate launchpad and management dashboard.",
    // gettingStartedGuide: "https://docs.tocwexsyndicate.com/",
    // explore: "https://tocwexsyndicate.com/",
  },
  wagmi: wagmi,
  disableFontDownload: true,
  connect: {
    showSidebar: false,
    autoConnectLastWallet: true,
  },
  theme: {
    "--w3o-font-family": "'Urbit Sans', sans-serif",
    "--w3o-border-radius": "var(--radius-2xl)",
    "--w3o-text-color": "var(--color-black)",
    "--w3o-background-color": "var(--color-white)",
    "--w3o-border-color": "var(--color-gray-500)",
    // "--w3o-action-color": "var(--color-black)",
  },
  accountCenter: (() => {
    const config = {
      enabled: true,
      position: ("topRight" as CommonPositions),
    };
    return {desktop: config, mobile: config};
  })(),
});
