import type { Address, Loadable, UrbitID } from '@/type/slab';
import React, { useCallback } from 'react';
import { createFileRoute, useNavigate, Outlet } from '@tanstack/react-router'
import { HeroFrame, LoadingFrame } from '@/comp/Frames';
import { ConnectedWalletGuard } from '@/comp/Guards';
import { SingleSelector, SingleSelection } from '@/comp/Selector';
import { useRouteUrbitExplore } from '@/hook/app';
import { useGlobalWhitelist, useGlobalSyndicates } from '@/hook/web3';

export const Route = createFileRoute('/ex')({
  // head: ({ params }) => ({
  //   meta: [
  //     { title: `%slab | test page` },
  //   ],
  // }),
  component: (): React.ReactNode => {
    const routeID = useRouteUrbitExplore();

    const navigate = useNavigate();
    const syndicates: Loadable<[UrbitID, Address][]> = useGlobalSyndicates();
    const whitelist: Loadable<UrbitID[]> = useGlobalWhitelist();

    const goUrbitID = useCallback((selection: SingleSelection) => {
      if (!!selection) {
        navigate({ to: `/ex/${selection.value}` });
      }
    }, [navigate]);

    return (routeID !== null) ? (
      <ConnectedWalletGuard>
        <Outlet />
      </ConnectedWalletGuard>
    ) : (
      <ConnectedWalletGuard>
        <LoadingFrame status={syndicates && whitelist} title="Explore Syndicates">
          <HeroFrame title="Explore Syndicates">
            <div className="flex flex-row flex-wrap justify-center gap-x-10">
              <HeroFrame title="Launched Syndicates" size="md">
                <SingleSelector
                  onChange={goUrbitID}
                  placeholder="Select Urbit ID"
                  isClearable={false}
                  styles={{container: (s) => ({...s, width: "200px"})}}
                  options={((syndicates || null) ?? []).map(([{patp}, ]: [UrbitID, Address]) => (
                    { value: patp, label: patp }
                  ))}
                />
              </HeroFrame>
              <HeroFrame title="Whitelisted Points" size="md">
                <SingleSelector
                  onChange={goUrbitID}
                  placeholder="Select Urbit ID"
                  isClearable={false}
                  styles={{container: (s) => ({...s, width: "200px"})}}
                  options={((whitelist || null) ?? []).map(({patp}: UrbitID) => (
                    { value: patp, label: patp }
                  ))}
                />
              </HeroFrame>
            </div>
          </HeroFrame>
        </LoadingFrame>
      </ConnectedWalletGuard>
    );
  },
});
