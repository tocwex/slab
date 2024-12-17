export type UrbitClan = 'galaxy' | 'star' | 'planet' | 'moon' | 'comet';

export interface UrbitID {
  id: number;
  patp: string;
  clan: UrbitClan;
}
