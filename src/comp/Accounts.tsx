"use client";
import type { UrbitID, TokenHolding, Address } from "@/type/slab";
import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HeroFrame, LoadingFrame, SafeFrame,
  AddressFrame, UrbitIDFrame, TBAFrame,
} from '@/comp/Frames';
import {
  TinyLoadingIcon, TextLoadingIcon,
  ErrorIcon, SendIcon, SignIcon,
} from '@/comp/Icons';
import {
  useTokenboundAccount, useSafeAccount, useSafeProposals, useDeployerTax,
  useTokenboundCreateMutation, useTokenboundSendMutation,
  usePDOSendMutation, usePDOSignMutation, usePDOExecMutation, usePDOLaunchMutation,
} from '@/hook/web3';
import { trimAddress, formatToken, hasClanBoon } from '@/lib/util';
import { formatUnits } from 'viem';
import { MATH, REGEX } from '@/dat/const';

export function SafeAccountInfo({
  urbitID,
}: {
  urbitID: UrbitID;
}): React.ReactNode {
  const safeAccount = useSafeAccount(urbitID);
  const pdoAccount = useTokenboundAccount(urbitID);

  return (
    <LoadingFrame title={""} status={safeAccount && pdoAccount}>
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
    </LoadingFrame>
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
            {Object.entries(tbAccount.holdings).sort(([a, ], [b, ]) => (
              a.localeCompare(b)
            )).map(([, {token: {name, symbol, decimals}, balance}]: [string, TokenHolding]) => (
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
  const [useMaxSupply, setUseMaxSupply] = useState<boolean>(false);

  const idAccount = useTokenboundAccount(urbitID);
  const pdoAccount = useTokenboundAccount(urbitPDO);
  const pdoProposals = useSafeProposals(urbitPDO);
  const twDeployerTax = useDeployerTax();

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

  const TransactionRow = useCallback(({
      children,
      title,
      className,
    } : {
      children: React.ReactNode;
      title?: string;
      className?: string;
    }) => (
      <div className={`flex flex-row justify-between gap-2 ${className ?? ""}`}>
        <span className="whitespace-nowrap font-semibold">{title ?? "<unknown>"}</span>
        {children}
      </div>
  ), []);

  const toggleMaxSupply = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseMaxSupply(event.target.checked);
  }, [setUseMaxSupply]);

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
        max_supply: String(launchData.get("max_supply") ?? MATH.MAX_UINT256),
      });
    }
  }, [pdoLaunchMutate]);

  return (
    <LoadingFrame title={""} status={idAccount && pdoAccount}>
      {(!!idAccount && !!pdoAccount && pdoAccount.deployed) && (
        <div className="main">
          <form ref={sendFormRef} className="flex flex-col gap-2">
            <h2 className="text-2xl">
              PDO Account
            </h2>
            <ul>
              {Object.entries(pdoAccount.holdings).sort(([a, ], [b, ]) => (
                a.localeCompare(b)
              )).map(([, {token: {name, symbol, decimals}, balance}]: [string, TokenHolding]) => (
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
                {(!!pdoAccount.token) && (
                  <option value={pdoAccount.token.address}>
                    {pdoAccount.token.name}
                  </option>
                )}
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
              <ul className="list-disc">
                <li>
                  <span className="font-bold">name: </span>
                  <span>{pdoAccount.token.name}</span>
                </li>
                <li>
                  <span className="font-bold">symbol: </span>
                  <span>${pdoAccount.token.symbol}</span>
                </li>
                <li>
                  <span className="font-bold">contract: </span>
                  <AddressFrame address={pdoAccount.token.address} />
                </li>
              </ul>
            ) : (
              <div className="flex flex-col gap-2">
                <input type="text" name="name" required
                  placeholder={`name (e.g. ${urbitPDO.patp} token)`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="input-lg"
                />
                <input type="text" name="symbol" required
                  placeholder={`symbol (e.g. ${urbitPDO.patp.slice(1).toUpperCase()})`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="input-lg"
                />
                <input type="number" name="init_supply" required
                  min="0.0001" max="100000000" step="0.0001"
                  placeholder="supply (e.g. 1000000)"
                  className="input-lg"
                />
                <div className="flex flex-row items-center gap-2">
                  <input type="checkbox" name="use_max_supply"
                    checked={useMaxSupply}
                    onChange={toggleMaxSupply}
                  />
                  <span>set max supply?</span>
                </div>
                <input type="number" name="max_supply" required={useMaxSupply}
                  min="0.0001" max="100000000" step="0.0001"
                  placeholder="max supply"
                  className={useMaxSupply ? "input-lg" : "hidden"}
                />
                {/* NOTE: Attempting to launch a token for a planet causes
                    problems in debug mode, so we disable the button in
                    these cases.
                */}
                <button
                  disabled={
                    !hasClanBoon(urbitPDO, "star")
                    || (pdoLaunchStatus === "pending")
                  }
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
            {(pdoProposals === undefined || twDeployerTax === undefined) ? (
              <TinyLoadingIcon />
            ) : (pdoProposals === null || twDeployerTax === null) ? (
              <div>error</div>
            ) : (pdoProposals.length === 0) ? (
              <div>(no proposals found)</div>
            ) : (
              <div className="min-w-96 w-full flex flex-col items-center gap-2">
                {pdoProposals.map(({safeTxHash, transaction, confirmations, confirmationsRequired}) => {
                  const confirms = (confirmations ?? []);
                  return (
                    <div
                      key={safeTxHash}
                      className="w-full flex flex-row border-2 border-white rounded-md gap-2 p-3"
                    >
                      <div className="w-7/12 flex flex-col gap-2 items-center">
                        <span className="font-bold underline">
                          {(transaction.type === "transfer") ? (
                            "Transfer Token"
                          ) : (transaction.type === "launch") ? (
                            "Launch Token"
                          ) : (
                            "Execute Transaction"
                          )}
                        </span>
                        <div className="w-full h-full flex flex-col gap-1 justify-center text-sm">
                          {(transaction.type === "transfer") ? (
                            <TransactionRow
                              title={formatToken(transaction.amount, transaction.token)}
                            >
                              <TBAFrame address={transaction.to} short={true} />
                            </TransactionRow>
                          ) : (transaction.type === "launch") ? (
                            <>
                              <TransactionRow title="Mint Total">
                                {formatToken(transaction.amount, transaction.token)}
                              </TransactionRow>
                              <TransactionRow title="Protocol Fee">
                                {twDeployerTax.fee.toFixed(2)}%
                              </TransactionRow>
                              <TransactionRow title="PDO Receives">
                                {
                                  formatToken(
                                    transaction.amount - (transaction.amount / BigInt(twDeployerTax.fee)),
                                    transaction.token,
                                  )
                                }
                              </TransactionRow>
                            </>
                          ) : (
                            <AddressFrame
                              address={(safeTxHash as Address)}
                              type="signature"
                              className="italic"
                            />
                          )}
                        </div>
                      </div>
                      <div className="w-5/12 flex flex-col gap-2 pl-2 border-l border-white">
                        <h4 className="font-medium">
                          Signed by ({confirms.length} / {confirmationsRequired}):
                        </h4>
                        <ul>
                          {confirms.map(({owner}) => (
                            <li key={owner}>
                              <TBAFrame address={(owner as Address)} short={true} className="text-sm" />
                            </li>
                          ))}
                        </ul>
                        <hr />
                        {(confirms.length >= confirmationsRequired) ? (
                          <button type="button"
                            data-hash={safeTxHash}
                            onClick={onExec}
                            disabled={pdoExecStatus === "pending"}
                            className="w-full button-lg"
                          >
                            {(pdoExecStatus === "pending") ? (
                              <TinyLoadingIcon />
                            ) : (pdoExecStatus === "error") ? (
                              "Error!"
                            ) : (
                              "Execute"
                            )}
                          </button>
                        ) : (
                          <button type="button"
                            data-hash={safeTxHash}
                            onClick={onSign}
                            disabled={
                              confirms.some(({owner}) => owner === idAccount?.address)
                              || (pdoSignStatus === "pending")
                            }
                            className="w-full button-lg"
                          >
                            {(pdoSignStatus === "pending") ? (
                              <TinyLoadingIcon />
                            ) : (pdoSignStatus === "error") ? (
                              "Error!"
                            ) : (
                              "Sign"
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </LoadingFrame>
  );
}
