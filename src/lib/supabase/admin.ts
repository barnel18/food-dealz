import 'server-only';
import { createServiceClient } from './service-client';

/** Service-role client for Next.js server code (admin pages, privileged actions). Bypasses RLS. */
export function createAdminClient() {
  return createServiceClient();
}
