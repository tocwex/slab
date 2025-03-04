import React from 'react';
import { createRootRoute, HeadContent, Link, Outlet } from '@tanstack/react-router';
import { HeroFrame } from '@/comp/Frames';
import { QueryClientProvider } from '@tanstack/react-query'
import { Web3OnboardProvider } from '@web3-onboard/react';
import { REACT_QUERY, WEB3ONBOARD } from '@/dat/apis';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: '%slab' },
      {
        name: 'description',
        content: 'A tool for launching and maintaining syndicates.',
      },
    ],
  }),
  component: (): React.ReactNode => (
    <>
      <HeadContent />
      <QueryClientProvider client={REACT_QUERY}>
        <Web3OnboardProvider web3Onboard={WEB3ONBOARD}>
          <div className="fixed z-40 top-4 left-4 w-[80px] h-[56px]">
            <Link to="/" className="head">
              HOME
            </Link>
          </div>
          <div className="max-w-3xl mx-auto flex flex-col justify-center items-center">
            <Outlet />
          </div>
        </Web3OnboardProvider>
      </QueryClientProvider>
    </>
  ),
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
