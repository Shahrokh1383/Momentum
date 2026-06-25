import { useState, useMemo, useCallback } from 'react';

export const useDismissable = (storageKey: string) => {
  const [userDismissed, setUserDismissed] = useState(false);

  const isDismissed = useMemo(() => {
    if (userDismissed) return true;
    return localStorage.getItem(storageKey) === 'true';
  }, [storageKey, userDismissed]);

  const dismiss = useCallback(() => {
    setUserDismissed(true);
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  return { isDismissed, dismiss };
};