import type { Address, AddressType, UrbitID } from "@/type/slab";
import React, { useCallback, useMemo } from 'react';
import { CopyIcon, CopiedIcon, TextLoadingIcon, HugeLoadingIcon } from '@/comp/Icons';
import { useGoBack } from '@/hook/app';
import { useTokenboundUrbitID, useAddressENS } from '@/hook/web3';
import { useWalletMeta } from '@/hook/wallet';
import { useCopy } from '@/hook/util';
import { trimAddress, trimUrbitID, formUrbitID, toTitleCase } from '@/lib/util';
import { BLOCKCHAIN } from '@/dat/const';

export function LoadingFrame({
  status,
  title = "%slab",
  size = "lg",
  error,
  action,
  children,
}: {
  status: any;
  title?: string;
  size?: "sm" | "md" | "lg";
  error?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactNode {
  const goBack = useGoBack();

  return !!status ? children : (
    <HeroFrame size={size} title={title}>
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
        <button type="button" onClick={goBack} className="input-lg input-nice">
          ← Back
        </button>
      )}
    </HeroFrame>
  );
}

export function HeroFrame({
  title = "%slab",
  size = "lg",
  children,
}: {
  title?: string;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}): React.ReactNode {
  const blockHeight: string = (size !== "lg") ? "" : "h-lvh";
  const textSize: string =
    (size === "sm") ? "text-base"
    : (size === "md") ? "text-2xl"
    : "font-bold underline text-4xl";
  return (
    <div className={`main ${blockHeight}`}>
      {!!title && (
        <h1 className={`${textSize}`}>{title}</h1>
      )}
      {children}
    </div>
  );
}

export function WideFrame({
  title = "<unknown>",
  className = "",
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div className={`flex flex-row justify-between gap-2 ${className}`}>
      <span className="whitespace-nowrap font-semibold">{title}</span>
      {children}
    </div>
  );
}

export function NameFrame({
  address,
  short=true,
}: {
  address: Address;
  short?: boolean;
}): React.ReactNode {
  // TODO: Implement "short" to shorten address/urbitid
  const urbitID = useTokenboundUrbitID(address);
  const addressENS = useAddressENS(address);

  return !!urbitID
    ? (!short ? urbitID.patp : trimUrbitID(urbitID))
    : !!addressENS
      ? addressENS
      : (!short ? address : trimAddress(address));
}

export function ChainFrame({
  short=false,
  className=undefined,
}: {
  short?: boolean;
  className?: string;
}): React.ReactNode {
  const wallet = useWalletMeta();

  return !wallet ? (
    <TextLoadingIcon />
  ) : (
    <span className={`font-bold ${className}`}>
      {short
        ? String(wallet.chain)
        : toTitleCase(wallet.chainID)
      }
    </span>
  );
}

export function UrbitIDFrame({
  urbitID,
  link=true,
  className=undefined,
}: {
  urbitID: UrbitID;
  link?: "dm" | "pf" | boolean;
  className?: string;
}): React.ReactNode {
  const href: string = useMemo(() => (
    !link ? "" :
    (link === "pf") ? `https://network.urbit.org/${urbitID.patp}` :
    `${window.location.origin}/apps/groups/dm/${urbitID.patp}`
  ), [window.location.origin, urbitID, link]);

  return !link ? (
    <code className={className}>
      {urbitID.patp}
    </code>
  ) : (
    <a href={href} target="_blank" className={className}>
      <code>{urbitID.patp}</code>
    </a>
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
  short?: boolean | string;
  className?: string;
}): React.ReactNode {
  const wallet = useWalletMeta();
  const [copy, copied] = useCopy(address);
  const addressENS = useAddressENS(address);

  const link: boolean = useMemo(() => (
    type !== "signature"
  ), [type]);
  const text: string = useMemo(() => (
    (typeof short === "string")
      ? short
      : !!addressENS
        ? addressENS
        : !short
          ? address
          : trimAddress(address)
  ), [address, addressENS, short]);
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
        <a href={href} target="_blank" className={className}>
          <code>{text}</code>
        </a>
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
  short=false,
  className=undefined,
}: {
  address: Address;
  link?: boolean;
  short?: boolean;
  className?: string;
}): React.ReactNode {
  const urbitID = useTokenboundUrbitID(address);
  return short ? (
    <AddressFrame address={address} short={(urbitID || null)?.patp ?? true} className={className} />
  ) : (
    <div className="inline-flex flex-row gap-1 items-center text-nowrap">
      {(!!urbitID) && (
        <>
          <UrbitIDFrame urbitID={urbitID} link={link} className={className} />
          <span>: </span>
        </>
      )}
      <AddressFrame address={address} short={true} className={className} />
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
      <a href={href} target="_blank" className={className}>
        <code>{trimAddress(address)}</code>
      </a>
      <button type="button" onClick={copy} className="w-4 h-4">
        {!copied ? (<CopyIcon />) : (<CopiedIcon />)}
      </button>
    </div>
  );
}
