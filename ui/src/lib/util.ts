import type { Nullable, Address, Contract, Token, Tax, UrbitID, UrbitClan } from '@/type/slab';
import type { WalletState } from '@web3-onboard/core';
import { APP, ABI, ACCOUNT, BLOCKCHAIN, CONTRACT } from '@/dat/const';
import * as ob from 'urbit-ob';
import seedrandom from 'seedrandom';
import Color, { ColorInstance } from 'color';
import { formatUnits, isHex, hexToBigInt } from 'viem';

const CLAN_INDEX = Object.freeze({
  galaxy: 0,
  star: 1,
  planet: 2,
  moon: 3,
  comet: 4,
});

export function clamp<T>(value: T, lo: T, hi: T): T {
  return ((value < lo) ? lo : ((value > hi) ? hi : value));
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise(res => setTimeout(res, milliseconds));
}

export function resolve<T>(promise: Promise<T>): Promise<T | undefined> {
  return promise
    .then((data) => (data))
    .catch((error) => Promise.resolve(undefined));
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

export function randomColor(seed: string): ColorInstance {
  const color: number = Math.floor(seedrandom(seed)() * (0xFFFFFF - 0x0 + 1) + 0x0);
  return Color(`#${color.toString(16).padStart(6, "0")}`);
}

export function encodeList<U>(list: U[]): string {
  return String(list.sort());
}

export function decodeList<U>(str: string, sip?: (s: string) => U): U[] {
  const stringToU = sip ?? ((val: string): U => (val as U));
  return str.split(",").map(stringToU);
}

export function encodeSet<U>(set: Set<U>): string {
  return encodeList(Array.from(set));
}

export function decodeSet<U>(str: string, sip?: (s: string) => U): Set<U> {
  return new Set(decodeList(str, sip));
}

export function trimAddress(address: string): string {
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
}

export function trimUrbitID(urbit: UrbitID): string {
  return (urbit.clan === "comet") ? `${urbit.patp.substring(0, 7)}_${urbit.patp.substring(urbit.patp.length - 7)}`
    : (urbit.clan === "moon") ? ob.sein(urbit.patp).replace("-", "^")
    : urbit.patp;
}

export function coerceBigInt(amount: number | string | bigint): [bigint, number] {
  // TODO: This function does not handle sub-1 values properly (it should
  // probably round these values to 0).
  let [value, decimals]: [bigint, number] = [BigInt(0), 0];

  if (typeof amount === "bigint") {
    value = amount;
  } else if (typeof amount === "string" && isHex(amount)) {
    value = hexToBigInt(amount);
  } else {
    // NOTE: Expand exponents in given number/string value.
    // See: http://jsfromhell.com/string/expand-exponential
    const amountString: string = ((s: string) => (
      s.replace(/^([+-])?(\d+).?(\d*)[eE]([-+]?\d+)$/,
          (x: any, s: any, n: any, f: any, c: any) => {
        var l = Number(+c < 0), i = n.length + +c, x = (l ? n : f).length,
        d = ((c = Math.abs(c)) >= x ? c - x + l : 0),
        z = (new Array(d + 1)).join("0"), r = n + f;
        return (s || "")
          + (l ? r = z + r : r += z).substr(0, i += l ? z.length : 0)
          + (i < r.length ? "." + r.substr(i) : "");
      })
    ))(String(amount));
    // NOTE: Does the given string represent a valid number?
    // See: https://stackoverflow.com/a/175787
    if (!isNaN(amountString as any) && !isNaN(parseFloat(amountString))) {
      value = BigInt(amountString.replace(".", ""));
      decimals = (amountString.split(".")?.[1] ?? "").length;
    }
  }

  return [value, decimals];
}

export function formatFloat(
  amount: number | bigint | string,
  minDecimals: number | undefined = undefined,
  maxDecimals: number | undefined = undefined,
): string {
  const [bigAmount, bigDecimals] = coerceBigInt(amount);
  const floatFormat: string = formatUnits(bigAmount, bigDecimals);
  const [floatNum, floatDec] = floatFormat.split(".");
  const curDecimals: number = (floatDec ?? "").length;

  let finalFormat: string = floatFormat;
  if ((minDecimals !== undefined) && curDecimals < minDecimals) {
    finalFormat = `${floatNum}.${floatDec ?? ""}${"0".repeat(minDecimals - curDecimals)}`;
  } if ((maxDecimals !== undefined) && curDecimals > maxDecimals) {
    finalFormat = `${floatNum}.${floatDec.slice(0, maxDecimals)}`;
  }

  return finalFormat;
}

export function formatUint(amount: number | bigint | string): string {
  // NOTE: https://stackoverflow.com/a/721415
  const floatFormat = formatFloat(amount, 0, 0);
  return floatFormat.replaceAll(/(\d)(?=(\d{3})+$)/g, "$1.");
}

export function formatCurrency(amount: number | bigint | string): string {
  // NOTE: https://stackoverflow.com/a/2901298
  const floatFormat = formatFloat(amount, 0, 2);
  return floatFormat.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function applyTax(amount: number | bigint | string, tax: Tax): bigint {
  const [bigAmount, ] = coerceBigInt(amount);
  return (bigAmount * tax.fee) / BigInt(10000);
}

export function includeTax(amount: number | bigint | string, tax: Tax): bigint {
  const [bigAmount, ] = coerceBigInt(amount);
  return (bigAmount * BigInt(10000)) / (BigInt(10000) - tax.fee);
}

export function formatTax(tax: Tax): string {
  return `${formatFloat(formatUnits(tax.fee, 2), 2, 2)}%`;
}

export function formatToken(
  amount: number | bigint | string,
  token: Token,
  symbol: boolean = false,
): string {
  const [bigAmount, bigDecimals] = coerceBigInt(amount);
  const currFormat = formatCurrency(formatUnits(bigAmount, bigDecimals + token.decimals));
  return `${currFormat}${!symbol ? "" : "$" + token.symbol}`;
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

export function isValidUrbitID(urbit: number | string | UrbitID): boolean {
  const urbitID: UrbitID = !(typeof urbit === "number" || typeof urbit === "string")
    ? urbit
    : formUrbitID(urbit);
  return !!urbitID.patp;
}

export function isValidSyndicate(urbit: UrbitID): boolean {
  return hasClanBoon(urbit, "star"); // || APP.DEBUG
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
      ([key, val]: [string, any]) => ([
        key,
        (typeof val !== "boolean") ? (
          formData.get(key) || val
        ) : (
          // NOTE: Handle HTML checkboxes, which are either "on" (if checked)
          // or undefined (if not checked)
          // (see: https://stackoverflow.com/a/33487482)
          (formData.get(key) === undefined) ? val : !!formData.get(key)
        )
      ])
    ));
  }

  return (formEntries as Nullable<V>);
}

export function formContract(chain: bigint, symbol: string): Contract {
  const [chainId, chainTag] = getChainMeta(chain);
  return {
    abi: (CONTRACT as any)?.[symbol]?.ABI ?? [],
    launch: (CONTRACT as any)?.[symbol]?.LAUNCH?.[chainTag] ?? BigInt(0),
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
      launch: BigInt(0),
      address: ACCOUNT.NULL?.[chainTag] ?? ACCOUNT.NULL.ETHEREUM,
      name: BLOCKCHAIN.TAG?.[chainId] ?? BLOCKCHAIN.TAG[BLOCKCHAIN.ID.ETHEREUM],
      symbol: BLOCKCHAIN.SYM?.[chainId] ?? BLOCKCHAIN.SYM[BLOCKCHAIN.ID.ETHEREUM],
      decimals: 18,
    } : {
      abi: (CONTRACT as any)?.[symbol]?.ABI ?? [],
      launch: (CONTRACT as any)?.[symbol]?.LAUNCH?.[chainTag] ?? BigInt(0),
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
  if (typeof value === "number" || (!!value && !isNaN((value as unknown as number)))) {
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
