"use client";
import type { UrbitID } from "@/type/slab";
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useSafeAccount, useTokenboundAccount } from '@/hook/web3';
import { RouteUIDValidGuard } from '@/comp/Guards';
import { LoadingFrame, UrbitIDFrame } from '@/comp/Frames';
import { formUrbitID, isValidPDO } from '@/lib/util';
import { APP } from '@/dat/const';

export function PDORouteWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  const params = useParams<{id: string; pdo: string;}>();
  const routeID: UrbitID = useMemo(() => formUrbitID(params?.id ?? ""), [params?.id]);
  const routePDO: UrbitID = useMemo(() => formUrbitID(params?.pdo ?? ""), [params?.pdo]);

  const tbAccount = useTokenboundAccount(routeID);
  const pdoMultisig = useSafeAccount(routePDO);
  const isRoutePDOHolder: boolean = useMemo(() => (
    (pdoMultisig?.owners ?? []).includes(String(tbAccount?.address))
  ), [tbAccount, pdoMultisig]);

  return (
    <RouteUIDValidGuard param="pdo">
      <LoadingFrame status={isValidPDO(routePDO)} error={
        <div className="flex flex-col gap-2 items-center text-center">
          <h4 className="font-medium">
            <span>Attempting to access the PDO for </span>
            <span className="font-bold">{params?.pdo}</span>
            <span>, which isn't a valid Urbit PDO.</span>
          </h4>
          <h4 className="font-medium">
            <span>Please retry with a valid Urbit PDO.</span>
          </h4>
        </div>
      }>
        <LoadingFrame status={tbAccount && pdoMultisig} error={
          <div className="flex flex-col gap-2 items-center text-center">
            <h4 className="font-medium">
              <span>Unable to load PDO for </span>
              <UrbitIDFrame urbitID={routePDO} />
              <span>.</span>
            </h4>
            <h4 className="font-medium">
              <span>Either the Urbit ID isn't a PDO or there were network errors.</span>
            </h4>
          </div>
        }>
          <LoadingFrame status={isRoutePDOHolder} error={
            <div className="flex flex-col gap-2 items-center text-center">
              <h4 className="font-medium">
                <span>Urbit ID </span>
                <UrbitIDFrame urbitID={routeID} />
                <span> is not a signer for PDO </span>
                <UrbitIDFrame urbitID={routePDO} />
                <span>.</span>
              </h4>
              <h4 className="font-medium">
                <span>Please select a valid Urbit ID to continue.</span>
              </h4>
            </div>
          }>
            {children}
          </LoadingFrame>
        </LoadingFrame>
      </LoadingFrame>
    </RouteUIDValidGuard>
  );
}
