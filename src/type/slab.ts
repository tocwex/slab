export type Nullable<T> = T | undefined;
export type Loadable<T> = T | null | undefined;
export type Address = `0x${string}`;

export type UrbitClan = 'galaxy' | 'star' | 'planet' | 'moon' | 'comet';
export interface UrbitID {
  id: string;
  patp: string;
  clan: UrbitClan;
}

export interface TokenboundAccount {
  address: Address;
  deployed: boolean;
}
