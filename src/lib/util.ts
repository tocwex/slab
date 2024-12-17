export function delay(milliseconds: number): Promise<void> {
  return new Promise(res => setTimeout(res, milliseconds));
}

// https://stackoverflow.com/a/33946793
export function rateLimit(maxRequests: number, perSeconds: number): (func: any) => void {
  let frameStart = 0;
  let frameCount = 0;
  let frameQueue = [];
  let untilNext = 0;

  return function limiter(func) {
    func && frameQueue.push(func);
    untilNext = perSeconds * 1000 - (Date.now() - frameStart);
    if (untilNext <= 0) {
      frameStart = Date.now();
      frameCount = 0;
    }
    if (++frameCount <= maxRequests) {
      (frameQueue.shift() ?? (() => null))();
    } else {
      // console.log(`limiting function for ${untilNext/ 1000}s`);
      setTimeout(limiter, untilNext);
    }
  };
}

export function trimAddress(address: string): string {
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
}
