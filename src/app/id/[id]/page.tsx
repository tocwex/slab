"use client";
import type { UrbitID, TokenHolding } from "@/type/slab";
import { Fragment, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRouteUrbitID } from '@/hook/app';
import {
  useSafePDOs, useTokenboundAccount,
  useTokenboundCreateMutation, usePDOCreateMutation,
} from '@/hook/web3';
import { TokenboundAccountInfo } from '@/comp/Accounts';
import { TinyLoadingIcon } from '@/comp/Icons';
import { formUrbitID, hasClanBoon } from '@/lib/util';
import { APP, REGEX } from '@/dat/const';
import * as ob from "urbit-ob";

export default function IDPage(): React.ReactNode {
  const router = useRouter();
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
  const routePDOs = useSafePDOs(routeID);
  const tbAccount = useTokenboundAccount(routeID);
  const [managerCount, setManagerCount] = useState<number>(1);
  const { mutate: pdoCreateMutate, status: pdoCreateStatus } = usePDOCreateMutation(routeID);

  const addManager = useCallback(() => (
    setManagerCount(managerCount + 1)
  ), [managerCount, setManagerCount]);

  const gotoUrbitID = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const urbitPDO: string | undefined = event.target?.value;
    if (!!urbitPDO) {
      router.push(`/id/${routeID.patp}/pdo/${urbitPDO}`);
    }
  }, [router]);

  const onCreate = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const createData = new FormData((event.target as HTMLButtonElement).form ?? undefined);
    pdoCreateMutate({
      managers: [...Array(managerCount).keys().map((managerID: number) => (
        String(createData.get(`manager-${managerID}`) ?? "")
      ))],
      threshold: Number(createData.get("threshold") ?? "1"),
    });
  }, [managerCount]);

  const PDOManager = useCallback(({id, ...props}: React.HTMLAttributes<HTMLDivElement>) => {
    const [managerName, setManagerName] = useState<string>("");
    const managerUrbitID = useMemo(() => formUrbitID(managerName), [managerName]);
    const tbAccount = useTokenboundAccount(managerUrbitID);
    const { mutate: tbCreateMutate, status: tbCreateStatus } =
      useTokenboundCreateMutation(managerUrbitID);

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
          value={managerName}
          onChange={e => setManagerName(e.target.value)}
        />
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
          <select onChange={gotoUrbitID} className="input-lg">
            <option key="" value="">
              Select PDO
            </option>
            {(routePDOs ?? []).map(({id, patp, clan}: UrbitID) => (
              <option key={id} value={patp}>
                {patp}
              </option>
            ))}
          </select>
        )}
      </form>
      <TokenboundAccountInfo urbitID={routeID} />
      {(!APP.DEBUG && !hasClanBoon(routeID, "star")) ? (
        <Fragment />
      ) : (
        <form className="flex flex-col items-center gap-2">
          <h2 className="text-2xl">
            Create PDO
          </h2>
          {[...Array(managerCount).keys().map((managerID: number) => (
            <PDOManager key={managerID} id={String(managerID)} />
          ))]}
          <button type="button"
            disabled={managerCount >= 10}
            onClick={addManager}
            className="button-sm"
          >
            {!tbAccount ? "Connecting…" : "+ Add"}
          </button>
          <div className="flex flex-row items-center gap-2">
            <input type="number" name="threshold" required
              min="1" max={managerCount} step="1"
              placeholder="N"
              className="input-sm"
            />
            <span>of {managerCount} signers</span>
          </div>
          {/* TODO: Add notice that TBA must be deployed first */}
          <button
            disabled={!tbAccount?.deployed || (pdoCreateStatus === "pending")}
            onClick={onCreate}
            className="mt-4 button-lg"
          >
            {!tbAccount ? (
              "Connecting…"
            ) : (pdoCreateStatus === "pending") ? (
              <TinyLoadingIcon />
            ) : (pdoCreateStatus === "error") ? (
              "Error!"
            ) : (
              "Create"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
