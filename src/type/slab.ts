import type { SafeInfoResponse } from '@safe-global/api-kit';
import type { SafeMultisigTransactionResponse } from '@safe-global/types-kit';
import type { WagmiConfig } from '@web3-onboard/core';
import { Abi } from 'abitype';

export type Nullable<T> = T | null;
export type Loadable<T> = T | null | undefined;

export type Address = `0x${string}`;
export type AddressType = 'account' | 'transaction' | 'signature';

export interface WalletMeta {
  stateID: string;
  wagmi: WagmiConfig;
  address: Address;
  chainID: bigint;
}

export type UrbitClan = 'galaxy' | 'star' | 'planet' | 'moon' | 'comet';
export interface UrbitID {
  id: string;
  patp: string;
  clan: UrbitClan;
}

export type TransactionType = 'transfer' | 'launch' | 'other';
export interface TransferTransaction {
  type: 'transfer';
  to: Address;
  amount: bigint;
  token: Token;
}
export interface LaunchTransaction {
  type: 'launch';
  amount: bigint;
  token: Token;
}
export interface OtherTransaction {
  type: 'other';
}
export type Transaction = TransferTransaction | LaunchTransaction | OtherTransaction;

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
  token?: Token;
}

export interface SafeResponse extends SafeMultisigTransactionResponse {
  transaction: Transaction;
}

export interface SafeAccount extends SafeInfoResponse {
  ownurs: UrbitID[]; // parallel to `safe.owners`
}
