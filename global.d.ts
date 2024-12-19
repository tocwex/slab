declare module 'urbit-ob' {
  function patp(ship: string | number): string;
  function patp2dec(ship: string): number;
  function clan(ship: string): 'galaxy' | 'star' | 'planet' | 'moon' | 'comet';
  function sein(ship: string): string;
  function isValidPatp(ship: string): boolean;
}
