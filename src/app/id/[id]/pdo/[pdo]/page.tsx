"use client";
import type { UrbitID } from "@/type/slab";
import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRouteUrbitID, useRouteUrbitPDO } from '@/hook/app';
import { PDOAccountInfo, SafeAccountInfo } from '@/comp/Accounts';
import { trimAddress } from '@/lib/util';
import { ACCOUNT, REGEX } from '@/dat/const';

export default function PDOPage(): React.ReactNode {
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
  const routePDO: UrbitID = (useRouteUrbitPDO() as UrbitID);

  return (
    <div className="main">
      <h1 className="text-4xl font-bold underline">
        {routePDO.patp} pdo
      </h1>
      <SafeAccountInfo urbitID={routePDO} />
      <PDOAccountInfo urbitID={routeID} urbitPDO={routePDO} />
    </div>
  );
}
