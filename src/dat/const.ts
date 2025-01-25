import * as _ABI from "./abis";

export const ABI = _ABI;

export const APP = Object.freeze({
  TAG: "%slab",
  DEBUG: process.env.NODE_ENV !== "production",
});

export const BLOCKCHAIN = Object.freeze({
  ID: (Object.freeze({
    ETHEREUM: 1,
    SEPOLIA: 11155111,
  }) as {[network: string]: number;}),
  TAG: (Object.freeze({
    1: "ETHEREUM",
    11155111: "SEPOLIA",
  }) as {[network: number]: string;}),
  SYM: (Object.freeze({
    1: "ETH",
    11155111: "sepETH",
  }) as {[network: number]: string;}),
  RPC: (Object.freeze({
    ETHEREUM: `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`,
    SEPOLIA: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`,
  }) as {[network: string]: string;}),
});

export const ACCOUNT = Object.freeze({
  NULL: (Object.freeze({
    ETHEREUM: "0x0000000000000000000000000000000000000000",
    SEPOLIA: "0x0000000000000000000000000000000000000000",
  }) as {[network: string]: `0x${string}`;}),
});

export const CONTRACT = Object.freeze({
  REGISTRY: Object.freeze({ // ~tocwex.syndiate token registry
    ADDRESS: (Object.freeze({
      ETHEREUM: "0x0", // TODO: Add the address once contract is deployed
      SEPOLIA: "0x83D0cE36BEA6ABd6a0B2121eaF7C6D35f55bEf03",
    }) as {[network: string]: `0x${string}`;}),
    ABI: ABI.TOCWEX_REGISTRY,
  }),
  DEPLOYER_V1: Object.freeze({ // ~tocwex.syndiate token deployer (v1)
    ADDRESS: (Object.freeze({
      ETHEREUM: "0x0", // TODO: Add the address once contract is deployed
      SEPOLIA: "0x33266449147311442e0Deb3393f7a060eEff2d89",
    }) as {[network: string]: `0x${string}`;}),
    ABI: ABI.TOCWEX_DEPLOYER_V1,
  }),
  TOKENBOUND: Object.freeze({ // Tokenbound
    ADDRESS: (Object.freeze({
      ETHEREUM: "0x0", // TODO: Add the address once contract is deployed
      SEPOLIA: "0x5Ee3b4196a20aec5EECDdf57d5AB24dF3cEAdFBe",
    }) as {[network: string]: `0x${string}`;}),
    ABI: ABI.TOKENBOUND,
  }),
  AZP: Object.freeze({ // Azimuth
    ADDRESS: (Object.freeze({
      ETHEREUM: "0x223c067f8cf28ae173ee5cafea60ca44c335fecb",
      SEPOLIA: "0x6EB93da65d19a3e4501210C1B289A0734487ed84",
    }) as {[network: string]: `0x${string}`;}),
    ABI: ABI.AZIMUTH,
  }),
  ECL: Object.freeze({ // Ecliptic
    ADDRESS: (Object.freeze({
      ETHEREUM: "0x33EeCbf908478C10614626A9D304bfe18B78DD73",
      SEPOLIA: "0xf81109BE13862261234c24659aF412Fe70a683e4",
    }) as {[network: string]: `0x${string}`;}),
    NAME: "Azimuth Points",
    SYMBOL: "AZP",
    DECIMALS: 0,
    ABI: ABI.ECLIPTIC,
  }),
  USDC: Object.freeze({
    ADDRESS: (Object.freeze({
      ETHEREUM: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      SEPOLIA: "0xB962E45F33814833744b8a102C7C626a98B32e38",
    }) as {[network: string]: `0x${string}`;}),
    NAME: "USD Coin",
    SYMBOL: "USDC",
    DECIMALS: 6,
    // NOTE: This ABI is a generic ERC20 ABI and not the actual USDC ABI
    // (which is difficult to construct/use due to it being a proxy)
    ABI: ABI.USDC,
  }),
});

// FIXME: These expressions need a lot of work; see more information here:
// https://github.com/urbit/urbit-ob/blob/master/src/internal/co.js
export const REGEX = Object.freeze({
  AZIMUTH: (Object.freeze({
    GALAXY: "~[a-z]{3}",
    STAR: "~[a-z]{6}",
    PLANET: "~[a-z]{6}-[a-z]{6}",
    POINT: "~(([a-z]{3})|([a-z]{6}(-[a-z]{6}){0,3})|([a-z]{6}(-[a-z]{6}){3})--([a-z]{6}(-[a-z]{6}){3}))",
  }) as {[point: string]: string;}),
});
