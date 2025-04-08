import type { UrbitID, Address, Token, TokenHolding } from "@/type/slab";
import type {
  SlabTransferOperation, SlabLaunchOperation, SlabMintOperation,
  SlabDissolveOperation, SlabTerminateOperation,
} from '@/type/slab';
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { SingleSelector } from '@/comp/Selector';
import {
  LoadingFrame, WideFrame, SafeFrame, AddressFrame, TBAFrame,
} from '@/comp/Frames';
import {
  CurrencyInput, TextInput, RecipientInput, RecipientLauncherInput,
} from '@/comp/Forms';
import {
  TinyLoadingIcon, TextLoadingIcon, ClanIcon, AzimuthIcon,
} from '@/comp/Icons';
import {
  useTokenboundAccount, useSafeAccount, useSyndicateTax, useTokenboundCreateMutation
} from '@/hook/web3';
import { useLocalTokens, useTokensDiffMutation } from '@/hook/local';
import {
  hasClanBoon, parseForm, coerceBigInt, includeTax,
  formatTax, formatToken, formatFloat, formatUint,
} from '@/lib/util';
import { formatUnits } from 'viem';
import { MATH, REGEX } from '@/dat/const';

export function SafeAccountMeta({
  urbitID,
}: {
  urbitID: UrbitID;
}): React.ReactNode {
  const safeAccount = useSafeAccount(urbitID);
  const idAccount = useTokenboundAccount(urbitID);

  return (
    <LoadingFrame title="Multisig Information" size="md" status={safeAccount && idAccount}>
      <div className="main">
        {(!!safeAccount && !!idAccount) && (
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl">
              Multisig Information
            </h2>
            <ul className="list-disc">
              <li>
                <span className="font-bold">tba: </span>
                <AddressFrame address={(idAccount.address as Address)} />
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
          </div>
        )}
      </div>
    </LoadingFrame>
  );
}

