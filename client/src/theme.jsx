import { useEffect } from 'react';

export function useTheme(dark) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
  }, [dark]);
}
