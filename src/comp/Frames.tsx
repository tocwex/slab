"use client";
import type { Address, AddressType, UrbitID } from "@/type/slab";
import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { CopyIcon, CopiedIcon } from '@/comp/Icons';
import { useWalletMeta, useTokenboundUrbitID } from '@/hook/web3';
import { useCopy } from '@/hook/util';
import { trimAddress, formUrbitID } from '@/lib/util';
import { BLOCKCHAIN } from '@/dat/const';

export function UrbitIDFrame({
  urbitID,
  link=true,
  className=undefined,
}: {
  urbitID: UrbitID;
  link?: boolean;
  className?: string;
}) {
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
    <div className="inline-flex flex-row gap-1 items-center">
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
    <div className="inline-flex flex-row gap-1 items-center">
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
    <div className="inline-flex flex-row gap-1 items-center">
      <Link href={href} target="_blank" className={className}>
        <code>{trimAddress(address)}</code>
      </Link>
      <button type="button" onClick={copy} className="w-4 h-4">
        {!copied ? (<CopyIcon />) : (<CopiedIcon />)}
      </button>
    </div>
  );
}
