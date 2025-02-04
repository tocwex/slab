"use client";
import type { Address, AddressType, UrbitID } from "@/type/slab";
import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CopyIcon, CopiedIcon, HugeLoadingIcon } from '@/comp/Icons';
import { useGoBack } from '@/hook/app';
import { useTokenboundUrbitID } from '@/hook/web3';
import { useWalletMeta } from '@/hook/wallet';
import { useCopy } from '@/hook/util';
import { trimAddress, formUrbitID } from '@/lib/util';
import { BLOCKCHAIN } from '@/dat/const';

export function LoadingFrame({
  status,
  title = "%slab",
  error,
  action,
  children,
}: {
  status: any;
  title?: string;
  error?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactNode {
  const goBack = useGoBack();

  return !!status ? children : (
    <HeroFrame title={title}>
      {(status === undefined) ? (
        <HugeLoadingIcon />
      ) : (!error) ? (
        <>
          <h4 className="font-medium">
            There was an error fetching the data for this page.
          </h4>
          <h4 className="font-medium">
            Either the input data was invalid or there were network errors.
          </h4>
        </>
      ) : (
        error
      )}
      {!!action ? action : (
        <button type="button" onClick={goBack} className="button-lg">
          ← Back
        </button>
      )}
    </HeroFrame>
  );
}

export function HeroFrame({
  title = "%slab",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div className="h-lvh main">
      {!!title && (
        <h1 className="text-4xl font-bold underline">{title}</h1>
      )}
      {children}
    </div>
  );
}

export function UrbitIDFrame({
  urbitID,
  link=true,
  className=undefined,
}: {
  urbitID: UrbitID;
  link?: boolean;
  className?: string;
}): React.ReactNode {
  const href: string = useMemo(() => (`
    https://network.urbit.org/${urbitID.patp}
  `.trim()), [urbitID]);

  return !link ? (
    <code className={className}>
      {urbitID.patp}
    </code>
  ) : (
    <Link href={href} target="_blank" className={className}>
      <code>{urbitID.patp}</code>
    </Link>
  );
}

export function AddressFrame({
  address,
  type='account',
  short=true,
  className=undefined,
}: {
  address: Address;
  type?: AddressType;
  short?: boolean;
  className?: string;
}): React.ReactNode {
  const wallet = useWalletMeta();
  const [copy, copied] = useCopy(address);

  const link: boolean = useMemo(() => (
    type !== "signature"
  ), [type]);
  const text: string = useMemo(() => (
    !short ? address : trimAddress(address)
  ), [address, short]);
  const href: string = useMemo(() => (`
    https://${
      (wallet?.chain === BigInt(BLOCKCHAIN.ID.SEPOLIA)) ? "sepolia."
      : (wallet?.chain === BigInt(BLOCKCHAIN.ID.ETHEREUM)) ? ""
      : ""
    }etherscan.io/${
      (type === "account") ? "address"
      : (type === "transaction") ? "tx"
      : ""
    }/${
      address
    }
  `.trim()), [address, type, wallet?.chainID]);

  return (
    <div className="inline-flex flex-row gap-1 items-center text-nowrap">
      {!link ? (
        <code className={className}>
          {text}
        </code>
      ) : (
        <Link href={href} target="_blank" className={className}>
          <code>{text}</code>
        </Link>
      )}
      <button type="button" onClick={copy} className="w-4 h-4">
        {!copied ? (<CopyIcon />) : (<CopiedIcon />)}
      </button>
    </div>
  );
}

export function TBAFrame({
  address,
  link=true,
  short=true,
  className=undefined,
}: {
  address: Address;
  link?: boolean;
  short?: boolean;
  className?: string;
}): React.ReactNode {
  const urbitID = useTokenboundUrbitID(address);
  return (
    <div className="inline-flex flex-row gap-1 items-center text-nowrap">
      {(!!urbitID) && (
        <>
          <UrbitIDFrame urbitID={urbitID} link={link} className={className} />
          <span>: </span>
        </>
      )}
      <AddressFrame address={address} short={short} className={className} />
    </div>
  );
}

export function SafeFrame({
  address,
  className=undefined,
}: {
  address: Address;
  className?: string;
}): React.ReactNode {
  const wallet = useWalletMeta();
  const [copy, copied] = useCopy(address);

  const href: string = useMemo(() => (`
    https://app.safe.global/home?safe=${
      (wallet?.chain === BigInt(BLOCKCHAIN.ID.SEPOLIA)) ? "sep:"
      : (wallet?.chain === BigInt(BLOCKCHAIN.ID.ETHEREUM)) ? ""
      : ""
    }${
      address
    }
  `.trim()), [address, wallet?.chainID]);

  return (
    <div className="inline-flex flex-row gap-1 items-center text-nowrap">
      <Link href={href} target="_blank" className={className}>
        <code>{trimAddress(address)}</code>
      </Link>
      <button type="button" onClick={copy} className="w-4 h-4">
        {!copied ? (<CopyIcon />) : (<CopiedIcon />)}
      </button>
    </div>
  );
}
