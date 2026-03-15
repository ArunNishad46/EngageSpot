import { useEffect, useRef, useCallback } from 'react';

export const useClickOutside = (handler) => {
  const ref = useRef(null);
  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      stableHandler(e);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [stableHandler]);

  return ref;
};