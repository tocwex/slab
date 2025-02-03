"use client";
import type { Task } from '@prisma/client';
import type { UrbitID } from "@/type/slab";
import { FormEvent, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { HeroFrame, LoadingFrame, AddressFrame } from '@/comp/Frames';
import { ConnectedWalletGuard } from '@/comp/Guards';
import { useWalletMeta, useWalletUrbitIDs } from '@/hook/wallet';
import { toTitleCase } from '@/lib/util';

export default function Home(): React.ReactNode {
  const router = useRouter()
  const wallet = useWalletMeta();
  const urbitIDs = useWalletUrbitIDs();

  const gotoUrbitID = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const urbitID: string | undefined = event.target?.value;
    if (!!urbitID) {
      router.push(`/id/${urbitID}`);
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
          <select onChange={gotoUrbitID} className="input-lg">
            <option key="" value="">
              Select Urbit ID
            </option>
            {(urbitIDs ?? []).map(({id, patp, clan}: UrbitID) => (
              <option key={id} value={patp}>
                {patp}
              </option>
            ))}
          </select>
        </HeroFrame>
      </LoadingFrame>
    </ConnectedWalletGuard>
  );
}
