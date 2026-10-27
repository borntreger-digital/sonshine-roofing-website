const AHREFS_ORIGIN = 'https://analytics.ahrefs.com';
const ANALYTICS_DIRECTIVES = new Set(['script-src', 'script-src-elem', 'connect-src']);

// Preserve the shared CMS policy while allowing the approved Ahrefs tracker
// in the Workers deployment. The ordinary Next/Coolify build is unchanged.
export function analyticsPolicy(policy) {
  if (!policy) return policy;
  return policy.split(';').map(part => {
    const [directive, ...sources] = part.trim().split(/\s+/);
    if (!ANALYTICS_DIRECTIVES.has(directive) || sources.includes(AHREFS_ORIGIN)) return part;
    return `${part.trimEnd()} ${AHREFS_ORIGIN}`;
  }).join(';');
}
