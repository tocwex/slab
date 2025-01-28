import type { WagmiConfig } from '@web3-onboard/core';
import type { EIP1193Provider } from 'viem';
import type {
  Address, Contract, Transaction,
  UrbitID, WalletMeta, Token,
} from '@/type/slab';
import { TokenboundClient } from '@tokenbound/sdk';
import Safe from '@safe-global/protocol-kit';
import { getAccount, readContract, signMessage } from '@web3-onboard/wagmi';
import { keccak256, pad, decodeFunctionData, encodePacked, numberToHex } from 'viem';
import { formContract, formToken, formUrbitID } from '@/lib/util';
import { ABI } from '@/dat/const';

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

export async function fetchToken(
  wallet: WalletMeta,
  identifier: string,
): Promise<Token> {
  const NULL: Contract = formContract(wallet.chain, "NULL");

  let token: Token | undefined = undefined;
  token = formToken(wallet.chain, identifier);
  if (token.address === NULL.address && identifier.startsWith("0x")) {
    const tokenName = ((await readContract(wallet.wagmi, {
      abi: ABI.ERC20,
      address: identifier,
      functionName: "name",
    })) as string);
    const tokenSymbol = ((await readContract(wallet.wagmi, {
      abi: ABI.ERC20,
      address: identifier,
      functionName: "symbol",
    })) as string);
    const tokenDecimals = ((await readContract(wallet.wagmi, {
      abi: ABI.ERC20,
      address: identifier,
      functionName: "decimals",
    })) as number);

    token = {
      address: (identifier as Address),
      // @ts-ignore
      abi: ABI.ERC20,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
    };
  }

  return (token as Token);
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

export async function decodeProposal(
  wallet: WalletMeta,
  data: Address,
): Promise<Transaction> {
  const NULL: Token = formToken(wallet.chain, "NULL");
  let transaction: Transaction = { type: "other" };

  try {
    const { functionName: tbFunc, args: tbArgs } = decodeFunctionData({
      abi: ABI.TOKENBOUND,
      data: data,
    });
    if (tbFunc === "execute") {
      const [tbTo, tbValue, tbData, tbOp] = (tbArgs as [Address, bigint, Address, number]);
      if (tbData === "0x") {
        transaction = {
          type: "transfer",
          to: tbTo,
          amount: tbValue,
          token: formToken(wallet.chain, "ETH"),
        };
      } else {
        try {
          const { functionName: inFunc, args: inArgs } = decodeFunctionData({
            abi: ABI.ERC20,
            data: tbData,
          });
          if (inFunc === "transfer") {
            const [e2To, e2Value] = (inArgs as [Address, bigint]);
            const e2Token = await fetchToken(wallet, tbTo);
            if (e2Token.address !== NULL.address) {
              transaction = {
                type: "transfer",
                to: e2To,
                amount: e2Value,
                token: e2Token,
              };
            }
          }
        } catch (error) {
          const { functionName: inFunc, args: inArgs } = decodeFunctionData({
            abi: ABI.TOCWEX_DEPLOYER_V1,
            data: tbData,
          });
          if (inFunc === "deploySyndicate") {
            const [_, __, tkInitSupply, tkMaxSupply, ___, tkName, tkSymbol] =
              (inArgs as [Address, string, bigint, bigint, number, string, string]);
            transaction = {
              type: "launch",
              amount: tkInitSupply,
              token: {
                address: NULL.address,
                // @ts-ignore
                abi: ABI.ERC20,
                name: tkName,
                symbol: tkSymbol,
                decimals: 18,
              },
            };
          }
        }
      }
    }
  } catch (error) {
    // no-op
  }

  return transaction;
}
