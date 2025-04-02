import type { Address, Loadable, Syndicate } from '@/type/slab';
import React, { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router'
import { LoadingFrame, TBAFrame } from '@/comp/Frames';
import { useGlobalSyndicates } from '@/hook/web3';
import { formatToken, formatFloat, formatUint } from '@/lib/util';
import { formatUnits } from 'viem';

export const Route = createFileRoute('/explore')({
  // head: ({ params }) => ({
  //   meta: [
  //     { title: `%slab | test page` },
  //   ],
  // }),
  component: (): React.ReactNode => {
    const syndicates: Loadable<Syndicate[]> = useGlobalSyndicates();

    return (
      <LoadingFrame status={syndicates} title="Explore Syndicates" size="lg">
        <div className="main">
          <h1 className="text-4xl font-bold underline">
            Explore Syndicates
          </h1>
          <ul className="list-disc space-y-4">
            {(syndicates || []).map(({owner, token, holders}: Syndicate) => (
              <li key={token.address}>
                <span className="font-bold underline">{token.symbol}</span>
                <ul className="list-disc pl-4">
                  <li>
                    <span className="font-bold">name: </span>
                    <span>{token.name}</span>
                  </li>
                  <li>
                    <span className="font-bold">active?: </span>
                    <span>{token.active ? "yes" : "no"}</span>
                  </li>
                  <li>
                    <span className="font-bold">supply: </span>
                    <span>
                      {formatFloat(formatUnits(token.supply, token.decimals), 0, 2)}
                      {!token.maximum ? " (no cap)" : ` / ${
                        formatFloat(formatUnits(token.maximum, token.decimals), 0, 2)
                      }`}
                    </span>
                  </li>
                  <li>
                    <span className="font-bold">owner: </span>
                    <TBAFrame address={owner} />
                  </li>
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </LoadingFrame>
    );
  },
});
