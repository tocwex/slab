"use client";
import React, { useMemo } from 'react';
import { TinyLoadingIcon } from '@/comp/Icons';
import { useTokenboundAccount, useUrbitAccount, useTokenboundCreateMutation } from '@/hook/web3';
import { formUrbitID } from '@/lib/util';
import { REGEX } from '@/dat/const';

export function CurrencyInput({
  placeholder="currency amount",
  className="input-lg",
  ...props
}: Omit<
  React.ComponentProps<"input">,
  "type" | "min" | "max" | "step"
>): React.ReactNode {
  return (
    <input type="number"
      min="0.0001"
      max="100000000"
      step="0.0001"
      className={className}
      placeholder={placeholder}
      {...props}
    />
  );
}

export function TextInput({
  className="input-lg",
  ...props
}: Omit<
  React.ComponentProps<"input">,
  "type" | "autoComplete" | "autoCorrect" | "autoCapitalize" | "spellCheck"
>): React.ReactNode {
  return (
    <input type="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      className={className}
      {...props}
    />
  );
}

export function RecipientInput({
  placeholder="urbit id or address",
  className="input-lg",
  ...props
}: Omit<
  React.ComponentProps<"input">,
  "type" | "pattern" | "autoComplete" | "autoCorrect" | "autoCapitalize" | "spellCheck"
>): React.ReactNode {
  return (
    <TextInput
      pattern={REGEX.RECIPIENT}
      className={className}
      placeholder={placeholder}
      {...props}
    />
  );
}

export function RecipientLauncherInput({
  value,
  accepts="urbit",
  className="input-sm",
  ...props
}: {
  accepts: "urbit" | "any";
} & Omit<
  React.ComponentProps<"input">,
  "type" | "placeholder" | "pattern" | "autoComplete" | "autoCorrect" | "autoCapitalize" | "spellCheck"
>): React.ReactNode {
  const [pattern, placeholder] = useMemo(() => (
    (accepts === "urbit")
      ? [REGEX.AZIMUTH.POINT, "urbit id"]
      : [REGEX.RECIPIENT, "urbit id or address"]
  ), [accepts]);
  const urbitID = useMemo(() => formUrbitID(String(value)), [value]);
  const urbitAccount = useUrbitAccount(urbitID);
  const tbAccount = useTokenboundAccount(urbitID);
  const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(urbitID);

  return (
    <div className="flex flex-row">
      <TextInput
        pattern={pattern}
        className={className}
        placeholder={placeholder}
        value={value}
        {...props}
      />
      <button type="button"
        className="button-sm"
        onClick={tbCreateMutate}
        disabled={(
            !((accepts === "any") && String(value).match(REGEX.ADDRESS))
          ) || (
            !tbAccount
            || !!tbAccount.deployed
            || !urbitAccount
            || (urbitAccount.layer !== "l1")
            || (tbCreateStatus === "pending")
          )
        }
      >
        {((accepts === "any") && String(value).match(REGEX.ADDRESS)) ? (
          "✔"
        ) : !urbitID.id ? (
          "❓"
        ) : (tbAccount === undefined || urbitAccount === undefined) ? (
          <TinyLoadingIcon />
        ) : (tbAccount === null || urbitAccount === null) ? (
          "🔌"
        ) : (tbCreateStatus === "pending") ? (
          <TinyLoadingIcon />
        ) : (tbCreateStatus === "error") ? (
          "❌"
        ) : (urbitAccount.layer !== "l1") ? (
          "🚫"
        ) : !tbAccount?.deployed ? (
          "🚀"
        ) : (
          "✔"
        )}
      </button>
    </div>
  );
}
