"use client";
import type { Task } from '@prisma/client';
import type { UrbitID } from "@/type/slab";
import { FormEvent, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { HeroFrame, LoadingFrame, AddressFrame } from '@/comp/Frames';
import { ConnectedWalletGuard } from '@/comp/Guards';
import { SingleSelector, SingleSelection } from '@/comp/Selector';
import { useWalletMeta, useWalletUrbitIDs } from '@/hook/wallet';
import { toTitleCase } from '@/lib/util';

export default function Home(): React.ReactNode {
  const router = useRouter()
  const wallet = useWalletMeta();
  const urbitIDs = useWalletUrbitIDs();

  const goUrbitID = useCallback((selection: SingleSelection) => {
    if (!!selection) {
      router.push(`/id/${selection.value}`);
    }
  }, [router]);

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
}
