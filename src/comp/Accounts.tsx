"use client";
import type { UrbitID, TokenHolding, Address } from "@/type/slab";
import { useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useTokenboundAccount, useSafeAccount, useSafeProposals,
  useTokenboundCreateMutation, useTokenboundSendMutation,
  usePDOSendMutation, usePDOSignMutation, usePDOExecMutation, usePDOLaunchMutation,
} from '@/hook/web3';
import { AddressFrame, UrbitIDFrame, TBAFrame, SafeFrame } from '@/comp/Frames';
import {
  TinyLoadingIcon, TextLoadingIcon,
  ErrorIcon, SendIcon, SignIcon,
} from '@/comp/Icons';
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
                {safeAccount.owners.map((owner: string) => (
                  <li key={owner}>
                    <TBAFrame address={(owner as Address)} />
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
  const sendFormRef = useRef<HTMLFormElement>(null);
  const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(urbitID);
  const { mutate: tbSendMutate, status: tbSendStatus } = useTokenboundSendMutation(
    urbitID,
    { onSuccess: () => sendFormRef.current?.reset() },
  );

  const onSend = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const sendData = new FormData((event.currentTarget as HTMLButtonElement).form ?? undefined);
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
        <form ref={sendFormRef} className="flex flex-col gap-2">
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
  const sendFormRef = useRef<HTMLFormElement>(null);
  const launchFormRef = useRef<HTMLFormElement>(null);
  const idAccount = useTokenboundAccount(urbitID);
  const pdoAccount = useTokenboundAccount(urbitPDO);
  const pdoProposals = useSafeProposals(urbitPDO);

  const { mutate: pdoSignMutate, status: pdoSignStatus } = usePDOSignMutation(urbitID, urbitPDO);
  const { mutate: pdoExecMutate, status: pdoExecStatus } = usePDOExecMutation(urbitPDO);
  const { mutate: pdoSendMutate, status: pdoSendStatus } = usePDOSendMutation(
    urbitID, urbitPDO,
    { onSuccess: () => sendFormRef.current?.reset() },
  );
  const { mutate: pdoLaunchMutate, status: pdoLaunchStatus } = usePDOLaunchMutation(
    urbitID, urbitPDO,
    { onSuccess: () => launchFormRef.current?.reset() },
  );

  const onSign = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const signHash = (event.currentTarget as HTMLButtonElement).dataset.hash;
    pdoSignMutate({txHash: (signHash as Address)});
  }, [pdoSignMutate]);

  const onExec = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const execHash = (event.currentTarget as HTMLButtonElement).dataset.hash;
    pdoExecMutate({txHash: (execHash as Address)});
  }, [pdoExecMutate]);

  const onSend = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const form = (event.currentTarget as HTMLButtonElement).form ?? undefined;
    if (form?.reportValidity()) {
      const sendData = new FormData(form);
      pdoSendMutate({
        token: String(sendData.get("token") ?? "ETH"),
        recipient: String(sendData.get("recipient") ?? urbitID.patp),
        amount: String(sendData.get("amount") ?? "0"),
      });
    }
  }, [pdoSendMutate]);

  const onLaunch = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const form = (event.currentTarget as HTMLButtonElement).form ?? undefined;
    if (form?.reportValidity()) {
      const launchData = new FormData(form);
      pdoLaunchMutate({
        name: String(launchData.get("name") ?? ""),
        symbol: String(launchData.get("symbol") ?? ""),
        init_supply: String(launchData.get("init_supply") ?? "0"),
        max_supply: String(launchData.get("max_supply") ?? "0"),
      });
    }
  }, [pdoLaunchMutate]);

  return (
    <div>
      {(!!idAccount && !!pdoAccount && pdoAccount.deployed) && (
        <div className="main">
          <form ref={sendFormRef} className="flex flex-col gap-2">
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
          <form ref={launchFormRef} className="flex flex-col gap-2">
            <h2 className="text-2xl">
              PDO Token
            </h2>
            {(pdoAccount === undefined) ? (
              <TinyLoadingIcon />
            ) : (pdoAccount === null) ? (
              <div>error</div>
            ) : (pdoAccount.token !== undefined) ? (
              <div>(TODO: Implement token visualization here!)</div>
            ) : (
              <div className="flex flex-col gap-2">
                <input type="text" name="name" required
                  placeholder="name (e.g. Tocwex Token)"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="input-lg"
                />
                <input type="text" name="symbol" required
                  placeholder="symbol (e.g. $TOCWEX)"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="input-lg"
                />
                <input type="number" name="init_supply" required
                  min="0.0001" max="100000000" step="0.0001"
                  placeholder="initial supply"
                  className="input-lg"
                />
                <input type="number" name="max_supply" required
                  min="0.0001" max="100000000" step="0.0001"
                  placeholder="max supply"
                  className="input-lg"
                />
                <button
                  disabled={(pdoLaunchStatus === "pending")}
                  onClick={onLaunch}
                  className="w-full button-lg"
                >
                  {(pdoLaunchStatus === "pending") ? (
                    <TinyLoadingIcon />
                  ) : (pdoLaunchStatus === "error") ? (
                    "Error!"
                  ) : (
                    "Launch"
                  )}
                </button>
              </div>
            )}
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
                {pdoProposals.map(({safeTxHash, transaction, confirmations, confirmationsRequired}) => {
                  const confirms = (confirmations ?? []);
                  return (
                    <li key={safeTxHash}>
                      {(transaction.type === "transfer") ? (
                        <>
                          <span>
                            Send {
                              formatUnits(transaction.amount, transaction.token.decimals)
                            } ${
                              transaction.token.symbol
                            } to
                          </span>
                          <span> </span>
                          <TBAFrame address={transaction.to} />
                        </>
                      ) : (transaction.type === "launch") ? (
                        <span>
                          Launch token ${transaction.token.symbol} for PDO
                        </span>
                      ) : (
                        <AddressFrame address={(safeTxHash as Address)} type="signature" />
                      )}
                      <span> ({confirms.length} / {confirmationsRequired} signatures) </span>
                      {(confirms.length >= confirmationsRequired) ? (
                        <button type="button" data-hash={safeTxHash} onClick={onExec} className="w-4 h-4">
                          {(pdoExecStatus === "pending") ? (
                            <TextLoadingIcon />
                          ) : (pdoExecStatus === "error") ? (
                            <ErrorIcon />
                          ) : (
                            <SendIcon />
                          )}
                        </button>
                      ) : !confirms.some(({owner}) => owner === idAccount?.address) ? (
                        <button type="button" data-hash={safeTxHash} onClick={onSign} className="w-4 h-4">
                          {(pdoSignStatus === "pending") ? (
                            <TextLoadingIcon />
                          ) : (pdoSignStatus === "error") ? (
                            <ErrorIcon />
                          ) : (
                            <SignIcon />
                          )}
                        </button>
                      ) : null}
                      <ul className="list-disc pl-4">
                        {confirms.map(({owner}) => (
                          <li key={owner}>
                            <TBAFrame address={(owner as Address)} />
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
