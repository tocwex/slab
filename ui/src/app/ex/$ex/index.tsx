import type { Nullable, Address, Loadable, UrbitID } from '@/type/slab';
import { createFileRoute } from '@tanstack/react-router'
import React, { useMemo } from 'react';
import { HeroFrame, LoadingFrame, TBAFrame, AddressFrame, UrbitIDFrame, ChainFrame } from '@/comp/Frames';
import { TextLoadingIcon } from '@/comp/Icons';
import { useRouteUrbitExplore } from '@/hook/app';
import { useGlobalSyndicates, useUrbitSyndicate, useSafeAccount, useUrbitAccount } from '@/hook/web3';
import { useWalletMeta } from '@/hook/wallet';
import { formatToken, toTitleCase } from '@/lib/util';

export const Route = createFileRoute('/ex/$ex/')({
  // head: ({ params }) => ({
  //   meta: [
  //     { title: `%slab | test page` },
  //   ],
  // }),
  component: (): React.ReactNode => {
    const urbitID: UrbitID = (useRouteUrbitExplore() as UrbitID);
    const urbitSy = useUrbitSyndicate(urbitID);
    const urbitAccount = useUrbitAccount(urbitID);
    const urbitMultisig = useSafeAccount(urbitID);
    const globalSys = useGlobalSyndicates();

    const syAddress: Nullable<Address> = useMemo(() => (
      (globalSys || []).find(([u, a]) => (u.id === urbitID.id))?.[1] ?? null
    ), [urbitID, globalSys]);
    const syManagers: Nullable<Address[]> = useMemo(() => (
      ((urbitMultisig || null)?.owners as Address[]) ?? null
    ), [urbitMultisig]);

    return (
      <LoadingFrame status={urbitSy} title={`Explore ${urbitID.patp} Syndicate`} error={
        (urbitSy !== false) ? (
          <>
            <h4 className="font-medium">
              There was an error fetching the data for this page.
            </h4>
            <h4 className="font-medium">
              Either the input data was invalid or there were network errors.
            </h4>
          </>
        ) : (
          <>
            <h4 className="font-medium">
              <span>There is no live Syndicate for </span>
              <UrbitIDFrame urbitID={urbitID} />
              <span> on chain </span>
              <ChainFrame />
              <span>.</span>
            </h4>
            <h4 className="font-medium">
              {!syAddress ? (
                <span>
                  A Syndicate has never been formed for this Urbit ID on this chain.
                </span>
              ) : (
                <>
                  <span>The Syndicate previously launched at </span>
                  <AddressFrame address={syAddress} />
                  <span> has been abandoned.</span>
                </>
              )}
            </h4>
          </>
        )
      }>
        {!!urbitSy && (
          <div className="main">
            <h1 className="text-4xl font-bold underline">
              Explore {urbitID.patp} Syndicate
            </h1>
            <h3 className="text-2xl underline decoration-dotted">
              {urbitID.patp} Syndicate Token
            </h3>
            <div>
              <ul className="list-disc pl-4">
                <li>
                  <span className="font-bold">name: </span>
                  <span>{urbitSy.token.name}</span>
                </li>
                <li>
                  <span className="font-bold">ticker: </span>
                  <span>${urbitSy.token.symbol}</span>
                </li>
                <li>
                  <span className="font-bold">contract: </span>
                  <AddressFrame address={urbitSy.token.address} />
                </li>
                <li>
                  <span className="font-bold">owner: </span>
                  <TBAFrame address={urbitSy.owner} />
                </li>
                <li>
                  <span className="font-bold">manager(s): </span>
                  {(urbitMultisig === false) ? (
                    (!urbitAccount) ? (
                      <TextLoadingIcon />
                    ) : (
                      <TBAFrame address={urbitAccount.owner} />
                    )
                  ) : (
                    <ul className="list-disc pl-8">
                      {(syManagers ?? []).map((manager: Address) => (
                        <li key={manager}>
                          <TBAFrame address={manager} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
                <li>
                  <span className="font-bold">supply: </span>
                  <ul className="list-decimal pl-8">
                    <li>
                      <span className="italic">current: </span>
                      <span>
                        {formatToken(urbitSy.token.supply, urbitSy.token)}
                      </span>
                    </li>
                    <li>
                      <span className="italic">maximum: </span>
                      <span>
                        {!urbitSy.token.maximum
                          ? "—"
                          : formatToken(urbitSy.token.maximum, urbitSy.token)
                        }
                      </span>
                    </li>
                  </ul>
                </li>
                <li>
                  <span className="font-bold">holders: </span>
                  <ul className="list-decimal pl-8">
                    {Object.entries(urbitSy.holders).map(([holder, amount]: [string, bigint]) => (
                      <li key={holder}>
                        <TBAFrame address={(holder as Address)} />
                        <span> : </span>
                        <span>
                          {formatToken(amount, urbitSy.token)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        )}
      </LoadingFrame>
    );
  },
});
