"use client";
import type { UrbitID } from "@/type/slab";
import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRouteUrbitID, useRouteUrbitPDO } from '@/hook/app';
import { TokenboundAccountInfo } from '@/comp/Accounts';
import { trimAddress } from '@/lib/util';
import { ACCOUNT, REGEX } from '@/dat/const';

export default function PDOPage(): React.ReactNode {
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
  const routePDO: UrbitID = (useRouteUrbitPDO() as UrbitID);

  // TODO: Is this UrbitID held within a Gnosis Safe?
  // TODO: Names/Urbit IDs of all signers
  // TODO: Threshold of the safe

  return (
    <div className="main">
      <h1 className="text-4xl font-bold underline">
        {routePDO.patp} pdo
      </h1>
      <TokenboundAccountInfo urbitID={routePDO} />
      <div>
        TODO: Implement the following on this page (ordered by priority):
        <ul className="list-disc">
          <li>TBA Info</li>
          <li>PDO Managers</li>
          <li>Launch a Token</li>
          <li>TBA Launch</li>
        </ul>
      </div>
    </div>
  );
}
