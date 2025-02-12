import type {
  Nullable, Address, Contract, Transaction,
  UrbitID, UrbitClan, Token,
} from '@/type/slab';
import type { WalletState } from '@web3-onboard/core';
import { APP, ABI, ACCOUNT, BLOCKCHAIN, CONTRACT } from '@/dat/const';
import * as ob from "urbit-ob";
import { formatUnits, isHex, toHex, fromHex } from 'viem';

const CLAN_INDEX = Object.freeze({
  galaxy: 0,
  star: 1,
  planet: 2,
  moon: 3,
  comet: 4,
});

export function delay(milliseconds: number): Promise<void> {
  return new Promise(res => setTimeout(res, milliseconds));
}

// https://stackoverflow.com/a/33946793
export function rateLimit(maxRequests: number, perSeconds: number): (func: any) => void {
  let frameStart = 0;
  let frameCount = 0;
  let frameQueue = [];
  let untilNext = 0;

  return function limiter(func) {
    func && frameQueue.push(func);
    untilNext = perSeconds * 1000 - (Date.now() - frameStart);
    if (untilNext <= 0) {
      frameStart = Date.now();
      frameCount = 0;
    }
    if (++frameCount <= maxRequests) {
      (frameQueue.shift() ?? (() => null))();
    } else {
      // console.log(`limiting function for ${untilNext/ 1000}s`);
      setTimeout(limiter, untilNext);
    }
  };
}

export function encodeSet<U>(set: Set<U>): string {
  return String(Array.from(set).sort());
}

export function decodeSet<U>(str: string, sip?: (s: string) => U): Set<U> {
  const stringToU = sip ?? ((val: string): U => (val as U));
  return new Set(str.split(",").map(stringToU));
}

export function clamp<T>(value: T, lo: T, hi: T): T {
  return ((value < lo) ? lo : ((value > hi) ? hi : value));
}

export function formatToken(amount: number | bigint | string, token: Token): string {
  return `${
    formatFloat(formatUnits(BigInt(amount), token.decimals))
  } \$${
    token.symbol
  }`;
}

// FIXME: These should use 'BigInt' while accounting for potential decimal numbers
export function formatFloat(amount: number | bigint | string): string {
  return Number(amount).toLocaleString("en-US", {maximumFractionDigits: 18});
}

export function formatUint(amount: number | bigint | string): string {
  return Number(amount).toLocaleString("en-US", {maximumFractionDigits: 0}).replaceAll(",", ".");
}

export function trimAddress(address: string): string {
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
}

export function compareUrbitIDs(a: UrbitID, b: UrbitID): number {
  const clanCmp: number = CLAN_INDEX[a.clan] - CLAN_INDEX[b.clan];
  const patpCmp: number = a.patp.localeCompare(b.patp);
  return [clanCmp, patpCmp].find((n) => (n !== 0)) ?? 0;
}

export function toTitleCase(text: string): string {
  return text.replace(
    /\w\S*/g,
    (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase(),
  );
}

export function hasClanBoon(urbit: UrbitID, clan: UrbitClan): boolean {
  return CLAN_INDEX[urbit.clan] <= CLAN_INDEX[clan];
}

export function isValidPDO(urbit: UrbitID): boolean {
  return APP.DEBUG || hasClanBoon(urbit, "star");
}

export function getChainMeta(chain: bigint): [number, string] {
  const chainId: number = Number(chain);
  const chainTag: string = BLOCKCHAIN?.TAG[chainId] ?? BLOCKCHAIN.TAG[BLOCKCHAIN.ID.ETHEREUM];
  return [chainId, chainTag];
}

export function parseForm<
  U extends Record<string, any>,
  V extends { [key in keyof U]: any },
>(
  event: React.MouseEvent<HTMLButtonElement>,
  defaults: U,
): Nullable<V> {
  const form = (event.currentTarget as HTMLButtonElement)?.form;

  let formEntries = null;
  if (form?.reportValidity()) {
    const formData = new FormData(form);
    formEntries = Object.fromEntries(Object.entries(defaults).map(
      ([key, val]: [string, any]) => ([key, formData.get(key) || val])
    ));
  }

  return (formEntries as Nullable<V>);
}

export function formContract(chain: bigint, symbol: string): Contract {
  const [chainId, chainTag] = getChainMeta(chain);
  return {
    abi: (CONTRACT as any)?.[symbol]?.ABI ?? [],
    address: (CONTRACT as any)?.[symbol]?.ADDRESS?.[chainTag]
      ?? ACCOUNT.NULL?.[chainTag]
      ?? ACCOUNT.NULL?.ETHEREUM,
  };
}

export function formToken(chain: bigint, symbol: string): Token {
  const [chainId, chainTag] = getChainMeta(chain);
  return (symbol === "ETH")
    ? {
      abi: [],
      address: ACCOUNT.NULL?.[chainTag] ?? ACCOUNT.NULL.ETHEREUM,
      name: BLOCKCHAIN.TAG?.[chainId] ?? BLOCKCHAIN.TAG[BLOCKCHAIN.ID.ETHEREUM],
      symbol: BLOCKCHAIN.SYM?.[chainId] ?? BLOCKCHAIN.SYM[BLOCKCHAIN.ID.ETHEREUM],
      decimals: 18,
    } : {
      abi: (CONTRACT as any)?.[symbol]?.ABI ?? [],
      address: (CONTRACT as any)?.[symbol]?.ADDRESS?.[chainTag]
        ?? ACCOUNT.NULL?.[chainTag]
        ?? ACCOUNT.NULL.ETHEREUM,
      name: (CONTRACT as any)?.[symbol]?.NAME ?? "<unknown>",
      symbol: (CONTRACT as any)?.[symbol]?.SYMBOL ?? "---",
      decimals: (CONTRACT as any)?.[symbol]?.DECIMALS ?? 18,
    };
}

export function formUrbitID(value: number | string): UrbitID {
  let [id, patp, clan]: [string, string, UrbitClan] = ["", "", "comet"];
  if (typeof value === "number" || !isNaN((value as unknown as number))) {
    id = String(value);
    patp = ob.patp(id);
    clan = ob.clan(patp);
  } else if (ob.isValidPatp(value)) { // typeof value === "string"
    patp = value;
    id = String(ob.patp2dec(value));
    clan = ob.clan(patp);
  }
  return ({id, patp, clan});
}

export function forceUrbitID(value: number | string): UrbitID {
  const urbitID = formUrbitID(value);
  if (!urbitID.id) throw Error(`Cannot derive Urbit ID from value '${value}'`);
  return urbitID;
}
