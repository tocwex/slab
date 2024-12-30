"use client";
import type { UrbitID, TokenHolding } from "@/type/slab";
import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRouteUrbitID } from '@/hook/app';
import { TokenboundAccountInfo } from '@/comp/Accounts';
import { REGEX } from '@/dat/const';

export default function IDPage(): React.ReactNode {
  const router = useRouter();
  const routeID: UrbitID = (useRouteUrbitID() as UrbitID);

  const onAccess = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const accessData = new FormData((event.target as HTMLButtonElement).form ?? undefined);
    // FIXME: It's very annoyting that this doesn't work
    // router.push(`${router.asPath}/pdo/${accessData.get("account")}`);
    router.push(`/id/${routeID.patp}/pdo/${accessData.get("account")}`);
  }, [router, routeID]);

  return (
    <div className="main">
      <h1 className="text-4xl font-bold underline">
        {routeID.patp} profile
      </h1>
      <TokenboundAccountInfo urbitID={routeID} />
      <form className="flex flex-col gap-2">
        <h2 className="text-2xl">
          Manage PDO
        </h2>
        <div className="flex flex-col gap-2">
          <input type="text" required name="account"
            placeholder="urbit id"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            pattern={REGEX.AZIMUTH.POINT}
            className="input-lg"
          />
          <button onClick={onAccess} className="button-lg">
            access
          </button>
        </div>
      </form>
    </div>
  );
}
