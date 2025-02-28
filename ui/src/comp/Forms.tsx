import React, { useMemo, useCallback } from 'react';
import { TinyLoadingIcon } from '@/comp/Icons';
import {
  useTokenboundAccount, useUrbitAccount, useRecipientAddress,
  useTokenboundCreateMutation,
} from '@/hook/web3';
import { formUrbitID } from '@/lib/util';
import { isValidUrbitID } from '@/lib/util';
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
  placeholder="urbit id/ens domain/address",
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
  value: string;
  accepts: "urbit" | "any";
} & Omit<
  React.ComponentProps<"input">,
  "value" | "type" | "placeholder" | "pattern" | "autoComplete" | "autoCorrect" | "autoCapitalize" | "spellCheck"
>): React.ReactNode {
  const [pattern, placeholder] = useMemo(() => (
    (accepts === "urbit")
      ? [REGEX.AZIMUTH.POINT, "urbit id"]
      : [REGEX.RECIPIENT, "urbit id/ens domain/address"]
  ), [accepts]);
  const urbitID = useMemo(() => formUrbitID(value), [value]);

  const urbitAccount = useUrbitAccount(urbitID);
  const tbAccount = useTokenboundAccount(urbitID);
  const recipientAddress = useRecipientAddress(value);
  const { mutate: tbCreateMutate, status: tbCreateStatus } = useTokenboundCreateMutation(urbitID);

  // FIXME: Clean this up so that it's more legible
  const status: "loading" | "error" | "invalid" | "valid" | "done" = useMemo(() => (
    !!value?.match(REGEX.AZIMUTH.POINT) ? (
      (urbitAccount === undefined || tbAccount === undefined) ? "loading"
      : (urbitAccount === null || tbAccount === null) ? "error"
      : (urbitAccount === false || tbAccount === false) ? "invalid"
      : (urbitAccount.layer !== "l1") ? "invalid"
      : (!tbAccount.deployed) ? "valid"
      : "done"
    ) : (accepts === "urbit") ? (
      "invalid"
    ) : !!value?.match(REGEX.ETHEREUM.ADDRESS) ? (
      "done"
    ) : !!value?.match(REGEX.ETHEREUM.DOMAIN) ? (
      (recipientAddress === undefined) ? "loading"
      : (recipientAddress === null) ? "error"
      : (recipientAddress === false) ? "invalid"
      : "done"
    ) : (
      "invalid"
    )
  ), [value, accepts, urbitAccount, tbAccount, recipientAddress]);

  return (
    <div className="flex flex-row">
      <TextInput
        value={value}
        pattern={pattern}
        placeholder={placeholder}
        className={className}
        {...props}
      />
      <button type="button"
        className="button-sm"
        onClick={tbCreateMutate}
        disabled={
          !!status.match("(loading)|(invalid)|(done)")
          || (tbCreateStatus === "pending")
        }
      >
        {(status === "loading" || tbCreateStatus === "pending") ? (
          <TinyLoadingIcon />
        ) : (status === "error" || tbCreateStatus === "error") ? (
          "❌"
        ) : (status === "invalid") ? (
          "🚫"
        ) : (status === "valid") ? (
          "🚀"
        ) : (
          "✔"
        )}
      </button>
    </div>
  );
}
