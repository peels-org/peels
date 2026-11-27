-- Allow admins to read contact cards and select/update/delete any listing so the
-- existing listing write UI can manage other people's listings.

drop policy if exists "Users can view their own listings" on public.listings;

create policy "Users can view their own listings"
on public.listings
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_admin = true
  )
);

drop policy if exists "Users can view visible and relevant listing contact cards"
on public.listing_contact_cards;

create policy "Users can view visible and relevant listing contact cards"
on public.listing_contact_cards
for select
to authenticated
using (
  visibility = true
  or owner_id = (select auth.uid())
  or exists (
    select 1
    from public.chat_threads
    where chat_threads.listing_id = listing_contact_cards.id
      and (
        chat_threads.initiator_id = (select auth.uid())
        or chat_threads.owner_id = (select auth.uid())
      )
  )
  or exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_admin = true
  )
);

drop policy if exists "Users can update their own listings" on public.listings;

create policy "Users can update their own listings"
on public.listings
for update
to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_admin = true
  )
)
with check (
  (
    owner_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.is_admin = true
    )
  )
  and (
    coalesce(is_stub, false) = false
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.is_admin = true
    )
  )
);

drop policy if exists "Users can delete their own listings" on public.listings;

create policy "Users can delete their own listings"
on public.listings
for delete
to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_admin = true
  )
);
