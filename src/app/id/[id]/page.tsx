"use client";
import type { UrbitID } from "@/type/urbit";
import { useRouteUrbitID } from '@/hook/app';
import { useTokenboundAccount } from '@/hook/web3';
import { trimAddress } from '@/lib/util';
import { ACCOUNT } from '@/dat/const';

export default function IDPage(): React.ReactNode {
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
  const tbAccount = useTokenboundAccount(routeID);

  return (
    <div className="main">
      <h1 className="text-4xl font-bold underline">
        {routeID.patp} Profile
      </h1>
      <ul className="list-disc">
        <li>
          <span className="font-bold">Urbit ID: </span>
          <span>{routeID.patp}</span>
        </li>
        <li>
          <span className="font-bold">Point Type: </span>
          <span>{routeID.clan}</span>
        </li>
        <li>
          <span className="font-bold">Point Number: </span>
          <span>{routeID.id}</span>
        </li>
        <li>
          <span className="font-bold">Has TBA: </span>
          {!tbAccount ? (
            <span>…loading…</span>
          ) : !(tbAccount[1]) ? (
            <span>No</span>
          ) : (
            <code>{trimAddress(tbAddress[0])}</code>
          )}
        </li>
      </ul>
    </div>
  );
}
