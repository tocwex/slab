import { QueryClient } from '@tanstack/react-query'
import { APP } from '@/dat/const';

const reactqueryClientSingleton = () => (new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity,
      staleTime: Infinity,
      retryOnMount: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      retry: 3,
    },
  },
}));

declare const globalThis: {
  reactqueryGlobal: ReturnType<typeof reactqueryClientSingleton>;
} & typeof global;

export const react_query = globalThis.reactqueryGlobal ?? reactqueryClientSingleton();

if (APP.DEBUG) globalThis.reactqueryGlobal = react_query;
