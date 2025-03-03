import type { UrbitID } from "@/type/slab";
import React, { FormEvent, useCallback, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { HeroFrame, LoadingFrame, AddressFrame } from '@/comp/Frames';
import { ConnectedWalletGuard } from '@/comp/Guards';
import { SingleSelector, SingleSelection } from '@/comp/Selector';
import { useWalletMeta, useWalletUrbitIDs } from '@/hook/wallet';
import { toTitleCase } from '@/lib/util';

export const Route = createFileRoute('/')({
  component: (): React.ReactNode => {
    const navigate = useNavigate();
    const wallet = useWalletMeta();
    const urbitIDs = useWalletUrbitIDs();

    const goUrbitID = useCallback((selection: SingleSelection) => {
      if (!!selection) {
        navigate({ to: `/id/${selection.value}` });
      }
    }, [navigate]);

    return (
      <ConnectedWalletGuard>
        <LoadingFrame status={urbitIDs && ((urbitIDs ?? []).length > 0)} error={
          (!!wallet) && (
            (urbitIDs === null) ? (
              <h4 className="font-medium">
                <span>Unable to fetch Web3 wallet details for </span>
                <AddressFrame address={wallet.address} />
                <span>; please try again.</span>
              </h4>
            ) : (
              <h4 className="font-medium">
                <span>Web3 wallet </span>
                <AddressFrame address={wallet.address} />
                <span> doesn't own an Urbit ID on chain </span>
                <span className="font-bold">{toTitleCase(wallet.chainID)}</span>
                <span>; please connect another.</span>
              </h4>
            )
          )
        }>
          <HeroFrame>
            <SingleSelector
              onChange={goUrbitID}
              placeholder="Select Urbit ID"
              isClearable={false}
              styles={{container: (s) => ({...s, width: "200px"})}}
              options={((urbitIDs || null) ?? []).map(({id, patp, clan}: UrbitID) => (
                { value: patp, label: patp }
              ))}
            />
          </HeroFrame>
        </LoadingFrame>
      </ConnectedWalletGuard>
    );
  },
});
