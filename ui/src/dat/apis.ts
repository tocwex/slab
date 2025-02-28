import type { CommonPositions } from '@web3-onboard/core/dist/types';
import { QueryClient } from '@tanstack/react-query'
import { init as web3Init } from '@web3-onboard/react';
import wagmi from '@web3-onboard/wagmi'
import injectedModule from '@web3-onboard/injected-wallets'
import { APP, BLOCKCHAIN } from '@/dat/const';

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
  // FIXME: Want to just have the icon displayed in the metadata, but the name
  // and a non-empty description are also required
  //
  // appMetadata: {
  //   name: "%slab",
  //   icon: "/tocwex.svg",
  //   description: "A tool for launching and maintaining portal digital organizations (Syndicates).",
  //   gettingStartedGuide: "https://docs.tocwexsyndicate.com/",
  //   // explore: "https://tocwexsyndicate.com/",
  // },
  wagmi: wagmi,
  disableFontDownload: true,
  connect: {
    showSidebar: false,
    autoConnectLastWallet: true,
  },
  // theme: {
  //   "--w3o-font-family": "'Urbit Sans', sans-serif",
  // },
  accountCenter: (() => {
    const config = {
      enabled: true,
      position: ("topRight" as CommonPositions),
    };
    return {desktop: config, mobile: config};
  })(),
});
