import type {
  Loadable, Nullable, Address,
  Contract, UrbitID, WalletMeta,
} from '@/type/slab';
import type { Config as WagmiConfig } from '@wagmi/core';
import { useMemo } from 'react';
import { QueryKey, useQuery } from '@tanstack/react-query';
import { useConnectWallet, useWagmiConfig } from '@web3-onboard/react'
import { readContract, getWalletClient } from '@web3-onboard/wagmi';
import { TokenboundClient } from '@tokenbound/sdk';
import { hexToBigInt } from 'viem';
import { fetchTBAddress } from '@/lib/web3';
import { formContract, formUrbitID, compareUrbitIDs } from '@/lib/util';
import { APP, ACCOUNT, BLOCKCHAIN, CONTRACT, ERROR } from '@/dat/const';

export function useWalletUrbitTBAs(): Loadable<Record<Address, UrbitID>> {
  const wallet = useWalletMeta();
  return useUrbitTBAs(wallet?.address ?? ACCOUNT.NULL.ETHEREUM);
}

export function useUrbitTBAs(account: Address): Loadable<Record<Address, UrbitID>> {
  const wallet = useWalletMeta();
  const tbClient = useTokenboundClient();
  const urbitIDs = useUrbitIDs(account);
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "wallet", "urbit-tbas", wallet?.chainID, account,
  ], [wallet?.chainID, account]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet && !!tbClient && !!urbitIDs,
    queryFn: async () => {
      if (!wallet || !tbClient || !urbitIDs) throw Error(ERROR.INVALID_QUERY);
      const tbAddresses: Record<Address, UrbitID> = {};
      for (const urbitID of urbitIDs) {
        const tbAddress = await fetchTBAddress(wallet, tbClient, urbitID);
        tbAddresses[tbAddress] = urbitID;
      }
      return tbAddresses;
    },
  });

  return isLoading ? undefined
    : isError ? null
    : (data as Record<Address, UrbitID>);
}

export function useWalletUrbitIDs(): Loadable<UrbitID[]> {
  const wallet = useWalletMeta();
  return useUrbitIDs(wallet?.address ?? ACCOUNT.NULL.ETHEREUM);
}

export function useUrbitIDs(account: Address): Loadable<UrbitID[]> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "wallet", "urbit-ids", wallet?.chainID, account,
  ], [wallet?.chainID, account]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const azimuth: Contract = formContract(wallet.chain, "AZP");
      const points = await readContract(wallet.wagmi, {
        abi: azimuth.abi,
        address: azimuth.address,
        functionName: "getOwnedPoints",
        args: [account],
      });
      return (points as number[]).map(formUrbitID).sort(compareUrbitIDs);
    },
  });

  return isLoading ? undefined
    : isError ? null
    : (data as UrbitID[]);
}

export function useTokenboundClient(): Loadable<TokenboundClient> {
  const wallet = useWalletMeta();
  const queryKey: QueryKey = useMemo(() => [
    APP.TAG, "tokenbound", "client", wallet?.chainID,
  ], [wallet?.chainID]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!wallet,
    queryFn: async () => {
      if (!wallet) throw Error(ERROR.INVALID_QUERY);
      const walletClient = await getWalletClient(wallet.wagmi);
      return new TokenboundClient({
        walletClient: walletClient,
        chainId: Number(wallet.chain),
        implementationAddress: formContract(wallet.chain, "TOKENBOUND").address,
      });
    },
  });

  return isLoading ? undefined
    : isError ? null
    : (data as TokenboundClient);
}

export function useWalletMeta(): Nullable<WalletMeta> {
  const [{wallet}, , ] = useConnectWallet();
  const wagmiConfig = useWagmiConfig();

  return useMemo(() => {
    const status: string | undefined = wagmiConfig?.state?.status;
    const chain: bigint = hexToBigInt(((wallet?.chains?.[0]?.id ?? "0x0") as Address));
    const address: Address = wallet?.accounts?.[0]?.address ?? ACCOUNT.NULL.ETHEREUM;

    return (status === undefined || status === "disconnected")
      ? null
      : {
        wagmi: (wagmiConfig as WagmiConfig),
        chain: chain,
        address: address,
        stateID: `${chain}:${address}`,
        chainID: (BLOCKCHAIN.TAG?.[Number(chain)] ?? "unknown").toLowerCase(),
      };
  }, [wallet?.chains?.[0]?.id, wallet?.accounts?.[0]?.address]);
}
