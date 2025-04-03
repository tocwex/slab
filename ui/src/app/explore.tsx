import type { Address, Loadable, Syndicate, UrbitID } from '@/type/slab';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router'
import { LoadingFrame, TBAFrame, AddressFrame, UrbitIDFrame } from '@/comp/Frames';
import { useGlobalWhitelist, useGlobalSyndicates } from '@/hook/web3';
import { formatToken, formatFloat, formatUint } from '@/lib/util';
import { formatUnits } from 'viem';

export const Route = createFileRoute('/explore')({
  // head: ({ params }) => ({
  //   meta: [
  //     { title: `%slab | test page` },
  //   ],
  // }),
  component: (): React.ReactNode => {
    const whitelist: Loadable<UrbitID[]> = useGlobalWhitelist();
    const syndicates: Loadable<Syndicate[]> = useGlobalSyndicates();

    const activeSyndicates = useMemo(() => (
      (syndicates || []).filter(({token}) => token?.active === true)
    ), [syndicates]);
    const inactiveSyndicates = useMemo(() => (
      (syndicates || []).filter(({token}) => token?.active === false)
    ), [syndicates]);

    const SyndicateFrame = useCallback(function ({
      syndicate,
    }: {
      syndicate: Syndicate;
    }) {
      const { owner, token, holders } = syndicate;
      return (
        <li key={token.address}>
          <div className="inline-flex flex-row items-center gap-2">
            <span className="font-bold">${token.symbol}:</span>
            <AddressFrame address={token.address} />
          </div>
          <ul className="list-disc pl-4">
            <li>
              <span className="font-bold">name: </span>
              <span>{token.name}</span>
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
      );
    }, []);

    return (
      <LoadingFrame status={whitelist && syndicates} title="Explore Syndicates" size="lg">
        <div className="main">
          <h1 className="text-4xl font-bold underline">
            Explore Syndicates
          </h1>
          <h3 className="text-2xl font-semibold underline">
            Active Syndicates
          </h3>
          <ul className="list-disc space-y-4">
            {activeSyndicates.map((sy: Syndicate) => (
              <SyndicateFrame key={sy?.token?.address} syndicate={sy} />
            ))}
          </ul>
          <h3 className="text-2xl font-semibold underline">
            Retired Syndicates
          </h3>
          <ul className="list-disc space-y-4">
            {inactiveSyndicates.map((sy: Syndicate) => (
              <SyndicateFrame key={sy?.token?.address} syndicate={sy} />
            ))}
          </ul>
          <h3 className="text-2xl font-semibold underline">
            Whitelisted Points
          </h3>
          <ul className="list-disc">
            {(whitelist || []).map((urbitID: UrbitID) => (
              <li key={urbitID.id}>
                <UrbitIDFrame urbitID={urbitID} link={false} />
              </li>
            ))}
          </ul>
        </div>
      </LoadingFrame>
    );
  },
});
