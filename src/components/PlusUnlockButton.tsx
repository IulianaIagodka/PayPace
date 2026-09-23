import React, { useState } from 'react';
import { allowDemoPremiumUnlock, unlockPlus } from '../services/plusBilling';
import { useBudget } from '../store/BudgetContext';
import { HudButton } from './ui';

type Props = {
  /** Override primary label (default depends on demo vs store). */
  title?: string;
  variant?: 'primary' | 'secondary';
  preferRestore?: boolean;
};

/**
 * Unlock Plus: demo toggle in __DEV__, real IAP / restore in store builds.
 */
export function PlusUnlockButton({
  title,
  variant = 'primary',
  preferRestore = false,
}: Props) {
  const { setPremium } = useBudget();
  const [busy, setBusy] = useState(false);
  const demo = allowDemoPremiumUnlock();
  const label =
    title ??
    (preferRestore
      ? 'RESTORE PURCHASES'
      : demo
        ? 'TRY PLUS (DEMO)'
        : 'GET PLUS');

  return (
    <HudButton
      title={busy ? '…' : label}
      variant={variant}
      disabled={busy}
      onPress={async () => {
        setBusy(true);
        try {
          await unlockPlus({ setPremium, preferRestore });
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
