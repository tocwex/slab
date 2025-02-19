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
  const basicOptions: UseMutationOptions<TData, TError, TVariables, TContext> = {
    onMutate: async () => {
      await client.cancelQueries({ queryKey: keys?.[0] });
      return await client.getQueryData(keys?.[0]);
    },
    onError: (_, __, oldData) => {
      client.setQueryData(keys?.[0], oldData);
    },
    onSettled: async () => {
      for (const key of keys) {
        await client.invalidateQueries({ queryKey: key });
      }
    },
  };

  return useMutation(
    {...basicOptions, ...options},
    queryClient,
  );
}
