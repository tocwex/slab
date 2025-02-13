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
  fee: bigint; // NOTE: assumed to be between 0 and 10000
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

export type TransactionType = 'transfer' | 'launch' | 'mint' | 'other';
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
export interface MintTransaction {
  type: 'mint';
  to: Address;
  amount: bigint;
  token: Token;
}
export interface OtherTransaction {
  type: 'other';
}
export type Transaction = TransferTransaction | LaunchTransaction | MintTransaction | OtherTransaction;

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

export type UrbitNetworkLayer = 'l1' | 'l2' | 'no';
export interface UrbitL1Account {
  layer: 'l1';
  owner: Address;
}
export interface UrbitL2Account {
  layer: 'l2';
  owner: '0x1111111111111111111111111111111111111111';
}
export interface UrbitNoAccount {
  layer: 'no';
}
export type UrbitAccount = UrbitL1Account | UrbitL2Account | UrbitNoAccount;

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
