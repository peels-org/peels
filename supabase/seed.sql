-- Local-only sample data for `supabase db reset`.
-- Keep this sanitized and reproducible. Do not copy production data here.

begin;

-- Demo accounts for local sign-in.
-- Password for both accounts: peels-demo-password
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  email_change_token_current,
  reauthentication_token,
  is_sso_user,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '2c9ae20c-2469-4e60-84b3-39268697717c',
    'authenticated',
    'authenticated',
    'demo-host@peels.local',
    '$2a$10$lyW9fBTRH9ArXpWTMVbIAe8CudAvmToBbIuMIrIAloEqw.ExDcKsS',
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Avery","email_verified":true}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    'authenticated',
    'authenticated',
    'demo-donor@peels.local',
    '$2a$10$5AI2H2yT7iRd6rsMcjSmqe/MNvnaKApDluy9eo44gy7kxqeOArucG',
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Riley","email_verified":true}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '6f8e3c35-9b7f-42b0-ae3a-9b14bf7f8921',
    'authenticated',
    'authenticated',
    'demo-neighbour@peels.local',
    '$2a$10$lyW9fBTRH9ArXpWTMVbIAe8CudAvmToBbIuMIrIAloEqw.ExDcKsS',
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Morgan","email_verified":true}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false
  )
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '90c8f961-beba-4799-a59d-57410afe5ee2',
    '2c9ae20c-2469-4e60-84b3-39268697717c',
    '2c9ae20c-2469-4e60-84b3-39268697717c',
    '{"sub":"2c9ae20c-2469-4e60-84b3-39268697717c","email":"demo-host@peels.local","email_verified":false,"phone_verified":false}'::jsonb,
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    'fc5f1010-ceed-47f1-8d15-6f795c9be7b9',
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    '{"sub":"9a0c62fc-bf50-4f45-ba6c-5b9051c2712a","email":"demo-donor@peels.local","email_verified":false,"phone_verified":false}'::jsonb,
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    'b1d8c1e9-81d5-49ea-9340-f52cf9386c9f',
    '6f8e3c35-9b7f-42b0-ae3a-9b14bf7f8921',
    '6f8e3c35-9b7f-42b0-ae3a-9b14bf7f8921',
    '{"sub":"6f8e3c35-9b7f-42b0-ae3a-9b14bf7f8921","email":"demo-neighbour@peels.local","email_verified":false,"phone_verified":false}'::jsonb,
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (provider_id, provider) do update
set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = excluded.updated_at;

insert into public.profiles (
  id,
  first_name,
  avatar,
  is_admin,
  http_referrer,
  utm_source,
  utm_medium,
  utm_campaign,
  is_newsletter_subscribed,
  emailed_latest_issue
)
values
  (
    '2c9ae20c-2469-4e60-84b3-39268697717c',
    'Avery',
    'demo/skate.jpg',
    false,
    'http://127.0.0.1:3000',
    'local-seed',
    'cli',
    'fresh-computer',
    true,
    false
  ),
  (
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    'Riley',
    'demo/sunflowers.jpg',
    false,
    'http://127.0.0.1:3000',
    'local-seed',
    'cli',
    'fresh-computer',
    false,
    false
  ),
  (
    '6f8e3c35-9b7f-42b0-ae3a-9b14bf7f8921',
    'Morgan',
    'demo/mayo.jpg',
    false,
    'http://127.0.0.1:3000',
    'local-seed',
    'cli',
    'fresh-computer',
    false,
    false
  )
on conflict (id) do update
set
  first_name = excluded.first_name,
  avatar = excluded.avatar,
  updated_at = timezone('utc', now()),
  is_newsletter_subscribed = excluded.is_newsletter_subscribed,
  emailed_latest_issue = excluded.emailed_latest_issue;

