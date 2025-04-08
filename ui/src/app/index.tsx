import React, { useCallback } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { HeroFrame } from '@/comp/Frames';
import { ConnectedWalletGuard } from '@/comp/Guards';
import { AzimuthIcon, UrbitIcon } from '@/comp/Icons';

export const Route = createFileRoute('/')({
  component: (): React.ReactNode => {
    const HeroButton = useCallback(({
      title,
      href,
      children,
    } : {
      title: string;
      href: string,
      children: React.ReactNode;
    }): React.ReactNode => (
      <Link title={title} to={href} className={`
        w-60 h-60 flex flex-col justify-around items-center
        border-3 border-white p-4 rounded-2xl
      `.trim()}>
        <h3 className="text-2xl">{title}</h3>
        {children}
      </Link>
    ), []);

    return (
      <ConnectedWalletGuard>
        <HeroFrame size="lg">
          <div className="flex flex-row flex-wrap justify-center gap-10">
            <HeroButton title="Select Identity" href="/id">
              <UrbitIcon className="border-4 w-24 h-24" />
            </HeroButton>
            <HeroButton title="Explore Ecosystem" href="/ex">
              <AzimuthIcon className="w-24 h-24" />
            </HeroButton>
          </div>
        </HeroFrame>
      </ConnectedWalletGuard>
    );
  },
});
