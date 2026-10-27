type BuildGetOptions = {
  headers?: HeadersInit;
  fetcher?: typeof fetch;
  operation?: string;
  maxAttempts?: number;
  timeoutMs?: number;
  retryStatuses?: Iterable<number>;
};

export function fetchBuildGet(url: string | URL, options?: BuildGetOptions): Promise<Response>;
export function fetchBuildGet<T>(
  url: string | URL,
  options: BuildGetOptions,
  read: (response: Response) => T | Promise<T>,
): Promise<T>;