insert into public.listings (
  id,
  owner_id,
  name,
  description,
  location,
  accepted_items,
  rejected_items,
  photos,
  links,
  visibility,
  type,
  avatar,
  country_code,
  area_name,
  is_stub,
  homepage_featured,
  homepage_featured_photo_indexes
)
values
  (
    1001,
    '2c9ae20c-2469-4e60-84b3-39268697717c',
    'Marrickville Neighbourhood Compost',
    'A friendly local compost drop-off with room for fruit scraps, coffee grounds, and wilted greens.',
    extensions.st_setsrid(extensions.st_makepoint(151.1569, -33.9110), 4326)::extensions.geography,
    array['Fruit and vegetable scraps', 'Coffee grounds', 'Tea leaves', 'Egg shells'],
    array['Plastic bags', 'Meat', 'Dairy'],
    array['demo/garden.jpg', 'demo/caddy.jpg', 'demo/tumbler.jpg'],
    array['https://www.peels.org/about'],
    true,
    'community',
    'demo/farm.jpg',
    'AU',
    'Marrickville',
    false,
    true,
    array[0, 2]
  ),
  (
    1002,
    '2c9ae20c-2469-4e60-84b3-39268697717c',
    'Inner West Cafe Compost Pickup',
    'A demo business listing so local development exercises the multi-listing host views and badges.',
    extensions.st_setsrid(extensions.st_makepoint(151.1645, -33.9063), 4326)::extensions.geography,
    array['Coffee grounds', 'Fruit scraps'],
    array['Packaging', 'Glass'],
    array['demo/wheelbarrow.jpg'],
    array['https://www.peels.org/faq'],
    true,
    'business',
    'demo/brewery.jpg',
    'AU',
    'Enmore',
    false,
    true,
    array[0]
  ),
  (
    1003,
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    'Newtown Balcony Worm Farm',
    'A small residential setup that is handy for testing profile, listing, and chat flows locally.',
    extensions.st_setsrid(extensions.st_makepoint(151.1781, -33.8986), 4326)::extensions.geography,
    array['Fruit scraps', 'Paper towels', 'Crushed egg shells'],
    array['Citrus in bulk', 'Cooked food'],
    array[]::text[],
    array['https://www.peels.org'],
    true,
    'residential',
    null,
    'AU',
    'Newtown',
    false,
    false,
    '{}'::integer[]
  ),
  (
    1004,
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    'Tempe Share Shed',
    'A neighbourhood drop-off spot sharing compost space and practical know-how for nearby growers.',
    extensions.st_setsrid(extensions.st_makepoint(151.1578, -33.9242), 4326)::extensions.geography,
    array['Fruit scraps', 'Coffee grounds', 'Leafy greens'],
    array['Meat', 'Plastic packaging'],
    array['demo/tumbler.jpg', 'demo/garden.jpg'],
    array['https://www.peels.org/about'],
    true,
    'community',
    'demo/farm.jpg',
    'AU',
    'Tempe',
    false,
    true,
    array[1]
  ),
  (
    1005,
    '2c9ae20c-2469-4e60-84b3-39268697717c',
    'Stanmore Bakery Scraps',
    'A public business listing that should stay off the homepage featured strip unless explicitly curated.',
    extensions.st_setsrid(extensions.st_makepoint(151.1631, -33.8940), 4326)::extensions.geography,
    array['Coffee grounds', 'Fruit scraps'],
    array['Plastic', 'Packaging'],
    array['demo/wheelbarrow.jpg'],
    array['https://www.peels.org/faq'],
    true,
    'business',
    'demo/brewery.jpg',
    'AU',
    'Stanmore',
    false,
    false,
    '{}'::integer[]
  ),
  (
    1006,
    '6f8e3c35-9b7f-42b0-ae3a-9b14bf7f8921',
    'Camperdown Community Garden',
    'A small garden crew accepting easy kitchen scraps for a shared neighbourhood compost bay.',
    extensions.st_setsrid(extensions.st_makepoint(151.1787, -33.8874), 4326)::extensions.geography,
    array['Fruit scraps', 'Vegetable peels', 'Coffee grounds'],
    array['Meat', 'Dairy', 'Plastic bags'],
    array['demo/caddy.jpg', 'demo/garden.jpg'],
    array['https://www.peels.org/contact'],
    true,
    'community',
    'demo/farm.jpg',
    'AU',
    'Camperdown',
    false,
    false,
    '{}'::integer[]
  ),
  (
    1007,
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    null,
    'A hidden residential listing used to exercise residential listing limits locally.',
    extensions.st_setsrid(extensions.st_makepoint(151.1790, -33.8990), 4326)::extensions.geography,
    array['Fruit scraps', 'Coffee grounds'],
    array['Meat', 'Dairy'],
    array[]::text[],
    array[]::text[],
    false,
    'residential',
    null,
    'AU',
    'Newtown',
    false,
    false,
    '{}'::integer[]
  ),
  (
    1008,
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    null,
    'A second hidden residential listing used to exercise residential listing limits locally.',
    extensions.st_setsrid(extensions.st_makepoint(151.1792, -33.8992), 4326)::extensions.geography,
    array['Fruit scraps', 'Tea leaves'],
    array['Meat', 'Dairy'],
    array[]::text[],
    array[]::text[],
    false,
    'residential',
    null,
    'AU',
    'Newtown',
    false,
    false,
    '{}'::integer[]
  )