export function TokenboundAccountMeta({
  urbitID,
}: {
  urbitID: UrbitID;
}): React.ReactNode {
  const idAccount = useTokenboundAccount(urbitID);
  const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(urbitID);

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
          {!idAccount ? (
            <TextLoadingIcon />
          ) : !idAccount.deployed ? (
            <span>No</span>
          ) : (
            <AddressFrame address={idAccount.address} />
          )}
        </div>
      </div>
      {(!!idAccount && !idAccount.deployed) && (
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
    </div>
  );
}

export function TokenboundAccountTransferModule({
  urbitID,
  transfer,
  status,
}: {
  urbitID: UrbitID;
  transfer: (op: SlabTransferOperation) => Promise<any>;
  status: string;
}): React.ReactNode {
  const formRef = useRef<HTMLFormElement>(null);
  const localTokens = useLocalTokens();
  const idAccount = useTokenboundAccount(urbitID);

  const idTokens: [string, TokenHolding][] = useMemo(() => (
    (!idAccount || !idAccount?.holdings)
      ? ([] as [string, TokenHolding][])
      : Object.entries(idAccount.holdings).sort(([a, ], [b, ]) => {
        const isIdCmp: number = ((cmp) => (cmp(a) - cmp(b)))((s: string): number => (
          Number(s !== idAccount?.token?.symbol)
        ));
        const nameCmp: number = a.localeCompare(b);
        return [isIdCmp, nameCmp].find((n) => (n !== 0)) ?? 0;
      })
  ), [idAccount || {}]);
  const onTransfer = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      to: urbitID.patp,
      amount: "0",
      tokenID: "ETH",
    });
    fields && transfer(fields).then(() => formRef.current?.reset());
  }, [transfer, formRef]);

  return (
    (!!idAccount && !!localTokens && idAccount.deployed) && (
      <div className="flex flex-col gap-2 items-center">
        <form ref={formRef} className="flex flex-col gap-2">
          <h2 className="text-2xl">
            Tokenbound Account
          </h2>
          <ul>
            {idTokens.map(([, {token: {name, address, decimals}, balance}]: [string, TokenHolding]) => (
              <li key={address}>
                <span className="font-bold">{name}: </span>
                <code>{formatFloat(formatUnits(balance, decimals))}</code>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <RecipientInput name="to" required />
            <SingleSelector name="tokenID" required={true}
              placeholder="currency"
              className="w-full"
              options={idTokens.map(([, {token: {name, address}, balance}]: [string, TokenHolding]) => (
                { value: address, label: name }
              ))}
            />
            <CurrencyInput name="amount" required />
            <button type="button"
              disabled={(status === "pending")}
              onClick={onTransfer}
              className="w-full button-lg"
            >
              {(status === "pending") ? (
                <TinyLoadingIcon />
              ) : (status === "error") ? (
                "Error!"
              ) : (
                // TODO: Make this "Propose Transfer" in the Syndicate case
                "Transfer"
              )}
            </button>
          </div>
        </form>
        <AddTokenModule />
      </div>
    )
  );
}

export function SyndicateTokenPropModule({
  urbitID,
  launch,
  launchStatus,
  mint,
  mintStatus,
  dissolve,
  dissolveStatus,
}: {
  urbitID: UrbitID;
  launch: (op: SlabLaunchOperation) => Promise<any>;
  launchStatus: string;
  mint: (op: SlabMintOperation) => Promise<any>;
  mintStatus: string;
  dissolve: () => Promise<any>;
  dissolveStatus: string;
}): React.ReactNode {
  const syAccount = useTokenboundAccount(urbitID);
  const syTax = useSyndicateTax(urbitID);

  return (
    <LoadingFrame title="Syndicate Token" size="md" status={syAccount && syTax}>
      {(!!syAccount && !!syTax) && (
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl">
            {(syAccount.token === undefined) ? "Create" : "Manage"} Syndicate Token
          </h2>
          {(syAccount.token === undefined) ? (
            <LaunchTokenModule urbitID={urbitID} launch={launch} status={launchStatus} />
          ) : (
            <>
              <MintTokenModule urbitID={urbitID} mint={mint} status={mintStatus} />
              <DissolveTokenModule urbitID={urbitID} dissolve={dissolve} status={dissolveStatus} />
            </>
          )}
        </div>
      )}
    </LoadingFrame>
  );
}

function LaunchTokenModule({
  urbitID,
  launch,
  status,
}: {
  urbitID: UrbitID;
  launch: (op: SlabLaunchOperation) => Promise<any>;
  status: string;
}): React.ReactNode {
  const formRef = useRef<HTMLFormElement>(null);
  const [useMaxSupply, setUseMaxSupply] = useState<boolean>(false);

  const syAccount = useTokenboundAccount(urbitID);
  const syTax = useSyndicateTax(urbitID);

  const toggleMaxSupply = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseMaxSupply(event.target.checked);
  }, [setUseMaxSupply]);

  const onLaunch = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      name: "",
      symbol: "",
      init: "0",
      max: String(MATH.MAX_UINT256),
    });
    fields && launch(fields).then(() => formRef.current?.reset());
  }, [launch, formRef]);

  return (
    (!!syAccount && !!syTax && syAccount.deployed && !syAccount.token) && (
      <form ref={formRef} className="flex flex-col gap-2">
        <TextInput name="name" required
          placeholder={`name (e.g. ${urbitID.patp} token)`}
          pattern={REGEX.SYNDICATE.NAME}
        />
        <TextInput name="symbol" required
          placeholder={`symbol (e.g. ${urbitID.patp.toUpperCase()})`}
          pattern={REGEX.SYNDICATE.TOKEN}
        />
        <CurrencyInput name="init" required
          placeholder="supply (e.g. 1000000)"
        />
        <div className="flex flex-row items-center gap-2">
          <input type="checkbox" name="use_max_supply"
            checked={useMaxSupply}
            onChange={toggleMaxSupply}
          />
          <span>set max supply?</span>
        </div>
        <CurrencyInput name="max" required={useMaxSupply}
          placeholder="max supply (e.g. 2000000)"
          className={useMaxSupply ? "input-lg" : "hidden"}
        />
        <button type="button"
          disabled={!hasClanBoon(urbitID, "star") || (status === "pending")}
          onClick={onLaunch}
          className="w-full button-lg"
        >
          {(status === "pending") ? (
            <TinyLoadingIcon />
          ) : (status === "error") ? (
            "Error!"
          ) : (
            "Launch"
          )}
        </button>
      </form>
    )
  );
}

