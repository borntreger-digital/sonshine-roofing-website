import { setTimeout as delay } from 'node:timers/promises';

const transientCodes = new Set([
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

const operations = new Set([
  'cms-get',
  'snapshot:collection',
  'snapshot:static-media',
  'route-validator:collection',
]);

function transientCode(error, depth = 0) {
  if (!error || depth > 4) return undefined;
  if (transientCodes.has(error.code)) return error.code;
  return (
    transientCode(error.cause, depth + 1) ||
    (Array.isArray(error.errors)
      ? error.errors.map((cause) => transientCode(cause, depth + 1)).find(Boolean)
      : undefined)
  );
}

// Every CMS caller consumes the response inside this boundary, so a dropped
// body is retried too. Defaults: three 20-second attempts, at most 62 seconds
// including backoff. Injected transports retain their existing headers and
// no-store behavior. Content, HTTP and TLS failures are not retried by callers.
export async function fetchBuildGet(
  url,
  {
    headers,
    fetcher = fetch,
    operation = 'cms-get',
    maxAttempts = 3,
    timeoutMs = 20_000,
    retryStatuses = [],
  } = {},
  read = (response) => response,
) {
  const label = operations.has(operation) ? operation : 'cms-get';
  maxAttempts = Number.isFinite(maxAttempts)
    ? Math.min(6, Math.max(1, Math.round(maxAttempts)))
    : 3;
  timeoutMs = Number.isFinite(timeoutMs)
    ? Math.min(120_000, Math.max(1000, Math.round(timeoutMs)))
    : 20_000;
  const started = Date.now();
  for (let attempt = 1; ; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    let retryCode;
    try {
      response = await fetcher(url, { headers, cache: 'no-store', signal: controller.signal });
      if (new Set(retryStatuses).has(response.status) && attempt < maxAttempts) {
        retryCode = `HTTP_${response.status}`;
        await response.body?.cancel().catch(() => {});
      } else {
        return await read(response);
      }
    } catch (error) {
      const code = controller.signal.aborted ? 'BUILD_GET_TIMEOUT' : transientCode(error);
      if (!code || (response && !response.ok)) throw error;
      const details = `operation=${label} code=${code} attempt=${attempt}/${maxAttempts} elapsed_ms=${Date.now() - started}`;
      console.warn(
        `[build-cms-get] ${details} ${attempt === maxAttempts ? 'exhausted' : 'retrying'}`,
      );
      if (attempt === maxAttempts) {
        // Do not retain the original error/cause: it can contain URLs or other
        // request details. The allowlisted code and operation identify the fault.
        throw Object.assign(new Error(`Build CMS GET fetch failed: ${details}`), { code });
      }
      await response?.body?.cancel().catch(() => {});
    } finally {
      clearTimeout(timer);
    }
    if (retryCode)
      console.warn(
        `[build-cms-get] operation=${label} code=${retryCode} attempt=${attempt}/${maxAttempts} elapsed_ms=${Date.now() - started} retrying`,
      );
    await delay(500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 251));
  }
}