on conflict (id) do update
set
  owner_id = excluded.owner_id,
  name = excluded.name,
  description = excluded.description,
  location = excluded.location,
  accepted_items = excluded.accepted_items,
  rejected_items = excluded.rejected_items,
  photos = excluded.photos,
  links = excluded.links,
  visibility = excluded.visibility,
  type = excluded.type,
  avatar = excluded.avatar,
  country_code = excluded.country_code,
  area_name = excluded.area_name,
  is_stub = excluded.is_stub,
  homepage_featured = excluded.homepage_featured,
  homepage_featured_photo_indexes = excluded.homepage_featured_photo_indexes;

update public.listings
set slug = case id
  when 1001 then 'demo-marrickville-compost'
  when 1002 then 'demo-inner-west-cafe'
  when 1003 then 'demo-newtown-worm-farm'
  when 1004 then 'demo-tempe-share-shed'
  when 1005 then 'demo-stanmore-bakery'
  when 1006 then 'demo-camperdown-community-garden'
  when 1007 then 'demo-hidden-newtown-worm-farm-one'
  when 1008 then 'demo-hidden-newtown-worm-farm-two'
end
where id in (1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008);

select setval('public.listings_id_seq', 1008, true);

insert into public.chat_threads (
  id,
  created_at,
  listing_id,
  initiator_id,
  owner_id
)
values
  (
    '33333333-3333-4333-8333-333333333333',
    timezone('utc', now()) - interval '2 hours',
    1001,
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    '2c9ae20c-2469-4e60-84b3-39268697717c'
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    timezone('utc', now()) - interval '50 minutes',
    1006,
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    '6f8e3c35-9b7f-42b0-ae3a-9b14bf7f8921'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    timezone('utc', now()) - interval '25 minutes',
    1002,
    '6f8e3c35-9b7f-42b0-ae3a-9b14bf7f8921',
    '2c9ae20c-2469-4e60-84b3-39268697717c'
  )
on conflict (id) do update
set
  created_at = excluded.created_at,
  listing_id = excluded.listing_id,
  initiator_id = excluded.initiator_id,
  owner_id = excluded.owner_id;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'webhook_new_chat_message'
      and tgrelid = 'public.chat_messages'::regclass
  ) then
    execute 'alter table public.chat_messages disable trigger webhook_new_chat_message';
  end if;
end
$$;

insert into public.chat_messages (
  id,
  created_at,
  thread_id,
  sender_id,
  content,
  read_at
)
values
  (
    '44444444-4444-4444-8444-444444444444',
    timezone('utc', now()) - interval '90 minutes',
    '33333333-3333-4333-8333-333333333333',
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    'Hey Avery, do you take coffee grounds from a small home espresso machine?',
    timezone('utc', now()) - interval '80 minutes'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    timezone('utc', now()) - interval '75 minutes',
    '33333333-3333-4333-8333-333333333333',
    '2c9ae20c-2469-4e60-84b3-39268697717c',
    'Yes, absolutely. Small sealed containers are perfect.',
    null
  ),
  (
    '88888888-8888-4888-8888-888888888888',
    timezone('utc', now()) - interval '45 minutes',
    '77777777-7777-4777-8777-777777777777',
    '9a0c62fc-bf50-4f45-ba6c-5b9051c2712a',
    'Hi Morgan, are banana peels okay if they are chopped up?',
    timezone('utc', now()) - interval '40 minutes'
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    timezone('utc', now()) - interval '35 minutes',
    '77777777-7777-4777-8777-777777777777',
    '6f8e3c35-9b7f-42b0-ae3a-9b14bf7f8921',
    'Yes please. Chopped scraps break down much faster in this bay.',
    null
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    timezone('utc', now()) - interval '20 minutes',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '6f8e3c35-9b7f-42b0-ae3a-9b14bf7f8921',
    'Hi Avery, can the cafe take a few buckets from our community garden working bee?',
    timezone('utc', now()) - interval '15 minutes'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    timezone('utc', now()) - interval '10 minutes',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '2c9ae20c-2469-4e60-84b3-39268697717c',
    'Yes, drop them by after 3 pm and I''ll add them to the cafe pickup.',
    null
  )
on conflict (id) do update
set
  created_at = excluded.created_at,
  thread_id = excluded.thread_id,
  sender_id = excluded.sender_id,
  content = excluded.content,
  read_at = excluded.read_at;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'webhook_new_chat_message'
      and tgrelid = 'public.chat_messages'::regclass
  ) then
    execute 'alter table public.chat_messages enable trigger webhook_new_chat_message';
  end if;
end
$$;

select
  'seed complete' as status,
  count(*) filter (where visibility = true) as public_listings,
  count(*) filter (where type in ('community', 'business')) as non_residential_listings
from public.listings;

commit;
