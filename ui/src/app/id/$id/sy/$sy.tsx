import type { UrbitID } from "@/type/slab";
import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useRouteUrbitID, useRouteUrbitSyndicate } from '@/hook/app';
import { SyndicateAccountInfo, SafeAccountInfo } from '@/comp/Accounts';
import { ACCOUNT, REGEX } from '@/dat/const';

export const Route = createFileRoute('/id/$id/sy/$sy')({
  // head: ({ params }) => ({
  //   meta: [
  //     { title: `%slab | ${params?.sy ?? '<unknown>'} syndicate` },
  //   ],
  // }),
  component: (): React.ReactNode => {
    const routeID: UrbitID = (useRouteUrbitID() as UrbitID);
    const routeSyndicate: UrbitID = (useRouteUrbitSyndicate() as UrbitID);

    return (
      <div className="main">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold underline">
            {routeSyndicate.patp} syndicate
          </h1>
          <h2 className="text-2xl font-bold">
            Operating as {routeID.patp}
          </h2>
        </div>
        <SafeAccountInfo urbitID={routeSyndicate} />
        <SyndicateAccountInfo urbitID={routeID} urbitSyndicate={routeSyndicate} />
      </div>
    );
  },
});
