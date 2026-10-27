import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { fetchBuildGet } from '../lib/content/build/fetch-build-get.mjs';

async function withServer(handler, run) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run(`http://127.0.0.1:${server.address().port}/media`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('a dropped CMS connection recovers and preserves GET headers', async () => {
  let requests = 0;
  await withServer(
    (request, response) => {
      requests += 1;
      assert.equal(request.method, 'GET');
      assert.equal(request.headers.authorization, 'Bearer synthetic-test-value');
      if (requests < 3) return request.socket.destroy();
      response.end('media bytes');
    },
    async (url) => {
      const response = await fetchBuildGet(url, {
        headers: { Authorization: 'Bearer synthetic-test-value' },
      });
      assert.equal(await response.text(), 'media bytes');
      assert.equal(requests, 3);
    },
  );
});

test('a persistent connection failure stops after three attempts', async () => {
  let requests = 0;
  await withServer(
    (request) => {
      requests += 1;
      request.socket.destroy();
    },
    async (url) => {
      await assert.rejects(fetchBuildGet(url), /fetch failed/);
      assert.equal(requests, 3);
    },
  );
});

test('HTTP authentication failures are returned without retry', async () => {
  let requests = 0;
  await withServer(
    (_request, response) => {
      requests += 1;
      response.writeHead(401);
      response.end('unauthorized');
    },
    async (url) => {
      const response = await fetchBuildGet(url);
      assert.equal(response.status, 401);
      assert.equal(await response.text(), 'unauthorized');
      assert.equal(requests, 1);
    },
  );
});

test('invalid URLs are rejected without a network retry', async () => {
  await assert.rejects(fetchBuildGet('not a URL'), /Failed to parse URL/);
});

test('a dropped response body is retried before returning JSON', async () => {
  let requests = 0;
  await withServer(
    (request, response) => {
      requests += 1;
      response.writeHead(200, { 'Content-Type': 'application/json' });
      if (requests === 1) {
        response.write('{"data":');
        setTimeout(() => request.socket.destroy(), 20);
      } else {
        response.end('{"data":["recovered"]}');
      }
    },
    async (url) => {
      const result = await fetchBuildGet(url, { operation: 'snapshot:collection' }, (response) =>
        response.json(),
      );
      assert.deepEqual(result, { data: ['recovered'] });
      assert.equal(requests, 2);
    },
  );
});

test('invalid JSON and forbidden responses are never retried', async () => {
  for (const status of [200, 403]) {
    let requests = 0;
    await withServer(
      (_request, response) => {
        requests += 1;
        response.writeHead(status);
        response.end('invalid json');
      },
      async (url) => {
        await assert.rejects(
          fetchBuildGet(url, {}, (response) => response.json()),
          SyntaxError,
        );
        assert.equal(requests, 1);
      },
    );
  }
});

test('nested timeout causes retry and diagnostics exclude request details', async (t) => {
  let attempts = 0;
  const messages = [];
  t.mock.method(console, 'warn', (message) => messages.push(message));
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    attempts += 1;
    assert.equal(options.headers.Authorization, 'Bearer synthetic-private-value');
    throw new TypeError('https://synthetic-private.invalid/private?token=synthetic-private-value', {
      cause: new AggregateError([
        Object.assign(new Error('private payload'), {
          code: 'UND_ERR_CONNECT_TIMEOUT',
        }),
      ]),
    });
  });
  await assert.rejects(
    fetchBuildGet('https://synthetic-private.invalid/', {
      headers: { Authorization: 'Bearer synthetic-private-value' },
      operation: 'synthetic-private-value',
    }),
    (error) => {
      assert.equal(error.code, 'UND_ERR_CONNECT_TIMEOUT');
      assert.equal(error.cause, undefined);
      messages.push(error.message);
      return true;
    },
  );
  assert.equal(attempts, 3);
  for (const message of messages) {
    assert.match(
      message,
      /operation=cms-get code=UND_ERR_CONNECT_TIMEOUT attempt=[123]\/3 elapsed_ms=\d+/,
    );
    assert.doesNotMatch(message, /synthetic-private|private payload|https:|Bearer/);
  }
});

test('TLS failures are not retried', async (t) => {
  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    attempts += 1;
    throw new TypeError('fetch failed', {
      cause: Object.assign(new Error('synthetic TLS error'), {
        code: 'CERT_HAS_EXPIRED',
      }),
    });
  });
  await assert.rejects(fetchBuildGet('https://synthetic.invalid'), /fetch failed/);
  assert.equal(attempts, 1);
});

test('the request deadline aborts stalled requests and remains bounded', async (t) => {
  let attempts = 0;
  const deadlines = [];
  t.mock.method(console, 'warn', () => {});
  // Trigger the production deadline immediately; backoff still uses the real
  // timers/promises implementation. No public test-only retry options are needed.
  t.mock.method(globalThis, 'setTimeout', (abort, milliseconds) => {
    deadlines.push(milliseconds);
    queueMicrotask(abort);
    return undefined;
  });
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => {
    attempts += 1;
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      });
    });
  });
  await assert.rejects(fetchBuildGet('https://synthetic.invalid'), (error) => {
    assert.equal(error.code, 'BUILD_GET_TIMEOUT');
    return true;
  });
  assert.equal(attempts, 3);
  assert.deepEqual(deadlines, [20_000, 20_000, 20_000]);
});

test('the deadline includes consumption of a stalled response body', async (t) => {
  let attempts = 0;
  const deadlines = [];
  t.mock.method(console, 'warn', () => {});
  t.mock.method(globalThis, 'setTimeout', (abort, milliseconds) => {
    deadlines.push(milliseconds);
    queueMicrotask(abort);
    return undefined;
  });
  const fetcher = async (_url, { signal }) => {
    attempts++;
    return {
      ok: true,
      json: () =>
        new Promise((_resolve, reject) => {
          if (signal.aborted) reject(signal.reason);
          else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    };
  };
  await assert.rejects(
    fetchBuildGet('https://synthetic.invalid', { fetcher }, (response) => response.json()),
    { code: 'BUILD_GET_TIMEOUT' },
  );
  assert.equal(attempts, 3);
  assert.deepEqual(deadlines, [20_000, 20_000, 20_000]);
});
