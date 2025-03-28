import React, { useCallback } from 'react';
import { createRootRoute, HeadContent, Link, Outlet, useLocation } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { QueryClientProvider } from '@tanstack/react-query'
import { Web3OnboardProvider } from '@web3-onboard/react';
import { HeroFrame } from '@/comp/Frames';
import { TextLoadingIcon } from '@/comp/Icons';
import { useDeskVersion } from '@/hook/urbit';
import { REACT_QUERY, WEB3ONBOARD } from '@/dat/apis';
import { APP } from '@/dat/const';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: '%slab - a syndicate launchpad and management dashboard' },
      {
        name: 'description',
        content: 'A Syndicate launchpad and management dashboard.',
      },
    ],
  }),
  component: (): React.ReactNode => {
    const pathname = useLocation({ select: loc => loc.pathname });

    const HomeLink = useCallback(() => (
      (pathname !== '/apps/slab/') ? (
        <Link className="head" children="HOME" to="/" />
      ) : (
        <a className="head" children="LANDSCAPE" href={
          `${window.location.origin}/apps/landscape/`
        } />
      )
    ), [pathname, window.location.origin]);

    const Footer = useCallback(() => {
      const version = useDeskVersion();
      return (
        <div className={`
          fixed z-40 bottom-0 w-full flex flex-row justify-center gap-2
          bg-gray-500/50 p-1 font-bold text-xs text-white
        `}>
          <span>⚠</span>
          <span>BETA BUILD</span>
          {!version ? (
            <TextLoadingIcon />
          ) : (
            <>
              <span>-</span>
              <span>v{version}</span>
            </>
          )}
          <span>⚠</span>
        </div>
      );
    }, []);

    return (
      <>
        <HeadContent />
        <QueryClientProvider client={REACT_QUERY}>
          <Web3OnboardProvider web3Onboard={WEB3ONBOARD}>
            <div className="fixed z-40 top-4 left-4">
              <HomeLink />
            </div>
            <div className="max-w-3xl mx-auto flex flex-col justify-center items-center">
              <Outlet />
            </div>
            {APP.DEBUG && (
              <Footer />
            )}
            <ReactQueryDevtools initialIsOpen={false} />
          </Web3OnboardProvider>
        </QueryClientProvider>
      </>
    );
  },
  notFoundComponent: (): React.ReactNode => (
    <HeroFrame title="%slab">
      <h4 className="font-semibold">
        404 | Page not found!
      </h4>
      <Link to="/" className="button-lg no-underline!">
        ↜ Home
      </Link>
    </HeroFrame>
  ),
});
