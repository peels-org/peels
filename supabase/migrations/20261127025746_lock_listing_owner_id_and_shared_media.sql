-- Keep listing ownership immutable through the authenticated Data API.
-- Admin update RLS previously allowed any WITH CHECK owner_id for admins.

revoke update (owner_id) on table public.listings from authenticated;
