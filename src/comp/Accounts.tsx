"use client";
import type { UrbitID, TokenHolding, Address } from "@/type/slab";
import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useTokenboundAccount, useSafeAccount,
  useTokenboundCreateMutation, useTokenboundSendMutation,
} from '@/hook/web3';
import { AddressFrame } from '@/comp/Frames';
import { TinyLoadingIcon, TextLoadingIcon } from '@/comp/Icons';
import { trimAddress } from '@/lib/util';
import { formatUnits } from 'viem';
import { REGEX } from '@/dat/const';

export function SafeAccountInfo({
  urbitID,
}: {
  urbitID: UrbitID;
}): React.ReactNode {
  const safeAccount = useSafeAccount(urbitID);

  return (
    <div className="main">
      {!!safeAccount && (
        <form className="flex flex-col gap-2">
          <h2 className="text-2xl">
            PDO Information
          </h2>
          <ul className="list-disc">
            <li>
              <span className="font-bold">vault: </span>
              <AddressFrame address={(safeAccount.address as Address)} />
            </li>
            <li>
              <span className="font-bold">threshold: </span>
              <span>{safeAccount.threshold} / {safeAccount.owners.length}</span>
            </li>
            <li>
              <span className="font-bold">managers: </span>
              <ul className="list-disc pl-4">
                {safeAccount.owners.map((owner: string, index: number) => (
                  <li key={owner}>
                    <code className="font-bold">{safeAccount.ownurs[index].patp}: </code>
                    <AddressFrame address={(owner as Address)} />
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </form>
      )}
    </div>
  );
}

export function TokenboundAccountInfo({
  urbitID,
}: {
  urbitID: UrbitID;
}): React.ReactNode {
  const router = useRouter();
  const tbAccount = useTokenboundAccount(urbitID);
  const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(
    urbitID,
    // TODO: Consider adding a loading indicator while the account is being launched
    // { onSuccess: () => dismiss() },
  );
  const { mutate: tbSendMutate, status: tbSendStatus } = useTokenboundSendMutation(
    urbitID,
    // TODO: Consider adding a loading indicator while the account is being launched
    // { onSuccess: () => dismiss() },
  );

  const onSend = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const sendData = new FormData((event.target as HTMLButtonElement).form ?? undefined);
    tbSendMutate({
      token: String(sendData.get("token") ?? "ETH"),
      recipient: String(sendData.get("recipient") ?? urbitID.patp),
      amount: Number(sendData.get("amount") ?? 0),
    });
  }, [tbSendMutate]);

  return (
    <div className="main">
      <ul className="list-disc">
        <li>
          <span className="font-bold">urbit id: </span>
          <span>{urbitID.patp}</span>
        </li>
        <li>
          <span className="font-bold">point type: </span>
          <span>{urbitID.clan}</span>
        </li>
        <li>
          <span className="font-bold">point number: </span>
          <span>{urbitID.id}</span>
        </li>
        <li>
          <div className="flex flex-row items-center gap-2">
            <span className="font-bold">has tba?: </span>
            {!tbAccount ? (
              <TextLoadingIcon />
            ) : !tbAccount.deployed ? (
              <span>No</span>
            ) : (
              <AddressFrame address={tbAccount.address} />
            )}
          </div>
        </li>
      </ul>
      {(!!tbAccount && !tbAccount.deployed) && (
        <button
          disabled={(tbCreateStatus === "pending")}
          onClick={tbCreateMutate}
          className="w-full button-lg"
        >
          {(tbCreateStatus === "pending") ? (
            <TinyLoadingIcon />
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
              disabled={(tbSendStatus === "pending")}
              onClick={onSend}
              className="w-full button-lg"
            >
              {(tbSendStatus === "pending") ? (
                <TinyLoadingIcon />
              ) : (tbSendStatus === "error") ? (
                "error"
              ) : (
                "send"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
