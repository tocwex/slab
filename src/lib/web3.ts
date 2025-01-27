import type { WagmiConfig } from '@web3-onboard/core';
import type { EIP1193Provider } from 'viem';
import type { Address, UrbitID, WalletMeta } from '@/type/slab';
import { TokenboundClient } from '@tokenbound/sdk';
import Safe from '@safe-global/protocol-kit';
import { getAccount } from '@web3-onboard/wagmi';
import { keccak256, numberToHex } from 'viem';
import { formContract, formToken, formUrbitID } from '@/lib/util';

export async function fetchSafeAccount(
  wallet: WalletMeta,
  deployment: Address | [Address[], number],
): Promise<Safe> {
  // NOTE: Formula for extracting "provider" from Wagmi taken from:
  // https://github.com/wevm/wagmi/discussions/639#discussioncomment-9588515
  const { connector } = await getAccount(wallet.wagmi);
  const provider = await connector?.getProvider();
  if (!provider) throw Error("EIP1193Provider unavailable");

  const safeAccount: Safe = await Safe.init({
    // @ts-ignore
    provider: (provider as EIP1193Provider),
    signer: wallet.address,
    ...(!Array.isArray(deployment) ? {
      safeAddress: deployment,
    } : {
      predictedSafe: {
        safeAccountConfig: {
          owners: deployment[0],
          threshold: deployment[1],
        },
        safeDeploymentConfig: {
          saltNonce: keccak256(numberToHex(Date.now())),
          safeVersion: "1.4.1",
        },
      },
    }),
  });

  return safeAccount;
}

export async function fetchTBAddress(
  tbClient: TokenboundClient,
  urbit: number | string | UrbitID,
  chain: bigint,
): Promise<Address> {
  const ECLIPTIC = formContract(chain, "ECL");
  const urbitID: UrbitID = !(typeof urbit === "number" || typeof urbit === "string")
    ? urbit
    : formUrbitID(urbit);

  const address: Address = await tbClient.getAccount({
    tokenContract: ECLIPTIC.address,
    tokenId: urbitID.id,
  });

  return address;
}
