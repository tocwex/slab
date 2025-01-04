"use client";
import type { UrbitID, TokenHolding } from "@/type/slab";
import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRouteUrbitID } from '@/hook/app';
import { useSafePDOs } from '@/hook/web3';
import { TokenboundAccountInfo } from '@/comp/Accounts';
import { TinyLoadingIcon } from '@/comp/Icons';
import { REGEX } from '@/dat/const';

export default function IDPage(): React.ReactNode {
  const router = useRouter();
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
  const routePDOs = useSafePDOs(routeID);

  const gotoUrbitID = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const urbitPDO: string | undefined = event.target?.value;
    if (!!urbitPDO) {
      router.push(`/id/${routeID.patp}/pdo/${urbitPDO}`);
    }
  }, [router]);

  return (
    <div className="main">
      <h1 className="text-4xl font-bold underline">
        {routeID.patp} profile
      </h1>
      <form className="flex flex-col items-center gap-2">
        <h2 className="text-2xl">
          Manage PDO
        </h2>
        {(routePDOs === undefined) ? (
          <TinyLoadingIcon />
        ) : (
          <select onChange={gotoUrbitID} className="input-lg">
            <option key="" value="">
              Select PDO
            </option>
            {(routePDOs ?? []).map(({id, patp, clan}: UrbitID) => (
              <option key={id} value={patp}>
                {patp}
              </option>
            ))}
          </select>
        )}
      </form>
      <TokenboundAccountInfo urbitID={routeID} />
    </div>
  );
}
