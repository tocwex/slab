import { useState, useEffect } from 'react';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react';
import { readContract } from '@web3-onboard/wagmi';
import * as ob from "urbit-ob";
import { delay } from '@/lib/util';
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
      const getOwnedPoints = async () => {
        let result: number[] | undefined = undefined;
        let error: Error | undefined = undefined;
        let attempt: number = 1;
        const maxAttempts: number = 3;

        while (attempt++ < maxAttempts) {
          try {
            const attemptResult: unknown = await readContract(wagmiConfig, {
              abi: CONTRACT.AZIMUTH.ABI,
              address: CONTRACT.AZIMUTH.ADDRESS.ETHEREUM,
              functionName: "getOwnedPoints",
              args: [address],
            });
            result = (attemptResult as number[]);
          } catch (attemptError: any) {
            error = attemptError;
            await delay(500);
          }
        }

        if (!result) { console.log(error); }
        return result;
      };
      getOwnedPoints().then((points: number[] | undefined) => {
        setUrbitIDs(points);
      });
    }
  }, [wallet?.accounts?.[0]?.address, wallet?.chains?.[0]]);

  return urbitIDs;
}
