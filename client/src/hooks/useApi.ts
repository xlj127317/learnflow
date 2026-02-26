import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions<T> {
  /** 立即执行（默认 true） */
  immediate?: boolean;
  /** 初始值 */
  initialData?: T;
}

interface UseApiReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 通用 API 请求 Hook，消除页面组件中重复的 loading/error 模式
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiOptions<T> = {},
): UseApiReturn<T> {
  const { immediate = true, initialData } = options;
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '请求失败';
      setError(message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
