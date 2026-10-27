import type { NextConfig } from 'next';
declare const config: Pick<NextConfig,
  'typedRoutes' | 'output' | 'outputFileTracingIncludes' | 'experimental' |
  'images' | 'headers' | 'trailingSlash' | 'redirects'>;
export default config;
