import type {
  Nullable, Address, Contract, Transaction,
  UrbitID, UrbitClan, Token,
} from '@/type/slab';
import type { WalletState } from '@web3-onboard/core';
import { ABI, ACCOUNT, BLOCKCHAIN, CONTRACT } from '@/dat/const';
import * as ob from "urbit-ob";
import { hexToNumber, hexToBigInt } from 'viem';

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

export function trimAddress(address: string): string {
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
}

export function hasClanBoon(urbit: UrbitID, clan: UrbitClan): boolean {
  const CLAN_INDEX = Object.freeze({
    galaxy: 0,
    star: 1,
    planet: 2,
    moon: 3,
    comet: 4,
  });
  return CLAN_INDEX[urbit.clan] <= CLAN_INDEX[clan];
}

export function getChainMeta(chain: bigint): [number, string] {
  const chainId: number = Number(chain);
  const chainTag: string = BLOCKCHAIN?.TAG[chainId] ?? BLOCKCHAIN.TAG[BLOCKCHAIN.ID.ETHEREUM];
  return [chainId, chainTag];
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
