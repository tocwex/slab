"use client";
import type { UrbitID, TokenHolding, Address } from "@/type/slab";
import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useTokenboundAccount, useSafeAccount, useSafeProposals,
  useTokenboundCreateMutation, useTokenboundSendMutation, usePDOSendMutation,
} from '@/hook/web3';
import { AddressFrame, SafeFrame, UrbitIDFrame } from '@/comp/Frames';
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
  const pdoAccount = useTokenboundAccount(urbitID);

  return (
    <div className="main">
      {(!!safeAccount && !!pdoAccount) && (
        <form className="flex flex-col gap-2">
          <h2 className="text-2xl">
            PDO Information
          </h2>
          <ul className="list-disc">
            <li>
              <span className="font-bold">tba: </span>
              <AddressFrame address={(pdoAccount.address as Address)} />
            </li>
            <li>
              <span className="font-bold">multisig: </span>
              <SafeFrame address={(safeAccount.address as Address)} />
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
                    <UrbitIDFrame urbitID={safeAccount.ownurs[index]} />
                    <span>: </span>
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
  const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(urbitID);
  const { mutate: tbSendMutate, status: tbSendStatus } = useTokenboundSendMutation(urbitID);

  const onSend = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const sendData = new FormData((event.target as HTMLButtonElement).form ?? undefined);
    tbSendMutate({
      token: String(sendData.get("token") ?? "ETH"),
      recipient: String(sendData.get("recipient") ?? urbitID.patp),
      amount: String(sendData.get("amount") ?? "0"),
    });
  }, [tbSendMutate]);

  return (
    <div className="main">
      <ul className="list-disc">
        <li>
          <span className="font-bold">urbit id: </span>
          <UrbitIDFrame urbitID={urbitID} />
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
            "Error!"
          ) : (
            "Deploy"
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
          {/* FIXME: Re-add 'required' to all fields here. */}
          <div className="flex flex-col gap-2">
            <input type="text" name="recipient"
              placeholder="urbit id"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              pattern={REGEX.AZIMUTH.POINT}
              className="input-lg"
            />
            <select name="token" className="invalid:text-[#969da8] input-lg">
              <option value="">currency</option>
              <option value="ETH">ethereum</option>
              <option value="USDC">usdc</option>
            </select>
            <input type="number" name="amount"
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
                "Error!"
              ) : (
                "Send"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function PDOAccountInfo({
  urbitID,
  urbitPDO,
}: {
  urbitID: UrbitID;
  urbitPDO: UrbitID;
}): React.ReactNode {
  const router = useRouter();
  const pdoAccount = useTokenboundAccount(urbitPDO);
  const pdoProposals = useSafeProposals(urbitPDO);
  const { mutate: pdoSendMutate, status: pdoSendStatus } = usePDOSendMutation(urbitID, urbitPDO);

  const onSend = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const sendData = new FormData((event.target as HTMLButtonElement).form ?? undefined);
    // FIXME: Restore the real logic here
    pdoSendMutate({
      // token: String(sendData.get("token") ?? "ETH"),
      // recipient: String(sendData.get("recipient") ?? urbitID.patp),
      // amount: String(sendData.get("amount") ?? "0"),
      token: "ETH",
      recipient: "~sordeg",
      amount: "0.0001",
    });
  }, [pdoSendMutate]);

  return (
    <div>
      {(!!pdoAccount && pdoAccount.deployed) && (
        <div className="main">
          <form className="flex flex-col gap-2">
            <h2 className="text-2xl">
              PDO Account
            </h2>
            <ul>
              {Object.entries(pdoAccount.holdings).sort(([a, _], [b, __]) => (
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
                disabled={(pdoSendStatus === "pending")}
                onClick={onSend}
                className="w-full button-lg"
              >
                {(pdoSendStatus === "pending") ? (
                  <TinyLoadingIcon />
                ) : (pdoSendStatus === "error") ? (
                  "Error!"
                ) : (
                  "Propose"
                )}
              </button>
            </div>
          </form>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl">
              PDO Proposals
            </h2>
            {(pdoProposals === undefined) ? (
              <TinyLoadingIcon />
            ) : (pdoProposals === null) ? (
              <div>error</div>
            ) : (pdoProposals.length === 0) ? (
              <div>(no proposals found)</div>
            ) : (
              <ul className="list-disc">
                {pdoProposals.map(({safeTxHash, to, data, confirmationsRequired, confirmations}) => (
                  <li key={safeTxHash}>
                    <AddressFrame address={(safeTxHash as Address)} type="signature" />
                    <span> ({(confirmations ?? []).length} / {confirmationsRequired} signatures)</span>
                    <ul className="list-disc pl-4">
                      {(confirmations ?? []).map(({owner, signature}) => (
                        <li key={owner}>
                          <AddressFrame address={(owner as Address)} />
                          <span>: </span>
                          <AddressFrame address={(signature as Address)} type="signature" />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
