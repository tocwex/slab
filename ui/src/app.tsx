import React, { useEffect, useState } from 'react';
import { Charge, Charges, ChargeUpdateInitial, scryCharges } from '@urbit/api';
import { HeroFrame, LoadingFrame } from '@/comp/Frames';
import { QueryClientProvider } from '@tanstack/react-query'
import { Web3OnboardProvider } from '@web3-onboard/react';
import { URBIT, REACT_QUERY, WEB3ONBOARD } from '@/dat/apis';
import { APP } from '@/dat/const';

export default function App() {
  const [apps, setApps] = useState<Charges>();

  useEffect(() => {
    async function init() {
      const charges = (await URBIT.scry<ChargeUpdateInitial>(scryCharges)).initial;
      setApps(charges);
    }
    init();
  }, []);

  return (
    <QueryClientProvider client={REACT_QUERY}>
      <Web3OnboardProvider web3Onboard={WEB3ONBOARD}>
        <main className="relative">
          <div className="absolute top-4 left-4">
            <a href={APP.URL} className="button-lg">
              HOME
            </a>
          </div>
          <div className="max-w-3xl mx-auto flex flex-col justify-center items-center">
            <div className="max-w-md space-y-6 py-20">
              <LoadingFrame status={apps} title={`Urbit Apps on ~${URBIT.ship}`} size="md">
                <HeroFrame title={`Urbit Apps on ~${URBIT.ship}`} size="md">
                  <ul className="space-y-4">
                    {Object.entries(apps ?? {}).map(([desk, app]: [string, Charge]) => (
                      <li key={desk} className="flex items-center space-x-3 text-sm leading-tight">
                        <div className="flex-1">
                          <strong>{app.title || desk}</strong>
                          {app.info && <p>{app.info}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </HeroFrame>
              </LoadingFrame>
            </div>
          </div>
        </main>
      </Web3OnboardProvider>
    </QueryClientProvider>
  );
}
