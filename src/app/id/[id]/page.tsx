"use client";
import type { UrbitID } from "@/type/slab";
import { useCallback } from 'react';
import Link from "next/link";
import { useRouteUrbitID } from '@/hook/app';
import {
  useTokenboundAccount, useTokenboundCreateMutation, useTokenboundSendMutation,
} from '@/hook/web3';
import { trimAddress } from '@/lib/util';
import { formatUnits } from 'viem';
import { ACCOUNT, REGEX } from '@/dat/const';

export default function IDPage(): React.ReactNode {
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
  const tbAccount = useTokenboundAccount(routeID);
  const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(
    routeID,
    // TODO: Consider adding a loading indicator while the account is being launched
    // { onSuccess: () => dismiss() },
  );
  const { mutate: tbSendMutate, status: tbSendStatus } = useTokenboundSendMutation(
    routeID,
    // TODO: Consider adding a loading indicator while the account is being launched
    // { onSuccess: () => dismiss() },
  );

  const onSend = useCallback(async (event) => {
    event.preventDefault();
    const sendData = new FormData(event.target.form);
    tbSendMutate(Object.fromEntries(sendData));
  }, [tbSendMutate]);

  // TODO: Include button that only appears if there is no TBA, and launches
  // one on click (then refresh page; will need mutate clause for 'useTBA')

  return (
    <div className="main">
      <h1 className="text-4xl font-bold underline">
        {routeID.patp} profile
      </h1>
      <ul className="list-disc">
        <li>
          <span className="font-bold">urbit id: </span>
          <span>{routeID.patp}</span>
        </li>
        <li>
          <span className="font-bold">point type: </span>
          <span>{routeID.clan}</span>
        </li>
        <li>
          <span className="font-bold">point number: </span>
          <span>{routeID.id}</span>
        </li>
        <li>
          <span className="font-bold">has tba?: </span>
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
            "error"
          ) : (
            "deploy"
          )}
        </button>
      )}
      {(!!tbAccount && tbAccount.deployed) && (
        <form className="flex flex-col gap-2">
          <h2 className="text-2xl">
            Tokenbound Account
          </h2>
          <ul>
            {Object.entries(tbAccount.holdings).sort(([a, _], [b, __]) => (
              a.localeCompare(b)
            )).map(([_, {token: {name, symbol, decimals}, balance}]: [string, TokenHolding]) => (
              <li key={symbol}>
                <span className="font-bold">{name}: </span>
                <code>{formatUnits(balance, decimals)}</code>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <input type="text" name="recipient" required
              placeholder="urbit id"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              pattern={REGEX.AZIMUTH.POINT}
              className="input-lg"
            />
            <select required name="token" className="invalid:text-[#969da8] input-lg">
              <option value="">currency</option>
              <option value="ETH">ethereum</option>
              <option value="USDC">usdc</option>
            </select>
            <input type="number" name="amount" required
              min="0" max="100000000" step="0.0001"
              placeholder="amount"
              className="input-lg"
            />
            <button
              onClick={onSend}
              className="mt-4 button-lg"
            >
              {(tbSendStatus === "pending") ? (
                "…loading…"
              ) : (tbSendStatus === "error") ? (
                "error"
              ) : (
                "send"
              )}
            </button>
          </div>
        </form>
      )}
      <form className="flex flex-col gap-2">
        <h2 className="text-2xl">
          Manage PDO
        </h2>
        <div className="flex flex-col gap-2">
          <input type="text" required
            placeholder="urbit id"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            className="input-lg"
          />
          <button className="button-lg">
            access
          </button>
        </div>
      </form>
    </div>
  );
}
