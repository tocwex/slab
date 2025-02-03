"use client";
import type { Address, UrbitID } from "@/type/slab";
import { useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRouteUrbitID } from '@/hook/app';
import { useSafeAccount, useTokenboundAccount } from '@/hook/web3';
import { useWalletUrbitTBAs } from '@/hook/wallet';
import { HeroFrame, LoadingFrame, UrbitIDFrame } from '@/comp/Frames';
import { TokenboundAccountInfo } from '@/comp/Accounts';
import { HugeLoadingIcon } from '@/comp/Icons';
import { formUrbitID, hasClanBoon } from '@/lib/util';
import { APP, REGEX } from '@/dat/const';
import * as ob from "urbit-ob";

export default function NewPage(): React.ReactNode {
  const router = useRouter();
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);

  const walletTBAs = useWalletUrbitTBAs();
  const pdoMultisig = useSafeAccount(routeID);
  const walletOwnerTBAs: Record<Address, UrbitID> = useMemo(() => {
    const tbas: Record<Address, UrbitID> = walletTBAs ?? {};
    const owners: Address[] = ((pdoMultisig?.owners ?? []) as Address[]);
    const ownerTBAs = Array.from(new Set(owners).intersection(new Set(Object.keys(tbas))));
    return Object.fromEntries(ownerTBAs.map((tba) => ([tba, tbas[tba]])));
  }, [walletTBAs, pdoMultisig]);

  useEffect(() => {
    const walletOwnerUIDs = Object.values(walletOwnerTBAs);
    if (!!walletTBAs && walletOwnerUIDs.length === 1) {
      router.push(`/id/${walletOwnerUIDs[0].patp}/pdo/${routeID.patp}`);
    }
  }, [router, walletTBAs, walletOwnerTBAs]);

  const gotoUrbitID = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const urbitID: string | undefined = event.target?.value;
    if (!!urbitID) {
      router.push(`/id/${urbitID}/pdo/${routeID.patp}`);
    }
  }, [router]);

  return (
    <LoadingFrame status={pdoMultisig && walletTBAs} error={
      <div className="flex flex-col gap-2 text-center">
        <h4 className="font-medium">
          <span>Unable to load PDO for </span>
          <UrbitIDFrame urbitID={routeID} />
          <span>.</span>
        </h4>
        <h4 className="font-medium">
          Either the Urbit ID isn't a PDO or there were network errors.
        </h4>
      </div>
    }>
      <HeroFrame title="PDO Creation Successful!">
        {(Object.keys(walletOwnerTBAs ?? {}).length === 0) ? (
          <h4 className="font-medium">
            This ID is no longer owned by any of your wallets.
          </h4>
        ) : (Object.keys(walletOwnerTBAs ?? {}).length === 1) ? (
          <>
            <h4 className="font-medium">
              Redirecting to the PDO ownership page...
            </h4>
            <HugeLoadingIcon />
          </>
        ) : (
          <select onChange={gotoUrbitID} className="input-lg">
            <option key="" value="">
              Select Ownership ID
            </option>
            {Object.entries(walletOwnerTBAs ?? {}).map(([tba, uid]: [string, UrbitID]) => (
              <option key={tba} value={uid.patp}>
                {uid.patp}
              </option>
            ))}
          </select>
        )}
      </HeroFrame>
    </LoadingFrame>
  );
}
