import type {
  Nullable, Address, Contract, Transaction,
  UrbitID, UrbitClan, Token,
} from '@/type/slab';
import type { WalletState } from '@web3-onboard/core';
import { ABI, ACCOUNT, BLOCKCHAIN, CONTRACT } from '@/dat/const';
import * as ob from "urbit-ob";
import { decodeFunctionData, hexToNumber, hexToBigInt } from 'viem';

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

export function formContract(chain: bigint, symbol: string): Contract {
  const chainId: number = Number(chain);
  const chainTag: string = BLOCKCHAIN?.TAG[chainId] ?? BLOCKCHAIN.TAG[BLOCKCHAIN.ID.ETHEREUM];
  return {
    abi: (CONTRACT as any)?.[symbol]?.ABI ?? [],
    address: (CONTRACT as any)?.[symbol]?.ADDRESS?.[chainTag]
      ?? ACCOUNT.NULL?.[chainTag]
      ?? ACCOUNT.NULL?.ETHEREUM,
  };
}

export function formToken(chain: bigint, symbol: string): Token {
  const chainId: number = Number(chain);
  const chainTag: string = BLOCKCHAIN?.TAG[chainId] ?? BLOCKCHAIN.TAG[BLOCKCHAIN.ID.ETHEREUM];
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

export function decodePDOProposal(chain: bigint, data: Address): Transaction {
  const chainId: number = Number(chain);
  const chainTag: string = BLOCKCHAIN?.TAG[chainId] ?? BLOCKCHAIN.TAG[BLOCKCHAIN.ID.ETHEREUM];

  let transaction: Transaction = { type: "other" };

  try {
    const { functionName: tbFunc, args: tbArgs } = decodeFunctionData({
      abi: ABI.TOKENBOUND,
      data: data,
    });
    if (tbFunc === "execute") {
      const [tbTo, tbValue, tbData, tbOp] = (tbArgs as [Address, bigint, Address, number]);
      if (tbData === "0x") {
        transaction = {
          type: "transfer",
          to: tbTo,
          amount: tbValue,
          token: formToken(chain, "ETH"),
        };
      } else {
        try {
          const { functionName: inFunc, args: inArgs } = decodeFunctionData({
            abi: ABI.ERC20,
            data: tbData,
          });
          if (inFunc === "transfer") {
            const [e2To, e2Value] = (inArgs as [Address, bigint]);
            // TODO: Generalize symbol finding to calling "symbol() => string"
            // on the source contract
            const e2Contract: string[] | undefined = Object.values(CONTRACT)
              .map((contract: any) => [contract?.ADDRESS?.[chainTag], contract?.SYMBOL])
              .find(([address, symbol]) => (address === tbTo));
            const e2Symbol: string | undefined = e2Contract?.[1];
            if (e2Symbol !== undefined) {
              transaction = {
                type: "transfer",
                to: e2To,
                amount: e2Value,
                token: formToken(chain, e2Symbol),
              };
            }
          }
        } catch (error) {
          const { functionName: inFunc, args: inArgs } = decodeFunctionData({
            abi: ABI.TOCWEX_DEPLOYER_V1,
            data: tbData,
          });
          if (inFunc === "deploySyndicate") {
            const [tkSupply, _, __, tkName, tkSymbol] =
              (inArgs as [bigint, bigint, number, string, string]);
            transaction = {
              type: "launch",
              amount: tkSupply,
              token: {
                address: ACCOUNT.NULL?.[chainTag] ?? ACCOUNT.NULL.ETHEREUM,
                // @ts-ignore
                abi: ABI.ERC20,
                name: tkName,
                symbol: tkSymbol,
                decimals: 18,
              },
            };
          }
        }
      }
    }
  } catch (error) {
    // no-op
  }

  return transaction;
}
