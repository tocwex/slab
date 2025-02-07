import type { SafeInfoResponse } from '@safe-global/api-kit';
import type { SafeMultisigTransactionResponse } from '@safe-global/types-kit';
import type { WagmiConfig } from '@web3-onboard/core';
import { Abi } from 'abitype';

export type Nullable<T> = T | null;
export type Loadable<T> = T | null | undefined;
export type Version = `${string}.${string}.${string}`;

export type Address = `0x${string}`;
export type AddressType = 'account' | 'transaction' | 'signature';
export type ChainAddress = `${string}:${Address}`;

export interface Tax {
  fee: number;
  to: Address;
}

export interface WalletMeta {
  wagmi: WagmiConfig;
  address: Address;
  chain: bigint;
  stateID: string;
  chainID: string;
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
  deployer?: Address;
}

export interface TokenHolding {
  token: Token;
  balance: bigint;
}
export type TokenHoldings = Record<string, TokenHolding>;

export interface TokenboundAccount {
  address: Address;
  deployed: boolean;
  holdings: TokenHoldings;
  token?: Token;
}

// `${chain}`           =>       Address                => Token
//  ^-- chain id                ^-- token address           ^-- token type
export type TokenMap = Record<Address, Token>;
export type TokenArchive = Record<string, TokenMap>;
// `${chain}:${Address}` => `${owners.sort().join(",")}` => Address
//   ^-- tba contract           ^-- tba owners               ^-- safe address
export type SafeOwners = Record<string, Address>;
export type SafeArchive = Record<ChainAddress, SafeOwners>;

export interface SafeResponse extends SafeMultisigTransactionResponse {
  transaction: Transaction;
}

export interface SafeAccount extends SafeInfoResponse {
}
