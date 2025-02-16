"use client";
import React, { useMemo } from 'react';
import { TinyLoadingIcon } from '@/comp/Icons';
import { useTokenboundAccount, useUrbitAccount, useTokenboundCreateMutation } from '@/hook/web3';
import { formUrbitID } from '@/lib/util';
import { REGEX } from '@/dat/const';

export function CurrencyInput({
  className="input-lg",
  placeholder="currency amount",
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
  className="input-lg",
  placeholder="urbit id", // TODO: or address
  ...props
}: Omit<
  React.ComponentProps<"input">,
  "type" | "pattern" | "autoComplete" | "autoCorrect" | "autoCapitalize" | "spellCheck"
>): React.ReactNode {
  return (
    <TextInput
      pattern={REGEX.AZIMUTH.POINT}
      className={className}
      placeholder={placeholder}
      {...props}
    />
  );
}

export function RecipientTBAInput({
  value,
  className="input-sm",
  placeholder="urbit id", // TODO: or address
  ...props
}: Omit<
  React.ComponentProps<"input">,
  "type" | "pattern" | "autoComplete" | "autoCorrect" | "autoCapitalize" | "spellCheck"
>): React.ReactNode {
  const urbitID = useMemo(() => formUrbitID(String(value)), [value]);
  const urbitAccount = useUrbitAccount(urbitID);
  const tbAccount = useTokenboundAccount(urbitID);
  const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(urbitID);

  return (
    <div className="flex flex-row">
      <RecipientInput
        className={className}
        placeholder={placeholder}
        value={value}
        {...props}
      />
      <button type="button"
        className="button-sm"
        onClick={tbCreateMutate}
        disabled={
          !tbAccount
          || !!tbAccount.deployed
          || !urbitAccount
          || (urbitAccount.layer !== "l1")
          || (tbCreateStatus === "pending")
        }
      >
        {!urbitID.id ? (
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
