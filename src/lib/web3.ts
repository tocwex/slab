import type { WagmiConfig } from '@web3-onboard/core';
import type { EIP1193Provider, TransactionReceipt } from 'viem';
import type {
  Address, Contract, Transfer, Token, UrbitNetworkLayer,
  UrbitID, UrbitAccount, WalletMeta, SlabTransaction,
} from '@/type/slab';
import { TokenboundClient } from '@tokenbound/sdk';
import Safe, { getSafeAddressFromDeploymentTx } from '@safe-global/protocol-kit';
import {
  getAccount, readContract, signMessage,
  sendTransaction, getTransactionReceipt, waitForTransactionReceipt,
} from '@web3-onboard/wagmi';
import {
  keccak256, pad, decodeFunctionData,
  encodePacked, numberToHex,
} from 'viem';
import { getChainMeta, formContract, formToken, formUrbitID } from '@/lib/util';
import { ABI, ACCOUNT, SAFE } from '@/dat/const';

export async function createSafe(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  owners: Address[],
  threshold: number,
): Promise<Address> {
  const safeAccount: Safe = await fetchSafeAccount(wallet, [owners, threshold]);

  const deployTransaction = await safeAccount.createSafeDeploymentTransaction();
  // @ts-ignore
  const deployTxHash = await sendTransaction(wallet.wagmi, deployTransaction);
  const deployReceipt = await awaitReceipt(wallet, deployTxHash);

  const safeAddress = getSafeAddressFromDeploymentTx(deployReceipt, SAFE.VERSION);
  return (safeAddress as Address);
}

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
  // NOTE: Do a remote lookup for tokens not cached locally
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

    const REGISTRY: Contract = formContract(wallet.chain, "REGISTRY");
    const DEPLOYER: Contract = formContract(wallet.chain, "DEPLOYER_V1");
    const isSyndicateToken = ((await readContract(wallet.wagmi, {
      abi: REGISTRY.abi,
      address: REGISTRY.address,
      functionName: "getSyndicateTokenExistsUsingAddress",
      args: [identifier],
    })) as boolean);

    token = {
      address: (identifier as Address),
      // @ts-ignore
      abi: ABI.ERC20,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      deployer: !isSyndicateToken ? undefined : DEPLOYER.address,
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
          safeVersion: SAFE.VERSION,
        },
      },
    }),
  });

  return safeAccount;
}

export async function fetchUrbitAccount(
  wallet: WalletMeta,
  urbit: number | string | UrbitID,
): Promise<UrbitAccount> {
  const [ , chainTag] = getChainMeta(wallet.chain);
  const AZP_L2: Address = ACCOUNT.AZP_L2?.[chainTag] ?? ACCOUNT.AZP_L2.ETHEREUM;
  const ECLIPTIC: Token = formToken(wallet.chain, "ECL");
  const urbitID: UrbitID = !(typeof urbit === "number" || typeof urbit === "string")
    ? urbit
    : formUrbitID(urbit);

  let owner: Address = AZP_L2;
  let layer: UrbitNetworkLayer = "l2";
  const pointExists: boolean = ((await readContract(wallet.wagmi, {
    abi: ECLIPTIC.abi,
    address: ECLIPTIC.address,
    functionName: "exists",
    args: [urbitID.id],
  })) as boolean);
  if (pointExists) {
    owner = ((await readContract(wallet.wagmi, {
      abi: ECLIPTIC.abi,
      address: ECLIPTIC.address,
      functionName: "ownerOf",
      args: [urbitID.id],
    })) as Address);
    layer = (owner === AZP_L2) ? "l2" : "l1";
  }

  // @ts-ignore
  return { layer, owner };
}

export async function fetchTBAddress(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  urbit: number | string | UrbitID,
): Promise<Address> {
  const REGISTRY = formContract(wallet.chain, "REGISTRY");
  const urbitID: UrbitID = !(typeof urbit === "number" || typeof urbit === "string")
    ? urbit
    : formUrbitID(urbit);

  const address: Address = await tbClient.getAccount({
    tokenContract: REGISTRY.address,
    tokenId: urbitID.id,
  });

  return address;
}

export async function fetchUrbitID(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  address: Address,
): Promise<UrbitID> {
  const REGISTRY = formToken(wallet.chain, "REGISTRY");
  const { tokenContract, tokenId } = await tbClient.getNFT({
    accountAddress: address,
  });
  if (REGISTRY.address.toLowerCase() !== tokenContract.toLowerCase())
    throw Error(`Address ${address} is not a ERC-6551 contract`)
  return formUrbitID(tokenId);
}

export async function awaitReceipt(
  wallet: WalletMeta,
  hash: Address,
): Promise<TransactionReceipt> {
  const MAX_ATTEMPTS: number = 5;

  let attempts: number = 0;
  let receipt = undefined;
  while (receipt === undefined && attempts++ < MAX_ATTEMPTS) {
    try {
      receipt = await waitForTransactionReceipt(wallet.wagmi, {hash, confirmations: 4, timeout: 20000});
    } catch (error) {
      try {
        receipt = await getTransactionReceipt(wallet.wagmi, {hash});
      } catch (error) {
        // NOTE: no-op; just try again
      }
    }
  }
  if (receipt === undefined) {
    throw new Error(`Unable to detect confirmation for transaction '${hash}'`);
  }

  return receipt;
}

export async function decodeProposal(
  wallet: WalletMeta,
  data: Address,
): Promise<SlabTransaction> {
  const NULL: Token = formToken(wallet.chain, "NULL");
  let transaction: SlabTransaction = { type: "other" };

  try {
    const { functionName: tbFunc, args: tbArgs } = decodeFunctionData({
      abi: ABI.TOKENBOUND,
      data: data,
    });
    if (tbFunc === "execute") {
      const [tbTo, tbValue, tbData, tbOp] = (tbArgs as [Address, bigint, Address, number]);
      if (tbData === "0x") { // first: ETH transfer
        transaction = {
          type: "transfer",
          to: tbTo,
          amount: tbValue,
          token: formToken(wallet.chain, "ETH"),
        };
      } else {  // second: ERC20 transfer
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
        } catch (error) { // third: Syndicate mint
          try {
            const { functionName: inFunc, args: inArgs } = decodeFunctionData({
              abi: ABI.TOCWEX_TOKEN_V1,
              data: tbData,
            });
            if (inFunc === "mint") {
              const [mintAddress, mintAmount] = (inArgs as [Address, bigint]);
              const mintToken = await fetchToken(wallet, tbTo);
              transaction = {
                type: "mint",
                token: mintToken,
                transfers: [{
                  to: mintAddress,
                  amount: mintAmount,
                }],
              };
            } else if (inFunc === "batchMint") {
              const [mintAddresses, mintAmounts] = (inArgs as [Address[], bigint[]]);
              const mintToken = await fetchToken(wallet, tbTo);
              transaction = {
                type: "mint",
                token: mintToken,
                transfers: mintAddresses.map((address, index): Transfer => ({
                  to: address,
                  amount: mintAmounts[index],
                })),
              };
            }
          } catch (error) { // fourth: Syndicate deployment
            const { functionName: inFunc, args: inArgs } = decodeFunctionData({
              abi: ABI.TOCWEX_DEPLOYER_V1,
              data: tbData,
            });
            if (inFunc === "deploySyndicate") {
              const [, , tkInitSupply, tkMaxSupply, , tkName, tkSymbol] =
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
    }
  } catch (error) {
    // no-op
  }

  return transaction;
}
