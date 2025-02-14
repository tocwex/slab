"use client";
import type { UrbitID, Address, Token, TokenHolding } from "@/type/slab";
import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SingleSelector } from '@/comp/Selector';
import {
  HeroFrame, LoadingFrame, SafeFrame,
  AddressFrame, UrbitIDFrame, TBAFrame,
} from '@/comp/Frames';
import {
  TinyLoadingIcon, TextLoadingIcon,
  ErrorIcon, SendIcon, SignIcon,
} from '@/comp/Icons';
import {
  useTokenboundAccount, useSafeAccount, useSafeProposals, useUrbitAccount,
  useDeployerTax, useSyndicateTax,
  useTokenboundCreateMutation, useTokenboundSendMutation,
  usePDOSendMutation, usePDOSignMutation, usePDOExecMutation,
  usePDOMintMutation, usePDOLaunchMutation,
} from '@/hook/web3';
import { useLocalTokens, useTokensAddMutation } from '@/hook/local';
import {
  trimAddress, hasClanBoon, parseForm, formUrbitID,
  coerceBigInt, applyTax, includeTax, forceUrbitID,
  formatTax, formatToken, formatFloat, formatUint,
} from '@/lib/util';
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
    <LoadingFrame title={"Multisig Information"} size="md" status={safeAccount && pdoAccount}>
      <div className="main">
        {(!!safeAccount && !!pdoAccount) && (
          <form className="flex flex-col gap-2">
            <h2 className="text-2xl">
              Multisig Information
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
  const localTokens = useLocalTokens();
  const sendFormRef = useRef<HTMLFormElement>(null);

  const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(urbitID);
  const { mutate: tbSendMutate, status: tbSendStatus } = useTokenboundSendMutation(
    urbitID,
    { onSuccess: () => sendFormRef.current?.reset() },
  );

  const onSend = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      recipient: urbitID.patp,
      token: "ETH",
      amount: "0",
    });
    fields && tbSendMutate(fields);
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
          <span>{formatUint(urbitID.id)}</span>
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
        <button type="button"
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
      {(!!tbAccount && !!localTokens && tbAccount.deployed) && (
        <>
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
                  <code>{formatFloat(formatUnits(balance, decimals))}</code>
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
              <SingleSelector name="token" required={true}
                placeholder="currency"
                className="w-full"
                options={[
                  { value: 'ETH', label: 'ethereum' },
                  { value: 'USDC', label: 'usdc' },
                  ...(Object.entries(localTokens).map(
                    ([addr, token]: [string, Token]) => ({
                      value: addr,
                      label: token.name,
                    })
                  )),
                ]}
              />
              <input type="number" name="amount" required
                min="0" max="100000000" step="0.0001"
                placeholder="amount"
                className="input-lg"
              />
              <button type="button"
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
          <AddTokenModule />
        </>
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
  const mintFormRef = useRef<HTMLFormElement>(null);
  const [useMaxSupply, setUseMaxSupply] = useState<boolean>(false);
  const [mintData, setMintData] = useState<[string, string][]>([["", ""]]);

  const localTokens = useLocalTokens();
  const idAccount = useTokenboundAccount(urbitID);
  const pdoAccount = useTokenboundAccount(urbitPDO);
  const pdoProposals = useSafeProposals(urbitPDO);
  const twDeployerTax = useDeployerTax();
  const twSyndicateTax = useSyndicateTax(urbitPDO);

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
  const { mutate: pdoMintMutate, status: pdoMintStatus } = usePDOMintMutation(
    urbitID, urbitPDO,
    {
      onSuccess: () => {
        mintFormRef.current?.reset();
        setMintData([["", ""]]);
      },
    },
  );

  const mintTotal = useMemo(() => {
    const mintBigInts = mintData.map(([amount, recipient]) => coerceBigInt(amount));
    const mintTotal = mintBigInts.reduce((mintValue, [mintBigInt, mintDecimals]) => {
      const mintShift = (pdoAccount?.token?.decimals ?? 18) - mintDecimals;
      return mintValue + (mintBigInt * BigInt(10) ** BigInt(mintShift));
    }, BigInt(0));
    return mintTotal;
  }, [mintData, pdoAccount]);

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
  const addMintDatum = useCallback(() => (
    setMintData(mintData.concat([["", ""]]))
  ), [mintData, setMintData]);

  const MintInput = useCallback(({
    mintData,
    setMintData,
    id,
    ...props
  }: {
    mintData: [string, string][];
    setMintData: (s: [string, string][]) => void;
  } & React.HTMLAttributes<HTMLDivElement>) => {
    const realID = useMemo(() => Number(id ?? 0), [id]);
    const mintUrbitID = useMemo(() => formUrbitID(
      mintData[realID][1]
    ), [realID, mintData]);

    const urbitAccount = useUrbitAccount(mintUrbitID);
    const tbAccount = useTokenboundAccount(mintUrbitID);
    const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(
      mintUrbitID,
      // FIXME: Dirty way to prompt requery of TBAs after a new one is launched
      { onSuccess: () => setMintData(mintData.splice(0)) },
    );

    const delInput = useCallback(() => (
      setMintData(mintData.toSpliced(realID, 1))
    ), [realID, mintData, setMintData]);

    return (
      <div {...props} className="w-full flex flex-row justify-between items-center gap-2">
        <input type="text" name={`recipient-${id}`} required
          placeholder="urbit id"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={mintData[realID][1]}
          onChange={e => setMintData(
            mintData.toSpliced(realID, 1, [mintData[realID][0], e.target.value])
          )}
          pattern={REGEX.AZIMUTH.POINT}
          className="input-lg"
        />
        <input type="number" name={`amount-${id}`} required
          min="0.0001" max="100000000" step="0.0001"
          placeholder="amount"
          value={mintData[realID][0]}
          onChange={e => setMintData(
            mintData.toSpliced(realID, 1, [e.target.value, mintData[realID][1]])
          )}
          className="input-lg"
        />
        <button type="button"
          disabled={(realID === 0)}
          onClick={delInput}
          className="button-sm"
        >
          X
        </button>
        <button type="button"
          disabled={
            !tbAccount
            || !urbitAccount
            || !!tbAccount.deployed
            || (urbitAccount.layer !== "l1")
            || (tbCreateStatus === "pending")
          }
          onClick={tbCreateMutate}
          className="button-sm"
        >
          {!mintUrbitID.id ? (
            "Waiting…"
          ) : (tbAccount === undefined || urbitAccount === undefined) ? (
            "Connecting…"
          ) : (tbAccount === null || urbitAccount === null) ? (
            "Disconnected!"
          ) : (tbCreateStatus === "pending") ? (
            <TinyLoadingIcon />
          ) : (tbCreateStatus === "error") ? (
            "Error!"
          ) : (urbitAccount.layer !== "l1") ? (
            "Invalid Recipient"
          ) : !tbAccount?.deployed ? (
            "~ Deploy"
          ) : (
            "Ready!"
          )}
        </button>
      </div>
    );
  }, []);

  const onSign = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const signHash = (event.currentTarget as HTMLButtonElement).dataset.hash;
    pdoSignMutate({txHash: (signHash as Address)});
  }, [pdoSignMutate]);

  const onExec = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const execHash = (event.currentTarget as HTMLButtonElement).dataset.hash;
    pdoExecMutate({txHash: (execHash as Address)});
  }, [pdoExecMutate]);

  const onSend = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      token: "ETH",
      recipient: urbitID.patp,
      amount: "0",
    });
    fields && pdoSendMutate(fields);
  }, [pdoSendMutate]);

  const onLaunch = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      name: "",
      symbol: "",
      init_supply: "0",
      max_supply: String(MATH.MAX_UINT256),
    });
    fields && pdoLaunchMutate(fields);
  }, [pdoLaunchMutate]);

  const onMint = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      amounts: mintData.map(([a, r]) => a),
      recipients: mintData.map(([a, r]) => r).map(formUrbitID),
    });
    // FIXME: We do this after parsing the form for better user alerts
    mintData.map(([a, r]) => r).map(forceUrbitID);
    fields && pdoMintMutate(fields);
  }, [pdoMintMutate, mintData]);

  return (
    <LoadingFrame title={"Tokenbound Account"} size="md" status={idAccount && pdoAccount}>
      {(!!idAccount && !!pdoAccount && !!localTokens && pdoAccount.deployed) && (
        <div className="main">
          <form ref={sendFormRef} className="flex flex-col gap-2">
            <h2 className="text-2xl">
              Tokenbound Account
            </h2>
            <ul className="list-disc">
              {Object.entries(pdoAccount.holdings).sort(([a, ], [b, ]) => (
                a.localeCompare(b)
              )).map(([, {token, balance}]: [string, TokenHolding]) => (
                <li key={token.symbol}>{formatToken(balance, token)}</li>
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
              <SingleSelector name="token" required={true}
                placeholder="currency"
                className="w-full"
                options={[
                  { value: 'ETH', label: 'ethereum' },
                  { value: 'USDC', label: 'usdc' },
                  ...(!pdoAccount.token ? [] : [
                    { value: pdoAccount.token.address, label: pdoAccount.token.name },
                  ]),
                  ...(Object.entries(localTokens).map(
                    ([addr, token]: [string, Token]) => ({
                      value: addr,
                      label: token.name,
                    })
                  )),
                ]}
              />
              <input type="number" name="amount" required
                min="0" max="100000000" step="0.0001"
                placeholder="amount"
                className="input-lg"
              />
              <button type="button"
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
          <AddTokenModule />
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl">
              PDO Token
            </h2>
            {(pdoAccount === undefined || twSyndicateTax === undefined) ? (
              <TinyLoadingIcon />
            ) : (pdoAccount === null || twSyndicateTax === null) ? (
              <div>error</div>
            ) : (pdoAccount.token !== undefined) ? (
              <>
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
                <h4 className="text-lg">Mint Tokens</h4>
                <p className="max-w-72">
                  Input the amount of tokens to be received by the
                  recipients.
                </p>
                <form ref={mintFormRef} className="flex flex-col gap-2 items-center">
                  {mintData.map((mintDatum, mintID: number) => (
                    <MintInput key={mintID} id={String(mintID)}
                      mintData={mintData}
                      setMintData={setMintData}
                    />
                  ))}
                  <button type="button"
                    onClick={addMintDatum}
                    className="button-sm"
                  >
                    {"+ Add"}
                  </button>
                  <div className="w-full flex flex-col">
                    <TransactionRow title="Protocol Fee">
                      {formatTax(twSyndicateTax)}
                    </TransactionRow>
                    <TransactionRow title="Total Mint Quantity">
                      {
                        formatToken(
                          includeTax(mintTotal, twSyndicateTax),
                          pdoAccount.token,
                        )
                      }
                    </TransactionRow>
                  </div>
                  <button type="button"
                    disabled={(pdoMintStatus === "pending")}
                    onClick={onMint}
                    className="w-full button-lg"
                  >
                    {(pdoMintStatus === "pending") ? (
                      <TinyLoadingIcon />
                    ) : (pdoMintStatus === "error") ? (
                      "Error!"
                    ) : (
                      "Propose"
                    )}
                  </button>
                </form>
              </>
            ) : (
              <form ref={launchFormRef}  className="flex flex-col gap-2">
                <input type="text" name="name" required
                  placeholder={`name (e.g. ${urbitPDO.patp} token)`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  pattern={REGEX.SYNDICATE.NAME}
                  className="input-lg"
                />
                <input type="text" name="symbol" required
                  placeholder={`symbol (e.g. ${urbitPDO.patp.toUpperCase()})`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  pattern={REGEX.SYNDICATE.TOKEN}
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
                  placeholder="max supply (e.g. 2000000)"
                  className={useMaxSupply ? "input-lg" : "hidden"}
                />
                {/* NOTE: Attempting to launch a token for a planet causes
                    problems in debug mode, so we disable the button in
                    these cases.
                */}
                <button type="button"
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
              </form>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl">
              PDO Proposals
            </h2>
            {(pdoProposals === undefined || twDeployerTax === undefined || twSyndicateTax === undefined) ? (
              <TinyLoadingIcon />
            ) : (pdoProposals === null || twDeployerTax === null || twSyndicateTax === null) ? (
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
                            `Transfer ${formatToken(transaction.amount, transaction.token)}`
                          ) : (transaction.type === "launch") ? (
                            `Launch \$${transaction.token.symbol}`
                          ) : (transaction.type === "mint") ? (
                            `Mint ${formatToken(
                              transaction.transfers.reduce((a, {amount: n}) => a + n, BigInt(0)),
                              transaction.token,
                            )}`
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
                                {formatTax(twDeployerTax)}
                              </TransactionRow>
                              <TransactionRow title="PDO Receives">
                                {
                                  formatToken(
                                    transaction.amount - applyTax(transaction.amount, twDeployerTax),
                                    transaction.token,
                                  )
                                }
                              </TransactionRow>
                            </>
                          ) : (transaction.type === "mint") ? (
                            <>
                              {transaction.transfers.map(({amount, to}) => (
                                <TransactionRow key={to}
                                  title={formatToken(
                                    amount - applyTax(amount, twSyndicateTax),
                                    transaction.token,
                                  )}
                                >
                                  <TBAFrame address={to} short={true} />
                                </TransactionRow>
                              ))}
                              <TransactionRow
                                title={formatToken(
                                  applyTax(
                                    transaction.transfers.reduce((a, {amount: n}) => a + n, BigInt(0)),
                                    twSyndicateTax,
                                  ),
                                  transaction.token,
                                )}
                              >
                                Protocol Fee
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

export function AddTokenModule(): React.ReactNode {
  const [isShown, setIsShown] = useState<boolean>(false);
  const localTokens = useLocalTokens();

  const toggleShown = useCallback(() => setIsShown(!isShown), [isShown, setIsShown]);

  const { mutate: addTokenMutate, status: addTokenStatus } = useTokensAddMutation();
  const onAddToken = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      address: "0x0",
    });
    fields && !!localTokens && !localTokens?.[fields.address] && addTokenMutate(fields);
  }, [localTokens, addTokenMutate]);

  return (
    <form className="flex flex-col items-center gap-2">
      <button type="button" onClick={toggleShown} className="text-xl">
        {isShown ? "- Hide" : "+ More"} Token Options
      </button>
      <div className={`
        flex flex-col items-center gap-2
        ${isShown ? "block" : "hidden"}
      `}>
        <input type="text" name="address" required
          placeholder="erc20 token address"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          pattern={REGEX.ADDRESS}
          className="input-lg"
        />
        <button type="button"
          disabled={(addTokenStatus === "pending")}
          onClick={onAddToken}
          className="w-full button-lg"
        >
          {(addTokenStatus === "pending") ? (
            <TinyLoadingIcon />
          ) : (addTokenStatus === "error") ? (
            "Error!"
          ) : (
            "Add ERC20 Token"
          )}
        </button>
      </div>
    </form>
  );
}
