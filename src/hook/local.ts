import type {
  Loadable, Address, ChainAddress, Token,
  TokenMap, TokenArchive, SafeOwners, SafeArchive,
} from '@/type/slab';
import type { QueryKey, UseMutationOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWalletMeta } from '@/hook/wallet';
import { fetchToken } from '@/lib/web3';
import { formContract, encodeSet, decodeSet } from '@/lib/util';
import { get as getLocal, update as updateLocal } from '@/dat/local';
import { APP, ERROR } from '@/dat/const';

export function useTokensAddMutation(
  options?: UseMutationOptions<Token, unknown, any, unknown>,
) {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "local", "tokens", wallet?.chainID,
  ], [wallet?.chainID]);
  const tbaKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "account", wallet?.chainID,
  ], [wallet?.chainID]);

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({address}: {
      address: Address,
    }) => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const token = await fetchToken(wallet, address);
      // TODO: Add requirement for syndicate token?
      // if (!token.deployer) throw Error("Token is not a valid syndicate token");

      const chainKey = `${wallet.chain}`;
      await updateLocal("tokens", (oldArchive: TokenArchive | undefined) => {
        const newArchive: TokenArchive = (oldArchive ?? {});
        const oldTokenMap: TokenMap = (newArchive?.[chainKey] ?? {});
        const newTokenMap = {...oldTokenMap, ...({
          [token.address]: token,
        })};
        newArchive[chainKey] = newTokenMap;
        return newArchive;
      });

      return token;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      return await queryClient.getQueryData(queryKey);
    },
    onError: (err, variables, oldData) => {
      queryClient.setQueryData(queryKey, oldData);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: tbaKey });
    },
    ...options,
  });
}

export function useLocalTokens(): Loadable<TokenMap> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "local", "tokens", wallet?.chainID,
  ], [wallet?.chainID]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const localTokens = (((await getLocal("tokens")) ?? {}) as TokenArchive);
      return ((localTokens?.[`${wallet.chain}`] ?? {}) as TokenMap);
    },
    enabled: !!wallet,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as TokenMap);
}

export function useLocalSafes(): Loadable<SafeOwners> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "local", "safes", wallet?.chainID,
  ], [wallet?.chainID]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const localArchive = (((await getLocal("safes")) ?? {}) as SafeArchive);
      const tbContract = formContract(wallet.chain, "TOKENBOUND");
      const tbKey: ChainAddress = `${wallet.chain}:${tbContract.address}`;
      return ((localArchive?.[tbKey] ?? {}) as SafeOwners);
    },
    enabled: !!wallet,
    staleTime: Infinity,
    retryOnMount: false,
    refetchOnMount: false,
  });

  return isLoading ? undefined
    : isError ? null
    : (data as SafeOwners);
}
