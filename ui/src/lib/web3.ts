import type { WagmiConfig } from '@web3-onboard/core';
import type { EIP1193Provider, TransactionReceipt } from 'viem';
import type {
  Nullable, Address, Contract, Transfer, Tax, CallData, TBACallData,
  WalletMeta, Token, TokenboundAccount,
  SlabTransferOperation, SlabLaunchOperation, SlabMintOperation, SlabDissolveOperation,
  UrbitNetworkLayer, UrbitID, UrbitAccount, SlabTransaction,
} from '@/type/slab';
import { TokenboundClient } from '@tokenbound/sdk';
import Safe, { getSafeAddressFromDeploymentTx } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { OperationType } from '@safe-global/types-kit';
import {
  getAccount, readContract, signMessage, getEnsAddress,
  sendTransaction, getTransactionReceipt, waitForTransactionReceipt,
} from '@web3-onboard/wagmi';
import {
  keccak256, pad, encodeFunctionData, decodeFunctionData,
  encodePacked, numberToHex, parseUnits,
} from 'viem';
import { normalize } from 'viem/ens'
import {
  clamp, getChainMeta, compareUrbitIDs,
  formContract, formToken, formUrbitID, includeTax,
} from '@/lib/util';
import { URBIT } from '@/dat/apis';
import { ABI, ACCOUNT, BLOCKCHAIN, MATH, SAFE, REGEX, ERROR } from '@/dat/const';

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

export async function submitDirectTx(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  tbTransaction: TBACallData,
): Promise<Address> {
  const transaction: Address = await tbClient.execute(tbTransaction);
  const { transactionHash } = await awaitReceipt(wallet, transaction);
  return transactionHash;
}

export async function submitSafeTx(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  tbTransaction: TBACallData,
  safeAddress: Address,
  signAddress: Address,
): Promise<Address> {
  const transaction: CallData = await tbClient.prepareExecution(tbTransaction);
  const transactionHash = await proposeSafeTx(wallet, transaction, safeAddress, signAddress);
  return transactionHash;
}

export async function proposeSafeTx(
  wallet: WalletMeta,
  transaction: CallData,
  safeAddress: Address,
  signAddress: Address,
): Promise<Address> {
  const safeAccount: Safe = await fetchSafeAccount(wallet, safeAddress);
  const safeTransaction = await safeAccount.createTransaction({
    transactions: [{
      operation: OperationType.Call,
      to: transaction.to,
      data: transaction.data,
      value: transaction.value.toString(),
    }],
  });

  const safeTxHash = await safeAccount.getTransactionHash(safeTransaction);
  const safeTxSign = await signSafeTx(wallet, signAddress, safeTxHash);

  const safeClient = new SafeApiKit({chainId: wallet.chain});
  await safeClient.proposeTransaction({
    safeAddress: safeAddress,
    senderAddress: signAddress,
    senderSignature: safeTxSign,
    safeTransactionData: safeTransaction.data,
    safeTxHash: safeTxHash,
  });

  return (safeTxSign as Address);
}

export async function buildTransferCall(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  account: TokenboundAccount,
  {to, amount, tokenID}: SlabTransferOperation,
): Promise<TBACallData> {
  const NULL: Contract = formContract(wallet.chain, "NULL");
  const TOKEN = await fetchToken(wallet, tokenID);

  const toAddress = await fetchRecipient(wallet, tbClient, to);

  return {
    account: account.address,
    ...((tokenID === NULL.address) ? {
      to: toAddress,
      value: parseUnits(amount, 18),
      data: "0x",
    } : {
      to: TOKEN.address,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: TOKEN.abi,
        functionName: "transfer",
        args: [toAddress, parseUnits(amount, TOKEN.decimals)],
      }),
    }),
  };
}

