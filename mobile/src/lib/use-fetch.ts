import { useCallback, useEffect, useRef, useState } from 'react';

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Мини-хук загрузки: состояния data/error/loading + повторный запрос. */
export function useFetch<T>(factory: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    factoryRef.current().then(
      (data) => {
        if (!cancelled && mounted.current) setState({ data, error: null, loading: false });
      },
      (error: unknown) => {
        if (!cancelled && mounted.current) {
          const message = error instanceof Error ? error.message : 'Ошибка загрузки';
          setState({ data: null, error: message, loading: false });
        }
      },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { ...state, reload };
}
