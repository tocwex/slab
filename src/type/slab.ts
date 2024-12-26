export type Nullable<T> = T | undefined;
export type Loadable<T> = T | null | undefined;
export type Address = `0x${string}`;

export type UrbitClan = 'galaxy' | 'star' | 'planet' | 'moon' | 'comet';
export interface UrbitID {
  id: string;
  patp: string;
  clan: UrbitClan;
}

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
}

export interface TokenHolding {
  token: Token;
  balance: number; // TODO: BigNumber?
}

export type TokenHoldings = {
  [symbol: string]: TokenHolding;
};

export interface TokenboundAccount {
  address: Address;
  deployed: boolean;
  holdings: TokenHoldings;
}
