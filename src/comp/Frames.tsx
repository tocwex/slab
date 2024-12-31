"use client";
import type { Address, AddressType, UrbitID } from "@/type/slab";
import { useMemo } from 'react';
import Link from 'next/link';
import { trimAddress } from '@/lib/util';

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
  const text: string = useMemo(() => (
    !short ? address : trimAddress(address)
  ), [address, short]);
  // FIXME: This needs to support arbitrary chains, not just the testnet
  const href: string = useMemo(() => (`
    https://${
      "sepolia."
    }etherscan.io/${
      (type === "account") ? "address"
      : (type === "transaction") ? "tx"
      : ""
    }/${
      address
    }
  `.trim()), [address, type]);

  return (
    <Link href={href} target="_blank" className={className}>
      <code>{text}</code>
    </Link>
  );
}
