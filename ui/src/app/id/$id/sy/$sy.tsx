import type { UrbitID, Address } from "@/type/slab";
import React, { useState, useCallback, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useRouteUrbitID, useRouteUrbitSyndicate } from '@/hook/app';
import {
  SafeAccountMeta, TokenboundAccountTransferModule, SyndicateTokenPropModule,
} from '@/comp/Accounts';
import {
  LoadingFrame, WideFrame, AddressFrame, UrbitIDFrame, TBAFrame,
} from '@/comp/Frames';
import { CurrencyInput, TextInput, RecipientInput } from '@/comp/Forms';
import { TinyLoadingIcon } from '@/comp/Icons';
import {
  useTokenboundAccount, useSafeProposals, useDeployerTax, useSyndicateTax,
  useTokenboundCreateMutation, useTokenboundTransferMutation,
  useSyndicateTransferMutation, useSyndicateSignMutation, useSyndicateExecMutation,
  useSyndicateMintMutation, useSyndicateLaunchMutation, useSyndicateTerminateMutation,
  useSyndicateDissolveMutation,
} from '@/hook/web3';
import { useLocalTokens } from '@/hook/local';
import { parseForm, applyTax, formatTax, formatToken } from '@/lib/util';
import { ACCOUNT, REGEX } from '@/dat/const';

