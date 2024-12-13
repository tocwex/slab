import type { CommonPositions } from '@web3-onboard/core/dist/types';
import { init as web3Init } from '@web3-onboard/react';
import wagmi from '@web3-onboard/wagmi'
import injectedModule from '@web3-onboard/injected-wallets'

const web3onboardClientSingleton = () => (web3Init({
  wallets: [
    injectedModule(),
  ],
  chains: [
    {
      id: 1,
      token: 'ETH',
      label: 'Ethereum Mainnet',
      rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
    }, {
      id: 11155111,
      token: 'ETH',
      label: 'Sepolia',
      rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
    },
  ],
  // FIXME: Want to just have the icon displayed in the metadata, but the name
  // and a non-empty description are also required
  //
  // appMetadata: {
  //   name: '%slab',
  //   icon: '/tocwex.svg',
  //   description: 'A tool for launching and maintaining portal digital organizations (PDOs).',
  //   gettingStartedGuide: 'https://docs.tocwexsyndicate.com/',
  //   // explore: 'https://tocwexsyndicate.com/',
  // },
  wagmi: wagmi,
  connect: {
    showSidebar: false,
    autoConnectLastWallet: true,
  },
  accountCenter: (() => {
    const config = {
      enabled: true,
      position: ('topRight' as CommonPositions),
    };
    return {desktop: config, mobile: config};
  })(),
}));

declare const globalThis: {
  web3onboardGlobal: ReturnType<typeof web3onboardClientSingleton>;
} & typeof global;

export const web3onboard = globalThis.web3onboardGlobal ?? web3onboardClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.web3onboardGlobal = web3onboard;
