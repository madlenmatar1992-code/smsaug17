import type { Config } from '@netlify/functions';

import { buildDashboardResponse } from '../../backend/src/analytics/dashboardBuilder.js';

// The workbooks are static for the lifetime of a deploy, so a warm instance can
// reuse the parsed result instead of re-reading both spreadsheets per request.
let cachedPayload: unknown | null = null;

async function getDashboard() {
  if (!cachedPayload) {
    cachedPayload = await buildDashboardResponse();
  }
  return cachedPayload;
}

export default async () => {
  try {
    const payload = await getDashboard();

    return Response.json(payload, {
      headers: {
        'cache-control': 'public, max-age=0, must-revalidate',
        'netlify-cdn-cache-control': 'public, max-age=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error('Dashboard build failed:', error);

    return Response.json(
      {
        message: 'Unable to generate dashboard data.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

export const config: Config = {
  path: '/api/dashboard',
  method: 'GET'
};
