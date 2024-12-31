"use client";
import type { Address, AddressType } from "@/type/slab";
import { useMemo } from 'react';
import Link from 'next/link';
import { trimAddress } from '@/lib/util';

export function AddressFrame({
  address,
  type='account',
  short=true,
}: {
  address: Address;
  type?: AddressType;
  short?: boolean;
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
    <Link href={href} target="_blank">
      <code>{text}</code>
    </Link>
  );
}
