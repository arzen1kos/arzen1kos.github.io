import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PortfolioSnapshot } from '@/types/portfolio';

interface PortfolioState {
  data: PortfolioSnapshot | null;
  loading: boolean;
  error: string | null;
}

const PortfolioContext = createContext<PortfolioState | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PortfolioState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/portfolio/', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Portfolio API returned HTTP ${response.status}.`);
        }
        return (await response.json()) as PortfolioSnapshot;
      })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unable to load portfolio data.',
        });
      });

    return () => controller.abort();
  }, []);

  return <PortfolioContext.Provider value={state}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioState {
  const state = useContext(PortfolioContext);
  if (!state) throw new Error('usePortfolio must be used inside PortfolioProvider.');
  return state;
}
