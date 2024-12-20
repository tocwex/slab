"use client";
import type { Task } from '@prisma/client';
import type { UrbitID } from "@/type/urbit";
import { FormEvent, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUrbitIDs } from '@/hook/wallet';

export default function Home(): React.ReactNode {
  const router = useRouter()
  const urbitIDs = useUrbitIDs();

  const gotoUrbitID = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const urbitID: string | undefined = event.target?.value;
    if (!!urbitID) {
      router.push(`/id/${urbitID}`);
    }
  }, [router]);

  return (
    <div className="h-lvh main">
      <h1 className="text-4xl font-bold underline">
        %slab
      </h1>
      <select onChange={gotoUrbitID} className="select-lg">
        <option key="" value="">
          Select Urbit ID
        </option>
        {(urbitIDs ?? []).map(({id, patp, clan}: UrbitID) => (
          <option key={id} value={patp}>
            {patp}
          </option>
        ))}
      </select>
    </div>
  );
}
