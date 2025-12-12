import { Octokit } from 'octokit';

export type PRBotOptions = {
  owner: string;
  repo: string;
  token?: string;
};

export function createPrBot(opts: PRBotOptions): Octokit | null {
  const token = opts.token || process.env.GITHUB_TOKEN;
  if (!token) return null;
  return new Octokit({ auth: token });
}
