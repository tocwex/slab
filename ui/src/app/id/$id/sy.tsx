import type { UrbitID } from "@/type/slab";
import React, { useMemo } from 'react';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useRouteParams } from '@/hook/app';
import { useSafeAccount, useTokenboundAccount } from '@/hook/web3';
import { RouteUIDValidGuard } from '@/comp/Guards';
import { LoadingFrame, UrbitIDFrame } from '@/comp/Frames';
import { formUrbitID, isValidSyndicate } from '@/lib/util';
import { APP } from '@/dat/const';

export const Route = createFileRoute('/id/$id/sy')({
  component: (): React.ReactNode => {
    const params = useRouteParams();
    const routeID: UrbitID = useMemo(() => formUrbitID(params?.id ?? ""), [params?.id]);
    const routeSyndicate: UrbitID = useMemo(() => formUrbitID(params?.sy ?? ""), [params?.sy]);

    const tbAccount = useTokenboundAccount(routeID);
    const syndMultisig = useSafeAccount(routeSyndicate);
    const isRouteSyndicateHolder: boolean = useMemo(() => (
      ((syndMultisig || null)?.owners ?? []).includes(
        String((tbAccount || null)?.address)
      )
    ), [tbAccount, syndMultisig]);

    return (
      <RouteUIDValidGuard param="sy">
        <LoadingFrame status={isValidSyndicate(routeSyndicate)} error={
          <div className="flex flex-col gap-2 items-center text-center">
            <h4 className="font-medium">
              <span>Attempting to access the Syndicate for </span>
              <span className="font-bold">{params?.sy}</span>
              <span>, which isn't a valid Urbit Syndicate.</span>
            </h4>
            <h4 className="font-medium">
              <span>Please retry with a valid Urbit Syndicate.</span>
            </h4>
          </div>
        }>
          <LoadingFrame status={tbAccount && syndMultisig} error={
            <div className="flex flex-col gap-2 items-center text-center">
              <h4 className="font-medium">
                <span>Unable to load Syndicate for </span>
                <UrbitIDFrame urbitID={routeSyndicate} />
                <span>.</span>
              </h4>
              <h4 className="font-medium">
                <span>Either the Urbit ID isn't a Syndicate or there were network errors.</span>
              </h4>
            </div>
          }>
            <LoadingFrame status={isRouteSyndicateHolder} error={
              <div className="flex flex-col gap-2 items-center text-center">
                <h4 className="font-medium">
                  <span>Urbit ID </span>
                  <UrbitIDFrame urbitID={routeID} />
                  <span> is not a signer for Syndicate </span>
                  <UrbitIDFrame urbitID={routeSyndicate} />
                  <span>.</span>
                </h4>
                <h4 className="font-medium">
                  <span>Please select a valid Urbit ID to continue.</span>
                </h4>
              </div>
            }>
              <Outlet />
            </LoadingFrame>
          </LoadingFrame>
        </LoadingFrame>
      </RouteUIDValidGuard>
    );
  },
});
