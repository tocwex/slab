import type { Address, UrbitID } from "@/type/slab";
import React, { useEffect, useMemo, useCallback } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useRouteUrbitID } from '@/hook/app';
import { useSafeAccount } from '@/hook/web3';
import { useWalletUrbitTBAs } from '@/hook/wallet';
import { HeroFrame, LoadingFrame, UrbitIDFrame } from '@/comp/Frames';
import { HugeLoadingIcon } from '@/comp/Icons';
import { SingleSelector, SingleSelection } from '@/comp/Selector';
import * as ob from "urbit-ob";

export const Route = createFileRoute('/new/$id')({
  head: ({ params }) => ({
    meta: [
      { title: `%slab | ${params?.id ?? '<unknown>'} -> syndicate` },
    ],
  }),
  component: (): React.ReactNode => {
    const navigate = useNavigate();
    const routeID: UrbitID = (useRouteUrbitID() as UrbitID);

    const walletTBAs = useWalletUrbitTBAs();
    const syMultisig = useSafeAccount(routeID);
    const walletOwnerTBAs: Record<Address, UrbitID> = useMemo(() => {
      const tbas: Record<Address, UrbitID> = walletTBAs || {};
      const owners: Address[] = (((syMultisig || null)?.owners || []) as Address[]);
      const ownerTBAs = Array.from(new Set(owners).intersection(new Set(Object.keys(tbas))));
      return Object.fromEntries(ownerTBAs.map((tba) => ([tba, tbas[tba]])));
    }, [walletTBAs, syMultisig]);

    useEffect(() => {
      const walletOwnerUIDs = Object.values(walletOwnerTBAs);
      if (!!walletTBAs && walletOwnerUIDs.length === 1) {
        navigate({ to: `/id/${walletOwnerUIDs[0].patp}/sy/${routeID.patp}` });
      }
    }, [navigate, walletTBAs, walletOwnerTBAs]);

    const goUrbitID = useCallback((selection: SingleSelection) => {
      if (!!selection) {
        navigate({ to: `/id/${selection.value}/sy/${routeID.patp}` });
      }
    }, [navigate]);

    return (
      <LoadingFrame status={syMultisig && walletTBAs} error={
        <div className="flex flex-col gap-2 text-center">
          <h4 className="font-medium">
            <span>Unable to load Syndicate for </span>
            <UrbitIDFrame urbitID={routeID} />
            <span>.</span>
          </h4>
          <h4 className="font-medium">
            Either the Urbit ID isn't a Syndicate or there were network errors.
          </h4>
        </div>
      }>
        <HeroFrame title="Syndicate Creation Successful!">
          {(Object.keys(walletOwnerTBAs ?? {}).length === 0) ? (
            <h4 className="font-medium">
              This ID is no longer owned by any of your wallets.
            </h4>
          ) : (Object.keys(walletOwnerTBAs ?? {}).length === 1) ? (
            <>
              <h4 className="font-medium">
                Redirecting to the Syndicate ownership page...
              </h4>
              <HugeLoadingIcon />
            </>
          ) : (
            <SingleSelector
              onChange={goUrbitID}
              placeholder="Select Urbit ID"
              isClearable={false}
              styles={{container: (s) => ({...s, width: "200px"})}}
              options={Object.entries(walletOwnerTBAs ?? {}).map(([tba, uid]: [string, UrbitID]) => (
                { value: uid.patp, label: uid.patp }
              ))}
            />
          )}
        </HeroFrame>
      </LoadingFrame>
    );
  },
});
