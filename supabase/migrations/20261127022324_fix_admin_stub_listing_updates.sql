-- Allow an acting admin to update another owner's stub listing.
-- update_listing_with_media_references previously required profiles.id =
-- p_owner_id to be admin, which fails when p_owner_id is the listing owner.
--
-- Keep the existing 15-argument overload so old app instances keep working
-- while new deploys pass p_actor_id. Do not drop the old signature first.

create or replace function public.update_listing_with_media_references(
  p_listing_id bigint,
  p_owner_id uuid,
  p_type text,
  p_name text,
  p_description text,
  p_location text,
  p_area_name text,
  p_country_code text,
  p_accepted_items text[],
  p_rejected_items text[],
  p_links text[],
  p_visibility boolean,
  p_is_stub boolean,
  p_avatar text,
  p_photos text[],
  p_actor_id uuid
)
returns table (
  id bigint,
  slug text,
  type text
)
language sql
set search_path = public
as $$
  update public.listings
  set
    type = p_type,
    name = p_name,
    description = p_description,
    location = p_location::extensions.geography,
    area_name = p_area_name,
    country_code = p_country_code,
    accepted_items = p_accepted_items,
    rejected_items = p_rejected_items,
    links = p_links,
    visibility = p_visibility,
    is_stub = coalesce(p_is_stub, public.listings.is_stub),
    avatar = nullif(btrim(p_avatar), ''),
    photos = coalesce(p_photos, array[]::text[])
  where public.listings.id = p_listing_id
    and public.listings.owner_id = p_owner_id
    and (
      coalesce(p_is_stub, public.listings.is_stub, false) = false
      or exists (
        select 1
        from public.profiles
        where profiles.is_admin = true
          and profiles.id = coalesce(p_actor_id, p_owner_id)
      )
    )
    and coalesce(public.listings.avatar, '') =
      coalesce(nullif(btrim(p_avatar), ''), '')
    and cardinality(coalesce(public.listings.photos, array[]::text[])) =
      cardinality(coalesce(p_photos, array[]::text[]))
    and coalesce(public.listings.photos, array[]::text[]) @>
      coalesce(p_photos, array[]::text[])
    and coalesce(public.listings.photos, array[]::text[]) <@
      coalesce(p_photos, array[]::text[])
  returning public.listings.id, public.listings.slug, public.listings.type;
$$;

-- Legacy 15-argument callers (pre-p_actor_id app versions) keep working.
create or replace function public.update_listing_with_media_references(
  p_listing_id bigint,
  p_owner_id uuid,
  p_type text,
  p_name text,
  p_description text,
  p_location text,
  p_area_name text,
  p_country_code text,
  p_accepted_items text[],
  p_rejected_items text[],
  p_links text[],
  p_visibility boolean,
  p_is_stub boolean,
  p_avatar text,
  p_photos text[]
)
returns table (
  id bigint,
  slug text,
  type text
)
language sql
set search_path = public
as $$
  select *
  from public.update_listing_with_media_references(
    p_listing_id,
    p_owner_id,
    p_type,
    p_name,
    p_description,
    p_location,
    p_area_name,
    p_country_code,
    p_accepted_items,
    p_rejected_items,
    p_links,
    p_visibility,
    p_is_stub,
    p_avatar,
    p_photos,
    null::uuid
  );
$$;

revoke all on function public.update_listing_with_media_references(
  bigint,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  text[],
  text[],
  boolean,
  boolean,
  text,
  text[]
) from anon, authenticated, public;

revoke all on function public.update_listing_with_media_references(
  bigint,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  text[],
  text[],
  boolean,
  boolean,
  text,
  text[],
  uuid
) from anon, authenticated, public;

grant execute on function public.update_listing_with_media_references(
  bigint,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  text[],
  text[],
  boolean,
  boolean,
  text,
  text[]
) to service_role;

grant execute on function public.update_listing_with_media_references(
  bigint,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  text[],
  text[],
  boolean,
  boolean,
  text,
  text[],
  uuid
) to service_role;
