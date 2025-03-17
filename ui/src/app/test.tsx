import type { Charge, Charges, ChargeUpdateInitial } from '@urbit/api';
import React, { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router'
import { scryCharges } from '@urbit/api';
import { LoadingFrame } from '@/comp/Frames';
import { REACT_QUERY, WEB3ONBOARD, URBIT } from '@/dat/apis';

export const Route = createFileRoute('/test')({
  // head: ({ params }) => ({
  //   meta: [
  //     { title: `%slab | test page` },
  //   ],
  // }),
  component: (): React.ReactNode => {
    const [apps, setApps] = useState<Charges>();

    useEffect(() => {
      async function init() {
        const charges = (await URBIT.scry<ChargeUpdateInitial>(scryCharges)).initial;
        setApps(charges);
      }
      init();
    }, []);

    return (
      <LoadingFrame status={apps} title={`Urbit Apps on ~${URBIT.ship}`} size="lg">
        <div className="main">
          <h1 className="text-4xl font-bold underline">
            Urbit Apps on ~{URBIT.ship}
          </h1>
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
        </div>
      </LoadingFrame>
    );
  },
});
