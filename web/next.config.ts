import type { NextConfig } from 'next';
// Deployment remains gated until the real Supabase two-account acceptance run.
if (process.env.VERCEL) throw new Error('尚未完成實際 Supabase 權限驗收，此版本暫不部署。');
const config: NextConfig = { poweredByHeader: false, devIndicators: false };
export default config;
