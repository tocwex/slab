import React, { useState, useCallback, useRef } from 'react';
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
    const dialogRef = useRef<HTMLDialogElement>(null);
    const pathname = useLocation({ select: loc => loc.pathname });

    const toggleDialog = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!dialogRef.current?.open) {
        dialogRef.current?.showModal();
      } else {
        dialogRef.current?.close();
      }
    }, [dialogRef]);

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
          bg-gray-600 p-1 font-bold text-xs text-white
        `}>
          <button type="button"
            onClick={toggleDialog}
            className="font-bold underline"
          >
            BETA BUILD
          </button>
          {!version ? (
            <TextLoadingIcon />
          ) : (
            <>
              <span>-</span>
              <span>v{version}</span>
            </>
          )}
        </div>
      );
    }, [toggleDialog]);

    const Dialog = useCallback(() => {
      return (
        <dialog ref={dialogRef}>
          <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative overflow-hidden rounded-lg text-left sm:my-8 sm:w-full sm:max-w-lg">
                <div className="relative bg-white text-black px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="mt-3 text-center flex flex-col gap-3 sm:mt-0 sm:text-left">
                    <h2 className="text-2xl font-bold underline">
                      %slab Beta
                    </h2>
                    <p>
                      The Syndicate contract ecosystem was developed in
                      concert with <a href="https://www.sightbear.com">
                      Sightbear</a>, an autonomous AI security agent designed
                      to find exploits in Web and Web3 applications.
                      Sightbear's agent did not find any exploits in run
                      #84f1ac05, which was its final review of the contract
                      code launched to mainnet ethereum.
                    </p>
                  </div>
                </div>
                <div className="absolute top-3 right-4">
                  <button type="button"
                    onClick={toggleDialog}
                    className="font-light"
                  >
                    ✖
                  </button>
                </div>
                <div className="bg-gray-600 text-white flex gap-2 px-4 py-3 sm:flex-row-reverse sm:px-6">
                  <button type="button"
                    onClick={toggleDialog}
                    className="button-lg bg-black"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </dialog>
      );
    }, [dialogRef, toggleDialog]);

    return (
      <>
        <HeadContent />
        <QueryClientProvider client={REACT_QUERY}>
          <Web3OnboardProvider web3Onboard={WEB3ONBOARD}>
            <div className="fixed z-40 top-4 left-4">
              <HomeLink />
            </div>
            <div className="max-w-3xl mx-auto flex flex-col justify-center items-center">
              <Dialog />
              <Outlet />
            </div>
            {/*APP.DEBUG*/true && (
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