export const Route = createFileRoute('/id/$id/sy/$sy')({
  // head: ({ params }) => ({
  //   meta: [
  //     { title: `%slab | ${params?.sy ?? '<unknown>'} syndicate` },
  //   ],
  // }),
  component: (): React.ReactNode => {
    const termFormRef = useRef<HTMLFormElement>(null);
    const [isAdvancedShown, setIsAdvancedShown] = useState<boolean>(false);

    const urbitID: UrbitID = (useRouteUrbitID() as UrbitID);
    const urbitSyndicate: UrbitID = (useRouteUrbitSyndicate() as UrbitID);
    const localTokens = useLocalTokens();
    const idAccount = useTokenboundAccount(urbitID);
    const syAccount = useTokenboundAccount(urbitSyndicate);
    const syProposals = useSafeProposals(urbitSyndicate);
    const twTax = useDeployerTax();
    const syTax = useSyndicateTax(urbitSyndicate);

    const { mutate: sySignMutate, status: sySignStatus } =
      useSyndicateSignMutation(urbitID, urbitSyndicate);
    const { mutate: syExecMutate, status: syExecStatus } =
      useSyndicateExecMutation(urbitSyndicate);
    const { mutateAsync: syTransferMutate, status: syTransferStatus } =
      useSyndicateTransferMutation(urbitID, urbitSyndicate);
    const { mutateAsync: syTerminateMutate, status: syTerminateStatus } =
      useSyndicateTerminateMutation(urbitID, urbitSyndicate);
    const { mutateAsync: syLaunchMutate, status: syLaunchStatus } =
      useSyndicateLaunchMutation(urbitID, urbitSyndicate);
    const { mutateAsync: syMintMutate, status: syMintStatus } =
      useSyndicateMintMutation(urbitID, urbitSyndicate);
    const { mutateAsync: syDissolveMutate, status: syDissolveStatus } =
      useSyndicateDissolveMutation(urbitID, urbitSyndicate);

    const toggleAdvancedShown = useCallback(() => (
      setIsAdvancedShown(!isAdvancedShown)
    ), [isAdvancedShown, setIsAdvancedShown]);

    const onSign = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
      const signHash = (event.currentTarget as HTMLButtonElement).dataset.hash;
      sySignMutate({txHash: (signHash as Address)});
    }, [sySignMutate]);

    const onExec = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
      const execHash = (event.currentTarget as HTMLButtonElement).dataset.hash;
      syExecMutate({txHash: (execHash as Address)});
    }, [syExecMutate]);

    const onTerminate = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
      const fields = parseForm(event, {
        recipient: "0x0",
        breach: false,
      });
      fields && syTerminateMutate(fields).then(() => termFormRef.current?.reset());
    }, [syTerminateMutate, termFormRef]);

    return (
      <div className="main">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold underline">
            {urbitSyndicate.patp} Syndicate
          </h1>
          <h2 className="text-2xl font-bold">
            Operating as {urbitID.patp}
          </h2>
        </div>
        <SafeAccountMeta urbitID={urbitSyndicate} />
        <LoadingFrame title="Tokenbound Account" size="md" status={idAccount && syAccount}>
          {(!!idAccount && !!syAccount && !!localTokens && syAccount.deployed) && (
            <div className="main">
              <TokenboundAccountTransferModule
                urbitID={urbitSyndicate}
                transfer={syTransferMutate}
                status={syTransferStatus}
              />
              <SyndicateTokenPropModule
                urbitID={urbitSyndicate}
                launch={syLaunchMutate}
                launchStatus={syLaunchStatus}
                mint={syMintMutate}
                mintStatus={syMintStatus}
                dissolve={syDissolveMutate}
                dissolveStatus={syDissolveStatus}
              />
              <div className="flex flex-col gap-2 items-center">
                <h2 className="text-2xl">
                  Syndicate Operations
                </h2>
                {(syAccount.token !== undefined) ? (
                  <div>(no operations found)</div>
                ) : (
                  <form ref={termFormRef} className="flex flex-col items-center gap-2">
                    <RecipientInput name="recipient" required
                      placeholder="exit address/ens"
                    />
                    <>
                      <button type="button" onClick={toggleAdvancedShown} className="text-xl">
                        {isAdvancedShown ? "- Hide" : "+ Show"} Advanced Options
                      </button>
                      <div className={`
                        flex flex-col items-center gap-2 max-w-72
                        ${isAdvancedShown ? "block" : "hidden"}
                      `}>
                        <p>
                          Checking this box will perform a 'factory reset' and breach
                          continuity of your urbit's networking. If you know what that
                          means, you'll also need to set your networking keys. If you
                          don't know what that means, turn around, because there be
                          dragons here.
                        </p>
                        <div className="flex flex-row items-center gap-2">
                          <input type="checkbox" name="breach" />
                          <span>reset on creation?</span>
                        </div>
                      </div>
                    </>
                    <button type="button"
                      disabled={(syTerminateStatus === "pending")}
                      onClick={onTerminate}
                      className="w-full buttoff-lg"
                    >
                      {(syTerminateStatus === "pending") ? (
                        <TinyLoadingIcon />
                      ) : (syTerminateStatus === "error") ? (
                        "Error!"
                      ) : (
                        "Propose Termination"
                      )}
                    </button>
                  </form>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-2xl">
                  Syndicate Proposals
                </h2>
                {(syProposals === undefined || twTax === undefined || syTax === undefined) ? (
                  <TinyLoadingIcon />
                ) : (syProposals === null || twTax === null || syTax === null) ? (
                  <div>error</div>
                ) : (syProposals === false || twTax === false || syTax === false) ? (
                  <div>error</div>
                ) : (syProposals.length === 0) ? (
                  <div>(no proposals found)</div>
                ) : (
                  <div className="min-w-96 w-full flex flex-col items-center gap-2">
                    {syProposals.map(({safeTxHash, transaction, confirmations, confirmationsRequired}) => {
                      const confirms = (confirmations ?? []);
                      return (
                        <div
                          key={safeTxHash}
                          className="w-full flex flex-row border-2 border-white rounded-md gap-2 p-3"
                        >
                          <div className="w-7/12 flex flex-col gap-2 items-center">
                            <span className="font-bold underline">
                              {(transaction.type === "transfer") ? (
                                `Transfer ${formatToken(transaction.amount, transaction.token, true)}`
                              ) : (transaction.type === "launch") ? (
                                `Launch \$${transaction.token.symbol}`
                              ) : (transaction.type === "dissolve") ? (
                                `Dissolve \$${syAccount.token?.symbol ?? "???"}`
                              ) : (transaction.type === "terminate") ? (
                                `Terminate ${urbitSyndicate.patp} Syndicate`
                              ) : (transaction.type === "mint") ? (
                                `Mint ${formatToken(
                                  transaction.transfers.reduce((a, {amount: n}) => a + n, BigInt(0)),
                                  transaction.token,
                                  true,
                                )}`
                              ) : (
                                "Execute Transaction"
                              )}
                            </span>
                            <div className="w-full h-full flex flex-col gap-1 justify-center text-sm">
                              {(transaction.type === "transfer") ? (
                                <WideFrame
                                  title={formatToken(transaction.amount, transaction.token)}
                                >
                                  <TBAFrame address={transaction.to} short={true} />
                                </WideFrame>
                              ) : (transaction.type === "dissolve") ? (
                                <WideFrame title="Syndicate">
                                  <UrbitIDFrame urbitID={urbitSyndicate} link={false} />
                                </WideFrame>
                              ) : (transaction.type === "terminate") ? (
                                <>
                                  <WideFrame title="Recipient">
                                    <TBAFrame address={transaction.to} short={true} />
                                  </WideFrame>
                                  <WideFrame title="Factory Reset?">
                                    {transaction.reset ? "Yes" : "No"}
                                  </WideFrame>
                                </>
                              ) : (transaction.type === "launch") ? (
                                <>
                                  <WideFrame title="Mint Total">
                                    {formatToken(transaction.amount, transaction.token, true)}
                                  </WideFrame>
                                  <WideFrame title="Protocol Fee">
                                    {formatTax(twTax)}
                                  </WideFrame>
                                  <WideFrame title="Syndicate Receives">
                                    {
                                      formatToken(
                                        transaction.amount - applyTax(transaction.amount, twTax),
                                        transaction.token,
                                      )
                                    }
                                  </WideFrame>
                                </>
                              ) : (transaction.type === "mint") ? (
                                <>
                                  {transaction.transfers.map(({amount, to}) => (
                                    <WideFrame key={to}
                                      title={formatToken(
                                        amount - applyTax(amount, syTax),
                                        transaction.token,
                                      )}
                                    >
                                      <TBAFrame address={to} short={true} />
                                    </WideFrame>
                                  ))}
                                  <WideFrame
                                    title={formatToken(
                                      applyTax(
                                        transaction.transfers.reduce(
                                          (a, {amount: n}) => a + n, BigInt(0)
                                        ),
                                        syTax,
                                      ),
                                      transaction.token,
                                    )}
                                  >
                                    Protocol Fee
                                  </WideFrame>
                                </>
                              ) : (
                                <AddressFrame
                                  address={(safeTxHash as Address)}
                                  type="signature"
                                  className="italic"
                                />
                              )}
                            </div>
                          </div>
                          <div className="w-5/12 flex flex-col gap-2 pl-2 border-l border-white">
                            <h4 className="font-medium">
                              Signed by ({confirms.length} / {confirmationsRequired}):
                            </h4>
                            <ul>
                              {confirms.map(({owner}) => (
                                <li key={owner}>
                                  <TBAFrame address={(owner as Address)} short={true} className="text-sm" />
                                </li>
                              ))}
                            </ul>
                            <hr />
                            {(confirms.length >= confirmationsRequired) ? (
                              <button type="button"
                                data-hash={safeTxHash}
                                onClick={onExec}
                                disabled={syExecStatus === "pending"}
                                className="w-full button-lg"
                              >
                                {(syExecStatus === "pending") ? (
                                  <TinyLoadingIcon />
                                ) : (syExecStatus === "error") ? (
                                  "Error!"
                                ) : (
                                  "Execute"
                                )}
                              </button>
                            ) : (
                              <button type="button"
                                data-hash={safeTxHash}
                                onClick={onSign}
                                disabled={
                                  confirms.some(({owner}) => owner === idAccount?.address)
                                  || (sySignStatus === "pending")
                                }
                                className="w-full button-lg"
                              >
                                {(sySignStatus === "pending") ? (
                                  <TinyLoadingIcon />
                                ) : (sySignStatus === "error") ? (
                                  "Error!"
                                ) : (
                                  "Sign"
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </LoadingFrame>
      </div>
    );
  },
});
