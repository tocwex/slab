"use client";
import type { UrbitID } from "@/type/slab";
import Link from "next/link";
import { useRouteUrbitID } from '@/hook/app';
import { useTokenboundAccount, useTokenboundCreateMutation } from '@/hook/web3';
import { trimAddress } from '@/lib/util';
import { ACCOUNT } from '@/dat/const';

export default function IDPage(): React.ReactNode {
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
  const tbAccount = useTokenboundAccount(routeID);
  const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(
    routeID,
    // TODO: Consider adding a loading indicator while the account is being launched
    // { onSuccess: () => dismiss() },
  );

  // TODO: Include button that only appears if there is no TBA, and launches
  // one on click (then refresh page; will need mutate clause for 'useTBA')

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
          ) : !tbAccount.deployed ? (
            <span>No</span>
          ) : (
            <Link
              href={`https://sepolia.etherscan.io/address/${tbAccount.address}`}
              target="_blank"
            >
              <code>{trimAddress(tbAccount.address)}</code>
            </Link>
          )}
        </li>
      </ul>
      {(!!tbAccount && !tbAccount.deployed) && (
        <button
          onClick={async () => tbCreateMutate()}
          className="mt-4 button-lg"
        >
          {(tbCreateStatus === "pending") ? (
            "…loading…"
          ) : (tbCreateStatus === "error") ? (
            "Error"
          ) : (
            "Deploy"
          )}
        </button>
      )}
    </div>
  );
}
