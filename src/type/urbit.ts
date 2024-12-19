export type UrbitClan = 'galaxy' | 'star' | 'planet' | 'moon' | 'comet';

export interface UrbitID {
  id: string;
  patp: string;
  clan: UrbitClan;
}
