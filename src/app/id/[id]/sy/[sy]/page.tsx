"use client";
import type { UrbitID } from "@/type/slab";
import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRouteUrbitID, useRouteUrbitSyndicate } from '@/hook/app';
import { SyndicateAccountInfo, SafeAccountInfo } from '@/comp/Accounts';
import { trimAddress } from '@/lib/util';
import { ACCOUNT, REGEX } from '@/dat/const';

export default function SyndicatePage(): React.ReactNode {
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
  const routeSyndicate: UrbitID = (useRouteUrbitSyndicate() as UrbitID);

  return (
    <div className="main">
      <h1 className="text-4xl font-bold underline">
        {routeSyndicate.patp} syndicate
      </h1>
      <SafeAccountInfo urbitID={routeSyndicate} />
      <SyndicateAccountInfo urbitID={routeID} urbitSyndicate={routeSyndicate} />
    </div>
  );
}
