import type { Nullable, Address, Loadable, UrbitID } from '@/type/slab';
import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useCallback, useMemo } from 'react';
import partition from 'lodash.partition';
import Color from 'color';
import { PieChart } from 'react-minimal-pie-chart';
import {
  HeroFrame, LoadingFrame, NameFrame, ChainFrame,
  AddressFrame, TBAFrame, UrbitIDFrame,
} from '@/comp/Frames';
import { TextLoadingIcon } from '@/comp/Icons';
import { useRouteUrbitExplore } from '@/hook/app';
import {
  useGlobalSyndicates, useUrbitSyndicate, useSafeAccount, useUrbitAccount,
} from '@/hook/web3';
import { useWalletMeta } from '@/hook/wallet';
import { formatToken, trimAddress, randomColor } from '@/lib/util';
import { REGEX } from '@/dat/const';

interface SyndicateShares {
  holders: [Address, bigint][];
  minted: bigint;
  maximum?: bigint;
}

export const Route = createFileRoute('/ex/$ex/')({
  // head: ({ params }) => ({
  //   meta: [
  //     { title: `%slab | test page` },
  //   ],
  // }),
  component: (): React.ReactNode => {
    const [isShowMaximum, setIsShowMaximum] = useState<boolean>(false);

    const urbitID: UrbitID = (useRouteUrbitExplore() as UrbitID);
    const urbitSy = useUrbitSyndicate(urbitID);
    const urbitAccount = useUrbitAccount(urbitID);
    const urbitMultisig = useSafeAccount(urbitID);
    const globalSys = useGlobalSyndicates();

    const toggleShowMaximum = useCallback(() => (
      setIsShowMaximum(!isShowMaximum)
    ), [isShowMaximum, setIsShowMaximum]);

    const syAddress: Nullable<Address> = useMemo(() => (
      (globalSys || []).find(([u, a]) => (u.id === urbitID.id))?.[1] ?? null
    ), [urbitID, globalSys]);
    const syManagers: Nullable<Address[]> = useMemo(() => (
      ((urbitMultisig || null)?.owners as Address[]) ?? null
    ), [urbitMultisig]);
    const syShares: Nullable<SyndicateShares> = useMemo(() => {
      const holders: [Address, bigint][] = Object.entries((urbitSy || {})?.holders ?? {}).map(
        ([holder, amount]: [string, bigint]) => ([(holder as Address), BigInt(amount)])
      );
      const minted: bigint = holders.reduce((a, [, n]) => a + n, BigInt(0));
      const maximum: bigint | undefined = (urbitSy || {})?.token?.maximum;
      return !urbitSy ? null : { holders, minted, maximum };
    }, [urbitSy]);
    const syPieData = useMemo(() => {
      const pieAmounts: [string, bigint][] = syShares?.holders?.concat() ?? [];
      let pieTotal: bigint = syShares?.minted ?? BigInt(0);
      if (!!syShares && !!syShares.maximum && isShowMaximum) {
        const unminted: bigint = syShares.maximum - syShares.minted;
        if (unminted > 0) {
          pieAmounts.push(["unminted", unminted]);
          pieTotal = syShares.maximum;
        }
      }

      const piePercs: [string, number][] = pieAmounts.map(([owner, amount]) => ([
        owner,
        Number(amount * BigInt(10000) / pieTotal) / 100,
      ]));
      const [hugePercs, tinyPercs] = partition(piePercs, ([, p]: [string, number]) => p >= 1);
      // FIXME: May want to renormalize based on the "rest" value, and to use
      // the proper NULL address for the current chain
      const finalPercs = hugePercs.concat(!tinyPercs.length
        ? []
        // 100 - hugePercs.reduce((a: number, [, n]: [string, number]) => a + n, 0)
        : [["<1% holders", 1]]
      );

      return finalPercs.map(([owner, perc]: [string, number]) => ({
        title: owner,
        value: perc,
        color: randomColor(owner).grayscale().hex(),
      }));
    }, [syShares, isShowMaximum]);

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
                    <span className="italic">cap: </span>
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
            <PieChart
              data={syPieData}
              lineWidth={20}
              paddingAngle={3}
              labelPosition={60}
              label={({ x, y, dx, dy, dataEntry: {title, value, color} }) => (
                <text {...{x, y, dx, dy}}
                  dominant-baseline="central"
                  text-anchor="middle"
                  className="fill-white text-3xs"
                >
                  {!title.match(REGEX.ETHEREUM.ADDRESS)
                    ? title
                    : (<NameFrame address={(title as Address)} />)
                  }
                </text>
              )}
            />
            <button type="button"
              onClick={toggleShowMaximum}
              disabled={
                !urbitSy.token.maximum
                || (!!syShares && (syShares?.minted === syShares?.maximum))
              }
              className="input-lg input-nice"
            >
              {(!!syShares && (syShares?.minted === syShares?.maximum))
                ? "At Full Issuance"
                : `Show ${isShowMaximum ? "Current Supply" : "With Cap"}`
              }
            </button>
          </div>
        )}
      </LoadingFrame>
    );
  },
});
