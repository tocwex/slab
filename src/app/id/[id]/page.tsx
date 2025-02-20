"use client";
import type { Address, UrbitID, UrbitAccount, TokenHolding } from "@/type/slab";
import { Fragment, useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TokenboundAccountInfo } from '@/comp/Accounts';
import { SafeFrame } from '@/comp/Frames';
import { RecipientInput, RecipientLauncherInput } from '@/comp/Forms';
import { TinyLoadingIcon } from '@/comp/Icons';
import { SingleSelector, SingleSelection } from '@/comp/Selector';
import { useRouteUrbitID } from '@/hook/app';
import {
  useSafeSyndicates, useUrbitAccount, useTokenboundAccount,
  useTokenboundCreateMutation, useSafeCreateMutation, useSyndicateCreateMutation,
} from '@/hook/web3';
import { useLocalSafes } from '@/hook/local';
import { useWalletMeta, useTokenboundClient } from '@/hook/wallet';
import { fetchUrbitAccount, fetchTBAddress } from '@/lib/web3';
import {
  formUrbitID, forceUrbitID, isValidSyndicate,
  encodeSet, decodeSet, parseForm,
} from '@/lib/util';
import { REGEX } from '@/dat/const';
import * as ob from "urbit-ob";

export default function IDPage(): React.ReactNode {
  const router = useRouter();
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const routeSyndicates = useSafeSyndicates(routeID);
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
          if (!managerID.id) {
            return Promise.resolve(null);
          } else {
            return Promise.all([
              fetchTBAddress(wallet, tbClient, managerID),
              fetchUrbitAccount(wallet, managerID),
            ]).then(([address, urbitAccount]) => (
              Promise.all([
                Promise.resolve(address),
                Promise.resolve(urbitAccount),
                tbClient.checkAccountDeployment({accountAddress: address}),
              ])
            )).then(([address, urbitAccount, isDeployed]: [Address, UrbitAccount, boolean]) => (
              (!isDeployed || (urbitAccount.layer !== "l1")) ? null : address
            ));
          }
        }));
        setManagerTBAs(newTBAs);
      }
    };
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

  const goNewSyndicate = useCallback(() => router.push(`/new/${routeID.patp}`), [router]);
  const goUrbitID = useCallback((selection: SingleSelection) => {
    if (!!selection) {
      router.push(`/id/${routeID.patp}/sy/${selection.value}`);
    }
  }, [router]);

  const { mutate: safeCreateMutate, status: safeCreateStatus } = useSafeCreateMutation();
  const { mutate: syCreateMutate, status: syCreateStatus } = useSyndicateCreateMutation(
    routeID,
    { onSuccess: () => goNewSyndicate() },
  );

  const onCreateSafe = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const fields = parseForm(event, {
      managers: managerNames.map(forceUrbitID),
      threshold: 1,
    });
    fields && safeCreateMutate(fields);
  }, [managerNames, safeCreateMutate]);
  const onCreateSyndicate = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!!deploymentSafe) {
      const fields = parseForm(event, {
        safe: deploymentSafe,
        managers: managerNames.map(forceUrbitID),
        reset: false,
      });
      fields && syCreateMutate(fields);
    }
  }, [managerNames, deploymentSafe, syCreateMutate]);

  const SyndicateManager = useCallback(({
    managerNames,
    setManagerNames,
    id,
    ...props
  }: React.ComponentProps<"div"> & {
    managerNames: string[];
    setManagerNames: (s: string[]) => void;
  }) => {
    const realID = useMemo(() => Number(id ?? 0), [id]);
    const value = useMemo(() => managerNames[realID], [managerNames, realID]);

    const delManager = useCallback(() => (
      setManagerNames(managerNames.toSpliced(realID, 1))
    ), [realID, managerNames, setManagerNames]);

    return (
      <div {...props} className="w-full flex flex-row justify-between items-center gap-2">
        <RecipientLauncherInput name={`manager-${id}`} required
          accepts="urbit"
          value={value}
          onChange={e => setManagerNames(managerNames.toSpliced(realID, 1, e.target.value))}
        />
        <button type="button"
          disabled={managerNames.length < 2}
          onClick={delManager}
          className="button-sm"
        >
          ❌
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
          Manage Syndicate
        </h2>
        {(routeSyndicates === undefined) ? (
          <TinyLoadingIcon />
        ) : (
          <SingleSelector
            onChange={goUrbitID}
            placeholder="Select Syndicate"
            isClearable={false}
            styles={{container: (s) => ({...s, width: "200px"})}}
            options={(routeSyndicates ?? []).map(({id, patp, clan}: UrbitID) => (
              { value: patp, label: patp }
            ))}
          />
        )}
      </form>
      <TokenboundAccountInfo urbitID={routeID} />
      {!isValidSyndicate(routeID) ? (
        <Fragment />
      ) : (
        <form className="flex flex-col items-center gap-2">
          <h2 className="text-2xl">
            Create Syndicate
          </h2>
          {managerNames.map((managerName: string, managerID: number) => (
            <SyndicateManager key={managerID} id={String(managerID)}
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
                disabled={!tbAccount?.deployed || (syCreateStatus === "pending")}
                onClick={onCreateSyndicate}
                className="mt-4 button-lg"
              >
                {!tbAccount ? (
                  "Connecting…"
                ) : (syCreateStatus === "pending") ? (
                  <TinyLoadingIcon />
                ) : (syCreateStatus === "error") ? (
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
