import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as wait } from 'node:timers/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

async function probe(url) {
  return new Promise((resolve) => {
    try {
      const target = new URL(url);
      const request = target.protocol === 'https:' ? httpsRequest : httpRequest;
      const req = request(
        {
          hostname: target.hostname,
          port: target.port,
          path: target.pathname,
          method: 'GET',
        },
        (res) => {
          res.resume();
          resolve(res.statusCode || null);
        }
      );
      req.on('error', () => resolve(null));
      req.end();
    } catch {
      resolve(null);
    }
  });
}

async function waitForServer(url, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await probe(url);
    if (status && status < 500) return;
    await wait(250);
  }
  throw new Error(`Server not ready at ${url}`);
}

export async function startServer({ env, url }) {
  const proc = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });

  await waitForServer(url);
  return { proc, url };
}

export async function stopServer(server) {
  if (!server?.proc) return;
  if (!server.proc.killed) {
    server.proc.kill('SIGTERM');
  }
  await Promise.race([once(server.proc, 'exit'), wait(2000)]);
}
