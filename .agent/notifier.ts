export type Notifier = {
  info: (msg: string) => Promise<void>;
  debug: (msg: string) => Promise<void>;
  warn: (msg: string) => Promise<void>;
  error: (msg: string) => Promise<void>;
};

export function createNotifier(opts: { prod: boolean }): Notifier {
  const prefix = opts.prod ? '[agent:prod]' : '[agent]';
  return {
    info: async (msg) => console.log(`${prefix} ${msg}`),
    debug: async (msg) => {
      if (!opts.prod) console.log(`${prefix} ${msg}`);
    },
    warn: async (msg) => console.warn(`${prefix} ${msg}`),
    error: async (msg) => console.error(`${prefix} ${msg}`)
  };
}
