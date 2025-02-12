"use client";
import type { Address, UrbitID, TokenHolding } from "@/type/slab";
import { Fragment, useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TokenboundAccountInfo } from '@/comp/Accounts';
import { SafeFrame } from '@/comp/Frames';
import { TinyLoadingIcon } from '@/comp/Icons';
import { SingleSelector, SingleSelection } from '@/comp/Selector';
import { useRouteUrbitID } from '@/hook/app';
import {
  useSafePDOs, useTokenboundAccount,
  useTokenboundCreateMutation, useSafeCreateMutation, usePDOCreateMutation,
} from '@/hook/web3';
import { useLocalSafes } from '@/hook/local';
import { useWalletMeta, useTokenboundClient } from '@/hook/wallet';
import { fetchTBAddress } from '@/lib/web3';
import {
  formUrbitID, forceUrbitID, isValidPDO,
  encodeSet, decodeSet, parseForm,
} from '@/lib/util';
import { REGEX } from '@/dat/const';
import * as ob from "urbit-ob";

export default function IDPage(): React.ReactNode {
  const router = useRouter();
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const routePDOs = useSafePDOs(routeID);
  const tbAccount = useTokenboundAccount(routeID);
  const localSafes = useLocalSafes();
  const [managerNames, setManagerNames] = useState<string[]>([""]);
  const [managerTBAs, setManagerTBAs] = useState<(Address | null)[]>([null]);
  const [isAdvancedShown, setIsAdvancedShown] = useState<boolean>(false);

  useEffect(() => {
    const setNewTBAs = async () => {
      if (!!wallet && !!tbClient) {
        const newTBAs = await Promise.all(managerNames.map((manager: string, idx: number) => {
          const managerID = formUrbitID(manager);
          return !managerID.id
            ? Promise.resolve(null)
            : fetchTBAddress(wallet, tbClient, managerID);
        }));
        setManagerTBAs(newTBAs);
      }
    }
    setNewTBAs();
  }, [wallet, tbClient, managerNames, setManagerTBAs]);

  const deploymentSafe: Address | undefined = useMemo(() => (
    localSafes?.[encodeSet(new Set(managerTBAs))]
  ), [localSafes, managerTBAs]);

  const addManager = useCallback(() => (
    setManagerNames(managerNames.concat([""]))
  ), [managerNames, setManagerNames]);
  const delManager = useCallback((idx: number) => (
    setManagerNames(managerNames.toSpliced(idx, 1))
  ), [managerNames, setManagerNames]);

  const toggleAdvancedShown = useCallback(() => (
    setIsAdvancedShown(!isAdvancedShown)
  ), [isAdvancedShown, setIsAdvancedShown]);

  const goNewPDO = useCallback(() => router.push(`/new/${routeID.patp}`), [router]);
  const goUrbitID = useCallback((selection: SingleSelection) => {
    if (!!selection) {
      router.push(`/id/${routeID.patp}/pdo/${selection.value}`);
    }
  }, [router]);

  const { mutate: safeCreateMutate, status: safeCreateStatus } = useSafeCreateMutation();
  const { mutate: pdoCreateMutate, status: pdoCreateStatus } = usePDOCreateMutation(
    routeID,
    { onSuccess: () => goNewPDO() },
  );

  const onCreateSafe = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      managers: managerNames.map(forceUrbitID),
      threshold: 1,
    });
    fields && safeCreateMutate(fields);
  }, [managerNames, safeCreateMutate]);
  const onCreatePDO = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!!deploymentSafe) {
      const fields = parseForm(event, {
        safe: deploymentSafe,
        managers: managerNames.map(forceUrbitID),
        reset: false,
      });
      fields && pdoCreateMutate(fields);
    }
  }, [managerNames, deploymentSafe, pdoCreateMutate]);

  const PDOManager = useCallback(({
    managerNames,
    setManagerNames,
    id,
    ...props
  }: {
    managerNames: string[];
    setManagerNames: (s: string[]) => void;
  } & React.HTMLAttributes<HTMLDivElement>) => {
    const realID = useMemo(() => Number(id ?? 0), [id]);
    const managerUrbitID = useMemo(() => formUrbitID(
      managerNames[realID]
    ), [realID, managerNames]);
    const tbAccount = useTokenboundAccount(managerUrbitID);
    const { mutate: tbCreateMutate, status: tbCreateStatus } =
      useTokenboundCreateMutation(managerUrbitID);

    const delManager = useCallback(() => (
      setManagerNames(managerNames.toSpliced(realID, 1))
    ), [realID, managerNames, setManagerNames]);

    return (
      <div {...props} className="w-full flex flex-row justify-between items-center gap-2">
        <input type="text" name={`manager-${id}`} required
          placeholder="manager urbit id"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          pattern={REGEX.AZIMUTH.POINT}
          className="input-sm"
          value={managerNames[realID]}
          onChange={e => setManagerNames(managerNames.toSpliced(realID, 1, e.target.value))}
        />
        {(realID > 0) && (
          <button type="button"
            disabled={(tbCreateStatus === "pending")}
            onClick={delManager}
            className="button-sm"
          >
            X
          </button>
        )}
        <button type="button"
          disabled={!tbAccount || !!tbAccount.deployed || (tbCreateStatus === "pending")}
          onClick={tbCreateMutate}
          className="button-sm"
        >
          {!managerUrbitID.id ? (
            "Waiting…"
          ) : !tbAccount ? (
            "Connecting…"
          ) : (tbCreateStatus === "pending") ? (
            <TinyLoadingIcon />
          ) : (tbCreateStatus === "error") ? (
            "Error!"
          ) : !tbAccount?.deployed ? (
            "~ Deploy"
          ) : (
            "Ready!"
          )}
        </button>
      </div>
    );
  }, []);

  return (
    <div className="main">
      <h1 className="text-4xl font-bold underline">
        {routeID.patp} profile
      </h1>
      <form className="flex flex-col items-center gap-2">
        <h2 className="text-2xl">
          Manage PDO
        </h2>
        {(routePDOs === undefined) ? (
          <TinyLoadingIcon />
        ) : (
          <SingleSelector
            onChange={goUrbitID}
            placeholder="Select PDO"
            isClearable={false}
            styles={{container: (s) => ({...s, width: "200px"})}}
            options={(routePDOs ?? []).map(({id, patp, clan}: UrbitID) => (
              { value: patp, label: patp }
            ))}
          />
        )}
      </form>
      <TokenboundAccountInfo urbitID={routeID} />
      {!isValidPDO(routeID) ? (
        <Fragment />
      ) : (
        <form className="flex flex-col items-center gap-2">
          <h2 className="text-2xl">
            Create PDO
          </h2>
          {managerNames.map((managerName: string, managerID: number) => (
            <PDOManager key={managerID} id={String(managerID)}
              managerNames={managerNames}
              setManagerNames={setManagerNames}
            />
          ))}
          <button type="button"
            disabled={managerNames.length >= 10}
            onClick={addManager}
            className="button-sm"
          >
            {!tbAccount ? "Connecting…" : "+ Add"}
          </button>
          <div className="flex flex-row items-center gap-2">
            <input type="number" name="threshold" required
              min="1" max={managerNames.length} step="1"
              placeholder="N"
              className="input-sm"
            />
            <span>of {managerNames.length} signers</span>
          </div>
          {!!deploymentSafe && (
            <>
              <button type="button" onClick={toggleAdvancedShown} className="text-xl">
                {isAdvancedShown ? "- Hide" : "+ Show"} Advanced Options
              </button>
              <div className={`
                flex flex-col items-center gap-2 max-w-72
                ${isAdvancedShown ? "block" : "hidden"}
              `}>
                <p>
                  Checking this box will perform a 'factory reset' and breach
                  continuity of your urbit's networking. If you know what that
                  means, you'll also need to set your networking keys. If you
                  don't know what that means, turn around, because there be
                  dragons here.
                </p>
                <div className="flex flex-row items-center gap-2">
                  <input type="checkbox" name="reset" />
                  <span>reset on creation?</span>
                </div>
              </div>
              <div className="inline-flex flex-row gap-2 text-xl">
                Multisig Available at:
                <SafeFrame address={deploymentSafe ?? "0x0"} />
              </div>
            </>
          )}
          {/* TODO: Add notice that TBA must be deployed first */}
          {!!localSafes && (
            !deploymentSafe ? (
              <button type="button"
                disabled={
                  !tbAccount?.deployed
                  || managerTBAs.some(tba => tba === null)
                  || (safeCreateStatus === "pending")
                }
                onClick={onCreateSafe}
                className="mt-4 button-lg"
              >
                {!tbAccount ? (
                  "Connecting…"
                ) : (safeCreateStatus === "pending") ? (
                  <TinyLoadingIcon />
                ) : (safeCreateStatus === "error") ? (
                  "Error!"
                ) : (
                  "Create Multisig"
                )}
              </button>
            ) : (
              <button type="button"
                disabled={!tbAccount?.deployed || (pdoCreateStatus === "pending")}
                onClick={onCreatePDO}
                className="mt-4 button-lg"
              >
                {!tbAccount ? (
                  "Connecting…"
                ) : (pdoCreateStatus === "pending") ? (
                  <TinyLoadingIcon />
                ) : (pdoCreateStatus === "error") ? (
                  "Error!"
                ) : (
                  "Transfer to Multisig"
                )}
              </button>
            )
          )}
        </form>
      )}
    </div>
  );
}