function MintTokenModule({
  urbitID,
  mint,
  status,
}: {
  urbitID: UrbitID;
  mint: (op: SlabMintOperation) => Promise<any>;
  status: string;
}): React.ReactNode {
  const formRef = useRef<HTMLFormElement>(null);
  const [mintData, setMintData] = useState<[string, string][]>([["", ""]]);

  const syAccount = useTokenboundAccount(urbitID);
  const syTax = useSyndicateTax(urbitID);

  const mintTotal = useMemo(() => {
    const mintBigInts = mintData.map(([amount, recipient]) => coerceBigInt(amount));
    const mintTotal = mintBigInts.reduce((mintValue, [mintBigInt, mintDecimals]) => {
      const mintShift = ((syAccount || null)?.token?.decimals ?? 18) - mintDecimals;
      return mintValue + (mintBigInt * BigInt(10) ** BigInt(mintShift));
    }, BigInt(0));
    return mintTotal;
  }, [mintData, syAccount]);

  const addMintDatum = useCallback(() => (
    setMintData(mintData.concat([["", ""]]))
  ), [mintData, setMintData]);

  const MintInput = useCallback(function ({
    mintData,
    setMintData,
    id,
    ...props
  }: React.ComponentProps<"div"> & {
    mintData: [string, string][];
    setMintData: (s: [string, string][]) => void;
  }) {
    const realID = useMemo(() => Number(id ?? 0), [id]);
    const value = useMemo(() => mintData[realID][1], [mintData, realID]);

    const delInput = useCallback(() => (
      setMintData(mintData.toSpliced(realID, 1))
    ), [realID, mintData, setMintData]);

    return (
      <div {...props} className="w-full flex flex-row justify-between items-center gap-1">
        <div className="flex flex-col gap-1">
          <RecipientLauncherInput name={`recipient-${id}`} required
            accepts="any"
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

  const onMint = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      transfers: mintData.map(([a, r]) => ({amount: a, to: r})),
    });
    fields && mint(fields).then(() => {
      formRef.current?.reset();
      setMintData([["", ""]]);
    });
  }, [mint, mintData, setMintData, formRef]);

  return (
    (!!syAccount && !!syTax && syAccount.deployed && !!syAccount.token) && (
      <form ref={formRef} className="flex flex-col gap-2 items-center">
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
          + Add
        </button>
        <div className="w-full flex flex-col">
          <WideFrame title="Protocol Fee">
            {formatTax(syTax)}
          </WideFrame>
          <WideFrame title="Total Mint Quantity">
            {formatToken(includeTax(mintTotal, syTax), syAccount.token)}
          </WideFrame>
        </div>
        <button type="button"
          disabled={(status === "pending")}
          onClick={onMint}
          className="w-full button-lg"
        >
          {(status === "pending") ? (
            <TinyLoadingIcon />
          ) : (status === "error") ? (
            "Error!"
          ) : (
            "Mint"
          )}
        </button>
      </form>
    )
  );
}

function DissolveTokenModule({
  urbitID,
  dissolve,
  status,
}: {
  urbitID: UrbitID;
  dissolve: () => Promise<any>;
  status: string;
}): React.ReactNode {
  const syAccount = useTokenboundAccount(urbitID);

  const onDissolve = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dissolve();
  }, [dissolve]);

  return (
    (!!syAccount && syAccount.deployed && !!syAccount.token) && (
      <div className="flex flex-col gap-2">
        <button type="button"
          disabled={(status === "pending")}
          onClick={onDissolve}
          className="w-full buttoff-lg"
        >
          {(status === "pending") ? (
            <TinyLoadingIcon />
          ) : (status === "error") ? (
            "Error!"
          ) : (
            "Dissolve"
          )}
        </button>
      </div>
    )
  );
}

function AddTokenModule(): React.ReactNode {
  const addFormRef = useRef<HTMLFormElement>(null);
  const [isShown, setIsShown] = useState<boolean>(false);
  const localTokens = useLocalTokens();

  const toggleShown = useCallback(() => setIsShown(!isShown), [isShown, setIsShown]);

  const { mutate: diffTokensMutate, status: diffTokensStatus } = useTokensDiffMutation({
    onSuccess: () => addFormRef.current?.reset(),
  });
  const onAddToken = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      address: "0x0",
    });
    fields && !!localTokens && !localTokens?.[fields.address]
      && diffTokensMutate({ add: [fields.address] });
  }, [localTokens, diffTokensMutate]);

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
          pattern={REGEX.ETHEREUM.ADDRESS}
        />
        <button type="button"
          disabled={(diffTokensStatus === "pending")}
          onClick={onAddToken}
          className="w-full button-lg"
        >
          {(diffTokensStatus === "pending") ? (
            <TinyLoadingIcon />
          ) : (diffTokensStatus === "error") ? (
            "Error!"
          ) : (
            "Add ERC20 Token"
          )}
        </button>
      </div>
    </form>
  );
}