export async function buildLaunchCall(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  account: TokenboundAccount,
  {name, symbol, init, max, urbitID}: SlabLaunchOperation & {urbitID: string;},
): Promise<TBACallData> {
  if (!!account.token) throw Error(ERROR.YES_TOKEN);

  const DEPLOY_V1: Contract = formContract(wallet.chain, "DEPLOYER_V1");
  const TOKENBOUND: Contract = formContract(wallet.chain, "TOKENBOUND");

  const initSupply = clamp(parseUnits(init, 18), BigInt(0), MATH.MAX_UINT256);
  const maxSupply = clamp(parseUnits(max, 18), BigInt(0), MATH.MAX_UINT256);
  const salt = pad("0x0"); // TODO: Customize or randomize salt?
  if (maxSupply < initSupply)
    throw Error("Maximum token supply must be at least as large as initial supply.");

  return {
    account: account.address,
    to: DEPLOY_V1.address,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: DEPLOY_V1.abi,
      functionName: "deploySyndicate",
      args: [TOKENBOUND.address, salt, initSupply, maxSupply, urbitID, name, symbol],
    }),
  };
}

export async function buildMintCall(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  account: TokenboundAccount,
  {transfers, tax}: SlabMintOperation & {tax: Tax},
): Promise<TBACallData> {
  if (!account?.token) throw Error(ERROR.NO_TOKEN);
  const tokenDecimals: number = account.token.decimals;

  const recipientAddresses: Address[] = await Promise.all(transfers.map(({to}) => (
    fetchRecipient(wallet, tbClient, to)
  )));
  const recipientAmounts: bigint[] = transfers.map(({amount}) => {
    const bigAmount = parseUnits(amount, tokenDecimals);
    return includeTax(bigAmount, tax);
  });

  return {
    account: account.address,
    to: account.token.address,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: ABI.TOCWEX_TOKEN_V1,
      ...((transfers.length === 1) ? ({
        functionName: "mint",
        args: [recipientAddresses[0], recipientAmounts[0]],
      }) : ({
        functionName: "batchMint",
        args: [recipientAddresses, recipientAmounts],
      })),
    }),
  };
}

export async function buildDissolveCall(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  account: TokenboundAccount,
  args: SlabDissolveOperation,
): Promise<TBACallData> {
  if (!account.token) throw Error(ERROR.NO_TOKEN);

  return {
    account: account.address,
    to: account.token.address,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: ABI.TOCWEX_TOKEN_V1,
      functionName: "dissolveSyndicate",
    }),
  };
}

