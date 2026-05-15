import { useState, useEffect } from 'react';

function get() {
  const w = window.innerWidth;
  if (w < 640)  return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export function useBreakpoint() {
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const handler = () => setBp(get());
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return {
    bp,
    isMobile:  bp === 'mobile',
    isTablet:  bp === 'tablet',
    isDesktop: bp === 'desktop',
    isMobileOrTablet: bp !== 'desktop',
  };
}
