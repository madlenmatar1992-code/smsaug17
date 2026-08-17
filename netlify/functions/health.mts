import type { Config } from '@netlify/functions';

export default async () => {
  return Response.json({ ok: true, message: 'Medcare analytics API is running.' });
};

export const config: Config = {
  path: '/api/health',
  method: 'GET'
};
