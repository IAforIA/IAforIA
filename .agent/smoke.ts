import http from 'http';

export async function smokeHealth(opts: { port: number; path: string; timeoutMs: number }): Promise<{ ok: boolean; message: string }>
{
  const urlPath = opts.path.startsWith('/') ? opts.path : `/${opts.path}`;

  return new Promise((resolve) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: opts.port,
        path: urlPath,
        method: 'GET',
        timeout: opts.timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (d) => chunks.push(Buffer.from(d)));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          const ok = res.statusCode === 200;
          resolve({ ok, message: `status=${res.statusCode} body=${body.slice(0, 200)}` });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });

    req.on('error', (e) => {
      resolve({ ok: false, message: String((e as any)?.message || e) });
    });

    req.end();
  });
}