export async function signSafeTx(
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
  if (identifier === NULL.address) {
    token = {
      address: NULL.address,
      abi: [],
      launch: BigInt(0),
      name: BLOCKCHAIN.TAG?.[Number(wallet.chain)] ?? BLOCKCHAIN.TAG[1],
      symbol: BLOCKCHAIN.SYM?.[Number(wallet.chain)] ?? BLOCKCHAIN.SYM[1],
      decimals: 18,
      deployer: undefined,
    };
  } else {
    token = formToken(wallet.chain, identifier);
    // NOTE: Do a remote lookup for tokens not cached locally
    if (token.address === NULL.address && identifier.startsWith("0x")) {
      const tokenName = ((await readContract(wallet.wagmi, {
        abi: ABI.ERC20,
        address: (identifier as Address),
        functionName: "name",
      })) as string);
      const tokenSymbol = ((await readContract(wallet.wagmi, {
        abi: ABI.ERC20,
        address: (identifier as Address),
        functionName: "symbol",
      })) as string);
      const tokenDecimals = ((await readContract(wallet.wagmi, {
        abi: ABI.ERC20,
        address: (identifier as Address),
        functionName: "decimals",
      })) as number);

      const REGISTRY: Contract = formContract(wallet.chain, "REGISTRY");
      const DEPLOYER: Contract = formContract(wallet.chain, "DEPLOYER_V1");
      const isSyndicateToken: boolean = ((await readContract(wallet.wagmi, {
        abi: REGISTRY.abi,
        address: REGISTRY.address,
        functionName: "getSyndicateTokenExistsUsingAddress",
        args: [identifier],
      })) as boolean);
      // FIXME: Is there an easy way to get this information for non-Syndicate
      // tokens?
      let tokenLaunch: bigint = BigInt(0);
      if (isSyndicateToken) {
        // FIXME: This is currently returning 0 for every syndicate
        tokenLaunch = ((await readContract(wallet.wagmi, {
          abi: REGISTRY.abi,
          address: REGISTRY.address,
          functionName: "getSyndicateTokenLaunchTimeUsingAzimuthPoint",
          args: [identifier],
        })) as bigint);
      }

      token = {
        address: (identifier as Address),
        // @ts-ignore
        abi: !isSyndicateToken ? ABI.ERC20 : ABI.TOCWEX_TOKEN_V1,
        launch: tokenLaunch,
        name: tokenName,
        symbol: tokenSymbol,
        decimals: tokenDecimals,
        deployer: !isSyndicateToken ? undefined : DEPLOYER.address,
      };
    }
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

export async function fetchRecipient(
  wallet: WalletMeta,
  tbClient: TokenboundClient,
  recipient: number | string | UrbitID,
): Promise<Address> {
  if (typeof recipient === "string" && recipient.match(REGEX.ETHEREUM.ADDRESS)) {
    return Promise.resolve((recipient as Address));
  } else if (typeof recipient === "string" && recipient.match(REGEX.ETHEREUM.DOMAIN)) {
    return fetchENSAddress(wallet, recipient);
  } else {
    return fetchTBAddress(wallet, tbClient, recipient);
  }
}

export async function fetchENSAddress(
  wallet: WalletMeta,
  domain: string,
): Promise<Address> {
  const NULL: Token = formToken(wallet.chain, "NULL");
  const ensAddress = await getEnsAddress(wallet.wagmi, {
    name: normalize(domain),
  });
  return (ensAddress === null) ? NULL.address : (ensAddress as Address);
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

export async function fetchAzimuthEcliptic(wallet: WalletMeta): Promise<Address> {
  const AZIMUTH: Contract = formContract(wallet.chain, "AZP");
  const azimuthEcliptic = ((await readContract(wallet.wagmi, {
    abi: AZIMUTH.abi,
    address: AZIMUTH.address,
    functionName: "owner",
  })) as Address);
  return azimuthEcliptic;
}

export async function awaitReceipt(
  wallet: WalletMeta,
  hash: Address,
): Promise<TransactionReceipt> {
  // const MAX_ATTEMPTS: number = 5;
  // let attempts: number = 0;
  // let receipt = undefined;
  // while (receipt === undefined && attempts++ < MAX_ATTEMPTS) {
  //   try {
  //     receipt = await waitForTransactionReceipt(wallet.wagmi, {hash, confirmations: 4, timeout: 20000});
  //   } catch (error) {
  //     try {
  //       receipt = await getTransactionReceipt(wallet.wagmi, {hash});
  //     } catch (error) {
  //       // NOTE: no-op; just try again
  //     }
  //   }
  // }
  // if (receipt === undefined) {
  //   throw new Error(`Unable to detect confirmation for transaction '${hash}'`);
  // }

  const receipt = await waitForTransactionReceipt(wallet.wagmi, {
    hash: hash,
    confirmations: 3,
    timeout: 3 * 60 * 1000,
  });

  return receipt;
}

export async function decodeProposal(
  wallet: WalletMeta,
  data: Address,
): Promise<SlabTransaction> {
  const NULL: Token = formToken(wallet.chain, "NULL");

  const decodeFunctions: ((c: Address, d: Address) => Promise<SlabTransaction | undefined>)[] = [
    async (contract: Address, data: Address) => { // ERC20
      const { functionName: func, args: args } = decodeFunctionData({
        abi: ABI.ERC20,
        data: data,
      });
      if (func === "transfer") {
        const [to, amount] = (args as [Address, bigint]);
        const token = await fetchToken(wallet, contract);
        if (token.address !== NULL.address) {
          return {
            type: "transfer",
            to: to,
            amount: amount,
            token: token,
          };
        }
      }
    }, async (contract: Address, data: Address) => { // TOCWEX token
      const { functionName: func, args: args } = decodeFunctionData({
        abi: ABI.TOCWEX_TOKEN_V1,
        data: data,
      });
      if (func === "mint") {
        const [mintAddress, mintAmount] = (args as [Address, bigint]);
        const mintToken = await fetchToken(wallet, contract);
        return {
          type: "mint",
          token: mintToken,
          transfers: [{
            to: mintAddress,
            amount: mintAmount,
          }],
        };
      } else if (func === "batchMint") {
        const [mintAddresses, mintAmounts] = (args as [Address[], bigint[]]);
        const mintToken = await fetchToken(wallet, contract);
        return {
          type: "mint",
          token: mintToken,
          transfers: mintAddresses.map((address, index): Transfer => ({
            to: address,
            amount: mintAmounts[index],
          })),
        };
      } else if (func === "dissolveSyndicate") {
        return {
          type: "dissolve",
        };
      }
    }, async (contract: Address, data: Address) => { // TOCWEX deployer
      const { functionName: func, args: args } = decodeFunctionData({
        abi: ABI.TOCWEX_DEPLOYER_V1,
        data: data,
      });
      if (func === "deploySyndicate") {
        const [, , tkInitSupply, tkMaxSupply, , tkName, tkSymbol] =
          (args as [Address, string, bigint, bigint, number, string, string]);
        return ({
          type: "launch",
          amount: tkInitSupply,
          token: {
            address: NULL.address,
            // @ts-ignore
            abi: ABI.ERC20,
            launch: BigInt(0),
            name: tkName,
            symbol: tkSymbol,
            decimals: 18,
          },
        } as SlabTransaction);
      }
    },
  ];

  let transaction: SlabTransaction = { type: "other" };
  try {
    const { functionName: tbFunc, args: tbArgs } = decodeFunctionData({
      abi: ABI.TOKENBOUND,
      data: data,
    });
    if (tbFunc === "execute") {
      const [tbTo, tbValue, tbData, ] = (tbArgs as [Address, bigint, Address, number]);
      if (tbData === "0x") { // first: eth transfer
        transaction = {
          type: "transfer",
          to: tbTo,
          amount: tbValue,
          token: formToken(wallet.chain, "ETH"),
        };
      } else {  // second: arbitrary decoding
        for (let i = 0; i < decodeFunctions.length && transaction.type === "other"; i++) {
          const decodeFunction = decodeFunctions[i];
          try {
            const decodedTransaction = await decodeFunction(tbTo, tbData);
            transaction = !decodedTransaction ? transaction : decodedTransaction;
          } catch (error) {
            // no-op
          }
        }
      }
    }
  } catch (error) {
    try { // ECLIPTIC
      const { functionName: func, args: args } = decodeFunctionData({
        abi: ABI.ECLIPTIC,
        data: data,
      });
      if (func === "transferPoint") {
        const [syPoint, syTo, syReset] = (args as [bigint, Address, boolean]);
        transaction = {
          type: "terminate",
          point: Number(syPoint),
          to: syTo,
          reset: syReset,
        };
      }
    } catch (error) {
      // no-op
    }
  }

  return transaction;
}

export function compareAPIUrbitIDs(a: UrbitID, b: UrbitID): number {
  const baseCmp: number = compareUrbitIDs(a, b);
  const apiCmp: number = ((cmp) => (cmp(a) - cmp(b)))((u: UrbitID): number => (
    Number(u.patp !== `~${URBIT.ship}`)
  ));
  return [apiCmp, baseCmp].find((n) => (n !== 0)) ?? 0;
}
