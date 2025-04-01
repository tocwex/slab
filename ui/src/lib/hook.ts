import type { DefaultError, QueryClient } from '@tanstack/query-core';
import type { QueryKey, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useBasicMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(
  keys: QueryKey[],
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
  queryClient?: QueryClient,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const client = useQueryClient(queryClient);

  const baseOptions: UseMutationOptions<TData, TError, TVariables, TContext> = {
    onMutate: async () => {
      await client.cancelQueries({ queryKey: keys?.[0] });
      return await client.getQueryData(keys?.[0]);
    },
    onError: (_, __, oldData) => {
      client.setQueryData(keys?.[0], oldData);
    },
    onSettled: async () => {
      for (const key of keys) {
        // console.log(`invalidating ${key}`);
        await client.invalidateQueries({ queryKey: key, refetchType: "all" });
      }
    },
  };

  const mergedOptions: UseMutationOptions<TData, TError, TVariables, TContext> = Object.fromEntries(
    [...new Set(Object.keys(baseOptions).concat(Object.keys(options)))].map((key: string) => ([
      key,
      async (...args: any[]) => {
        // @ts-ignore
        const baseFunc = baseOptions?.[key];
        // @ts-ignore
        const giveFunc = options?.[key];
        if (giveFunc === undefined) {
          return await baseFunc(...args);
        } else if(baseFunc === undefined) {
          return await giveFunc(...args);
        } else {
          const val = await baseFunc(...args);
          await giveFunc(...args);
          return val;
        }
      },
    ]))
  );

  return useMutation(mergedOptions, client);
}
