import { useState, useEffect } from 'react';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import { readContract } from '@web3-onboard/wagmi';
import * as ob from "urbit-ob";
import { CONTRACT } from '@/dat/const';

// TODO: Add type for Urbit ID indicating clan type (i.e. galaxy, star, planet)
export function useUrbitIDs(): number[] | undefined {
  const [urbitIDs, setUrbitIDs] = useState<number[] | undefined>(undefined);

  const [{wallet, connecting}, connect, disconnect] = useConnectWallet();
  const wagmiConfig = useWagmiConfig();

  useEffect(() => {
    const address = wallet?.accounts?.[0]?.address;
    const chainId = wallet?.chains?.[0]?.id;
    if (!address || !chainId || !wagmiConfig) {
      setUrbitIDs(undefined);
    } else {
      readContract(wagmiConfig, {
        abi: CONTRACT.AZIMUTH.ABI,
        address: CONTRACT.AZIMUTH.ADDRESS.ETHEREUM,
        functionName: "getOwnedPoints",
        args: [address],
      }).then((points: unknown) => {
        setUrbitIDs((points as number[]));
      }).catch((error) => {
        // FIXME: Add retry capability here
        setUrbitIDs([]);
      });
    }
  }, [wallet?.accounts?.[0]?.address, wallet?.chains?.[0]]);

  return urbitIDs;
}
