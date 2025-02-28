import { useState, useCallback } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';

export function useCopy(text: string): [() => Promise<() => void>, boolean] {
  const [copied, setCopied] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  const copyFallback = async (text: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (error) {
      console.warn('Fallback copy failed', error);
      return false;
    }
  };

  const copy = useCallback(async () => {
    let success = false;
    if (!navigator.clipboard) {
      success = await copyFallback(text);
    } else {
      success = await copyToClipboard(text);
    }

    setCopied(success);

    let timeout: ReturnType<typeof setTimeout>;
    if (success) {
      timeout = setTimeout(() => {
        setCopied(false);
      }, 2000);
    }

    return () => {
      setCopied(false);
      clearTimeout(timeout);
    };
  }, [text, copyToClipboard]);

  return [copy, copied];
}
