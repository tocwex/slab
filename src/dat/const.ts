import AZIMUTH_CONTRACT from "./contract/azimuth.json";
import ECLIPTIC_CONTRACT from "./contract/ecliptic.json";

export const APP = Object.freeze({
  TAG: "%slab",
  DEBUG: process.env.NODE_ENV !== "production",
});

export const BLOCKCHAIN = Object.freeze({
  ID: Object.freeze({
    ETHEREUM: 1,
    SEPOLIA: 11155111,
  }),
  TAG: Object.freeze({
    1: "ETHEREUM",
    11155111: "SEPOLIA",
  }),
  RPC: Object.freeze({
    ETHEREUM: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
    SEPOLIA: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  }),
});

export const ACCOUNT = Object.freeze({
  NULL: Object.freeze({
    ETHEREUM: "0x0000000000000000000000000000000000000000",
    SEPOLIA: "0x0000000000000000000000000000000000000000",
  }),
});

export const CONTRACT = Object.freeze({
  AZIMUTH: Object.freeze({
    ADDRESS: Object.freeze({
      ETHEREUM: "0x223c067f8cf28ae173ee5cafea60ca44c335fecb",
      SEPOLIA: "0x6EB93da65d19a3e4501210C1B289A0734487ed84",
    }),
    ABI: AZIMUTH_CONTRACT.abi,
  }),
  ECLIPTIC: Object.freeze({
    ADDRESS: Object.freeze({
      ETHEREUM: "0x33EeCbf908478C10614626A9D304bfe18B78DD73",
      SEPOLIA: "0xf81109BE13862261234c24659aF412Fe70a683e4",
    }),
    ABI: ECLIPTIC_CONTRACT.abi,
  }),
});
