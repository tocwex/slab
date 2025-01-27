import type { WagmiConfig } from '@web3-onboard/core';
import type { EIP1193Provider } from 'viem';
import type { Address, UrbitID, WalletMeta } from '@/type/slab';
import { TokenboundClient } from '@tokenbound/sdk';
import Safe from '@safe-global/protocol-kit';
import { getAccount, signMessage } from '@web3-onboard/wagmi';
import { keccak256, pad, encodePacked, numberToHex } from 'viem';
import { formContract, formToken, formUrbitID } from '@/lib/util';

export async function signTBSafeTx(
  wallet: WalletMeta,
  tbAccount: Address,
  txHash: string,
): Promise<Address> {
  // NOTE: We can't use `Safe.signHash` because we need the TBA's signature
  // (see EIP-1271: https://eips.ethereum.org/EIPS/eip-1271)
  // const safeTransactionSig = await safeAccount.signHash(safeTransactionHash);
  const txSign = await signMessage(wallet.wagmi, {
    account: wallet.address,
    message: { raw: (txHash as Address) },
  });
  const safeTxSign = encodePacked(
    ["bytes32", "uint256", "uint8", "uint256", "bytes"],
    [pad(tbAccount), BigInt(65), 0, BigInt((txSign.length - 2) / 2), txSign],
  );
  return safeTxSign;
}

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
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  urbit: number | string | UrbitID,
): Promise<Address> {
  const ECLIPTIC = formContract(wallet.chain, "ECL");
  const urbitID: UrbitID = !(typeof urbit === "number" || typeof urbit === "string")
    ? urbit
    : formUrbitID(urbit);

  const address: Address = await tbClient.getAccount({
    tokenContract: ECLIPTIC.address,
    tokenId: urbitID.id,
  });

  return address;
}

export async function fetchUrbitID(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  address: Address,
): Promise<UrbitID> {
  const ECLIPTIC = formToken(wallet.chain, "ECL");
  const { tokenContract, tokenId } = await tbClient.getNFT({
    accountAddress: address,
  });
  if (ECLIPTIC.address !== tokenContract)
    throw Error(`Address ${address} is not a ERC-6551 contract`)
  return formUrbitID(tokenId);
}
