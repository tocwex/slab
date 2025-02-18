"use client";
import type { UrbitID, Address, Token, TokenHolding } from "@/type/slab";
import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SingleSelector } from '@/comp/Selector';
import {
  HeroFrame, LoadingFrame, WideFrame,
  SafeFrame, AddressFrame, UrbitIDFrame, TBAFrame,
} from '@/comp/Frames';
import {
  CurrencyInput, TextInput, RecipientInput, RecipientTBAInput,
} from '@/comp/Forms';
import {
  TinyLoadingIcon, TextLoadingIcon,
  ClanIcon, AzimuthIcon, ErrorIcon, SendIcon, SignIcon,
} from '@/comp/Icons';
import {
  useTokenboundAccount, useSafeAccount, useSafeProposals, useUrbitAccount,
  useDeployerTax, useSyndicateTax,
  useTokenboundCreateMutation, useTokenboundSendMutation,
  useSyndicateSendMutation, useSyndicateSignMutation, useSyndicateExecMutation,
  useSyndicateMintMutation, useSyndicateLaunchMutation,
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
  const syAccount = useTokenboundAccount(urbitID);

  return (
    <LoadingFrame title={"Multisig Information"} size="md" status={safeAccount && syAccount}>
      <div className="main">
        {(!!safeAccount && !!syAccount) && (
          <form className="flex flex-col gap-2">
            <h2 className="text-2xl">
              Multisig Information
            </h2>
            <ul className="list-disc">
              <li>
                <span className="font-bold">tba: </span>
                <AddressFrame address={(syAccount.address as Address)} />
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

  // console.log(Object.values(tbAccount?.holdings ?? {}).map(({token}) => token.name));
  // console.log(Object.values(localTokens ?? {}).map(token => token.name));

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
      <div className="flex flex-col gap-2">
        <div className="inline-flex flex-row gap-1 items-center">
          <span className="font-bold">point type: </span>
          <span>{urbitID.clan}</span>
          <ClanIcon clan={urbitID.clan} className="w-5 h-5" />
        </div>
        <div className="inline-flex flex-row gap-1 items-center">
          <span className="font-bold">point number: </span>
          <span className="font-mono">{formatUint(urbitID.id)}</span>
          <AzimuthIcon className="w-5 h-5" />
        </div>
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
      </div>
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
              <RecipientInput name="recipient" required />
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
              <CurrencyInput name="amount" required />
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

export function SyndicateAccountInfo({
  urbitID,
  urbitSyndicate,
}: {
  urbitID: UrbitID;
  urbitSyndicate: UrbitID;
}): React.ReactNode {
  const router = useRouter();
  const sendFormRef = useRef<HTMLFormElement>(null);
  const launchFormRef = useRef<HTMLFormElement>(null);
  const mintFormRef = useRef<HTMLFormElement>(null);
  const [useMaxSupply, setUseMaxSupply] = useState<boolean>(false);
  const [mintData, setMintData] = useState<[string, string][]>([["", ""]]);

  const localTokens = useLocalTokens();
  const idAccount = useTokenboundAccount(urbitID);
  const syAccount = useTokenboundAccount(urbitSyndicate);
  const syProposals = useSafeProposals(urbitSyndicate);
  const twDeployerTax = useDeployerTax();
  const twSyndicateTax = useSyndicateTax(urbitSyndicate);

  const { mutate: sySignMutate, status: sySignStatus } = useSyndicateSignMutation(urbitID, urbitSyndicate);
  const { mutate: syExecMutate, status: syExecStatus } = useSyndicateExecMutation(urbitSyndicate);
  const { mutate: sySendMutate, status: sySendStatus } = useSyndicateSendMutation(
    urbitID, urbitSyndicate,
    { onSuccess: () => sendFormRef.current?.reset() },
  );
  const { mutate: syLaunchMutate, status: syLaunchStatus } = useSyndicateLaunchMutation(
    urbitID, urbitSyndicate,
    { onSuccess: () => launchFormRef.current?.reset() },
  );
  const { mutate: syMintMutate, status: syMintStatus } = useSyndicateMintMutation(
    urbitID, urbitSyndicate,
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
      const mintShift = (syAccount?.token?.decimals ?? 18) - mintDecimals;
      return mintValue + (mintBigInt * BigInt(10) ** BigInt(mintShift));
    }, BigInt(0));
    return mintTotal;
  }, [mintData, syAccount]);

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
  }: React.ComponentProps<"div"> & {
    mintData: [string, string][];
    setMintData: (s: [string, string][]) => void;
  }) => {
    const realID = useMemo(() => Number(id ?? 0), [id]);
    const value = useMemo(() => mintData[realID][1], [mintData, realID]);

    const delInput = useCallback(() => (
      setMintData(mintData.toSpliced(realID, 1))
    ), [realID, mintData, setMintData]);

    return (
      <div {...props} className="w-full flex flex-row justify-between items-center gap-1">
        <div className="flex flex-col gap-1">
          <RecipientTBAInput name={`recipient-${id}`} required
            value={value}
            onChange={e => setMintData(
              mintData.toSpliced(realID, 1, [mintData[realID][0], e.target.value])
            )}
          />
          <CurrencyInput name={`amount-${id}`} required
            className="input-sm"
            value={mintData[realID][0]}
            onChange={e => setMintData(
              mintData.toSpliced(realID, 1, [e.target.value, mintData[realID][1]])
            )}
          />
        </div>
        <button type="button"
          disabled={mintData.length < 2}
          onClick={delInput}
          className="button-sm"
        >
          ❌
        </button>
      </div>
    );
  }, []);

  const onSign = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const signHash = (event.currentTarget as HTMLButtonElement).dataset.hash;
    sySignMutate({txHash: (signHash as Address)});
  }, [sySignMutate]);

  const onExec = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const execHash = (event.currentTarget as HTMLButtonElement).dataset.hash;
    syExecMutate({txHash: (execHash as Address)});
  }, [syExecMutate]);

  const onSend = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      token: "ETH",
      recipient: urbitID.patp,
      amount: "0",
    });
    fields && sySendMutate(fields);
  }, [sySendMutate]);

  const onLaunch = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      name: "",
      symbol: "",
      init_supply: "0",
      max_supply: String(MATH.MAX_UINT256),
    });
    fields && syLaunchMutate(fields);
  }, [syLaunchMutate]);

  const onMint = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      amounts: mintData.map(([a, r]) => a),
      recipients: mintData.map(([a, r]) => r).map(formUrbitID),
    });
    // FIXME: We do this after parsing the form for better user alerts
    mintData.map(([a, r]) => r).map(forceUrbitID);
    fields && syMintMutate(fields);
  }, [syMintMutate, mintData]);

  return (
    <LoadingFrame title={"Tokenbound Account"} size="md" status={idAccount && syAccount}>
      {(!!idAccount && !!syAccount && !!localTokens && syAccount.deployed) && (
        <div className="main">
          <form ref={sendFormRef} className="flex flex-col gap-2">
            <h2 className="text-2xl">
              Tokenbound Account
            </h2>
            <ul className="list-disc">
              {Object.entries(syAccount.holdings).sort(([a, ], [b, ]) => (
                a.localeCompare(b)
              )).map(([, {token, balance}]: [string, TokenHolding]) => (
                <li key={token.symbol}>
                  <span className="font-bold">{token.name}: </span>
                  <code>{formatFloat(formatUnits(balance, token.decimals))}</code>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <RecipientInput name="recipient" required />
              <SingleSelector name="token" required={true}
                placeholder="currency"
                className="w-full"
                options={[
                  { value: 'ETH', label: 'ethereum' },
                  { value: 'USDC', label: 'usdc' },
                  ...(!syAccount.token ? [] : [
                    { value: syAccount.token.address, label: syAccount.token.name },
                  ]),
                  ...(Object.entries(localTokens).map(
                    ([addr, token]: [string, Token]) => ({
                      value: addr,
                      label: token.name,
                    })
                  )),
                ]}
              />
              <CurrencyInput name="amount" required />
              <button type="button"
                disabled={(sySendStatus === "pending")}
                onClick={onSend}
                className="w-full button-lg"
              >
                {(sySendStatus === "pending") ? (
                  <TinyLoadingIcon />
                ) : (sySendStatus === "error") ? (
                  "Error!"
                ) : (
                  "Propose Send"
                )}
              </button>
            </div>
          </form>
          <AddTokenModule />
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl">
              Syndicate Token
            </h2>
            {(syAccount === undefined || twSyndicateTax === undefined) ? (
              <TinyLoadingIcon />
            ) : (syAccount === null || twSyndicateTax === null) ? (
              <div>error</div>
            ) : (syAccount.token !== undefined) ? (
              <>
                <ul className="list-disc">
                  <li>
                    <span className="font-bold">name: </span>
                    <span>{syAccount.token.name}</span>
                  </li>
                  <li>
                    <span className="font-bold">symbol: </span>
                    <span>${syAccount.token.symbol}</span>
                  </li>
                  <li>
                    <span className="font-bold">contract: </span>
                    <AddressFrame address={syAccount.token.address} />
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
                    <WideFrame title="Protocol Fee">
                      {formatTax(twSyndicateTax)}
                    </WideFrame>
                    <WideFrame title="Total Mint Quantity">
                      {
                        formatToken(
                          includeTax(mintTotal, twSyndicateTax),
                          syAccount.token,
                        )
                      }
                    </WideFrame>
                  </div>
                  <button type="button"
                    disabled={(syMintStatus === "pending")}
                    onClick={onMint}
                    className="w-full button-lg"
                  >
                    {(syMintStatus === "pending") ? (
                      <TinyLoadingIcon />
                    ) : (syMintStatus === "error") ? (
                      "Error!"
                    ) : (
                      "Propose Mint"
                    )}
                  </button>
                </form>
              </>
            ) : (
              <form ref={launchFormRef}  className="flex flex-col gap-2">
                <TextInput name="name" required
                  placeholder={`name (e.g. ${urbitSyndicate.patp} token)`}
                  pattern={REGEX.SYNDICATE.NAME}
                />
                <TextInput name="symbol" required
                  placeholder={`symbol (e.g. ${urbitSyndicate.patp.toUpperCase()})`}
                  pattern={REGEX.SYNDICATE.TOKEN}
                />
                <CurrencyInput name="init_supply" required
                  placeholder="supply (e.g. 1000000)"
                />
                <div className="flex flex-row items-center gap-2">
                  <input type="checkbox" name="use_max_supply"
                    checked={useMaxSupply}
                    onChange={toggleMaxSupply}
                  />
                  <span>set max supply?</span>
                </div>
                <CurrencyInput name="max_supply" required={useMaxSupply}
                  placeholder="max supply (e.g. 2000000)"
                  className={useMaxSupply ? "input-lg" : "hidden"}
                />
                {/* NOTE: Attempting to launch a token for a planet causes
                    problems in debug mode, so we disable the button in
                    these cases.
                */}
                <button type="button"
                  disabled={
                    !hasClanBoon(urbitSyndicate, "star")
                    || (syLaunchStatus === "pending")
                  }
                  onClick={onLaunch}
                  className="w-full button-lg"
                >
                  {(syLaunchStatus === "pending") ? (
                    <TinyLoadingIcon />
                  ) : (syLaunchStatus === "error") ? (
                    "Error!"
                  ) : (
                    "Propose Launch"
                  )}
                </button>
              </form>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl">
              Syndicate Proposals
            </h2>
            {(syProposals === undefined || twDeployerTax === undefined || twSyndicateTax === undefined) ? (
              <TinyLoadingIcon />
            ) : (syProposals === null || twDeployerTax === null || twSyndicateTax === null) ? (
              <div>error</div>
            ) : (syProposals.length === 0) ? (
              <div>(no proposals found)</div>
            ) : (
              <div className="min-w-96 w-full flex flex-col items-center gap-2">
                {syProposals.map(({safeTxHash, transaction, confirmations, confirmationsRequired}) => {
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
                            <WideFrame
                              title={formatToken(transaction.amount, transaction.token)}
                            >
                              <TBAFrame address={transaction.to} short={true} />
                            </WideFrame>
                          ) : (transaction.type === "launch") ? (
                            <>
                              <WideFrame title="Mint Total">
                                {formatToken(transaction.amount, transaction.token)}
                              </WideFrame>
                              <WideFrame title="Protocol Fee">
                                {formatTax(twDeployerTax)}
                              </WideFrame>
                              <WideFrame title="Syndicate Receives">
                                {
                                  formatToken(
                                    transaction.amount - applyTax(transaction.amount, twDeployerTax),
                                    transaction.token,
                                  )
                                }
                              </WideFrame>
                            </>
                          ) : (transaction.type === "mint") ? (
                            <>
                              {transaction.transfers.map(({amount, to}) => (
                                <WideFrame key={to}
                                  title={formatToken(
                                    amount - applyTax(amount, twSyndicateTax),
                                    transaction.token,
                                  )}
                                >
                                  <TBAFrame address={to} short={true} />
                                </WideFrame>
                              ))}
                              <WideFrame
                                title={formatToken(
                                  applyTax(
                                    transaction.transfers.reduce(
                                      (a, {amount: n}) => a + n, BigInt(0)
                                    ),
                                    twSyndicateTax,
                                  ),
                                  transaction.token,
                                )}
                              >
                                Protocol Fee
                              </WideFrame>
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
                            disabled={syExecStatus === "pending"}
                            className="w-full button-lg"
                          >
                            {(syExecStatus === "pending") ? (
                              <TinyLoadingIcon />
                            ) : (syExecStatus === "error") ? (
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
                              || (sySignStatus === "pending")
                            }
                            className="w-full button-lg"
                          >
                            {(sySignStatus === "pending") ? (
                              <TinyLoadingIcon />
                            ) : (sySignStatus === "error") ? (
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
  const addFormRef = useRef<HTMLFormElement>(null);
  const [isShown, setIsShown] = useState<boolean>(false);
  const localTokens = useLocalTokens();

  const toggleShown = useCallback(() => setIsShown(!isShown), [isShown, setIsShown]);

  const { mutate: addTokenMutate, status: addTokenStatus } = useTokensAddMutation({
    onSuccess: () => addFormRef.current?.reset(),
  });
  const onAddToken = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      address: "0x0",
    });
    fields && !!localTokens && !localTokens?.[fields.address] && addTokenMutate(fields);
  }, [localTokens, addTokenMutate, addFormRef]);

  return (
    <form ref={addFormRef} className="flex flex-col items-center gap-2">
      <button type="button" onClick={toggleShown} className="text-xl">
        {isShown ? "- Hide" : "+ More"} Token Options
      </button>
      <div className={`
        flex flex-col items-center gap-2
        ${isShown ? "block" : "hidden"}
      `}>
        <TextInput name="address" required
          placeholder="erc20 token address"
          pattern={REGEX.ADDRESS}
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
