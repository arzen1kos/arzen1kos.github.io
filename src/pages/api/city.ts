import type { APIRoute } from 'astro';
import { getRepos } from '@/lib/github';
import { getPortfolio } from '@/lib/portfolio';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const { repos, tokenMissing } = await getRepos();
    return new Response(JSON.stringify({ repos, tokenMissing, portfolio: getPortfolio(repos) }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (error) {
    console.error('[contribution-city]', error);
    return new Response(JSON.stringify({ error: 'Could not load city data. Check the server log.' }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
  }
};
