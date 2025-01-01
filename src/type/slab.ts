import type { SafeInfoResponse } from '@safe-global/api-kit';
import type { WagmiConfig } from '@web3-onboard/core';
import { Abi } from 'abitype';

export type Nullable<T> = T | null;
export type Loadable<T> = T | null | undefined;

export type Address = `0x${string}`;
export type AddressType = 'account' | 'transaction' | 'signature';

export interface WalletMeta {
  stateId: string;
  wagmi: WagmiConfig;
  address: Address;
  chainId: bigint;
}

export type UrbitClan = 'galaxy' | 'star' | 'planet' | 'moon' | 'comet';
export interface UrbitID {
  id: string;
  patp: string;
  clan: UrbitClan;
}

export interface Contract {
  address: Address;
  abi: Abi;
}
export interface Token extends Contract {
  name: string;
  symbol: string;
  decimals: number;
}

export interface TokenHolding {
  token: Token;
  balance: bigint;
}
export type TokenHoldings = {
  [symbol: string]: TokenHolding;
};

export interface TokenboundAccount {
  address: Address;
  deployed: boolean;
  holdings: TokenHoldings;
}

export interface SafeAccount extends SafeInfoResponse {
  ownurs: UrbitID[]; // parallel to `safe.owners`
}
