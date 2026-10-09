-- =====================================================================
-- J Home & Office Care  -  database schema
-- Run this whole file once in Supabase  ->  SQL Editor  ->  New query
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'customer', 'employee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum
    ('awaiting_deposit', 'requested', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled', 'refund_due');
exception when duplicate_object then null; end $$;

-- ---------- PROFILES -------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role      not null default 'customer',
  status        account_status not null default 'approved',
  full_name     text           not null default '',
  email         text,
  phone         text,
  national_id_number text,
  id_photo_path text,                 -- private storage path (bucket: ids)
  id_submitted  boolean        not null default false,
  avatar_url    text,
  bio           text,
  location      text,
  skills        text[]         not null default '{}',   -- service slugs an employee offers
  rating_avg    numeric(3,2)   not null default 0,
  rating_count  integer        not null default 0,
  rejection_reason text,
  created_at    timestamptz    not null default now()
);

-- ---------- SERVICES -------------------------------------------------
create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  category    text not null,               -- house_hunting | cleaning | laundry | care | errands
  description text not null default '',
  base_price  integer not null,            -- KSh
  price_unit  text not null default 'flat',-- flat | per_seater | per_kg | per_basket | per_child_8hrs
  price_note  text not null default 'As from',
  featured    boolean not null default false,
  icon        text not null default 'sparkles',
  sort_order  integer not null default 100,
  active      boolean not null default true
);

-- ---------- BOOKINGS -------------------------------------------------
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  reference      text unique not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  customer_id    uuid not null references public.profiles(id) on delete cascade,
  employee_id    uuid not null references public.profiles(id) on delete restrict,
  service_id     uuid not null references public.services(id),
  status         booking_status not null default 'awaiting_deposit',
  quantity       integer not null default 1 check (quantity > 0),
  details        jsonb   not null default '{}'::jsonb,   -- service-specific answers
  address        text    not null,
  scheduled_date date,
  scheduled_time text,
  notes          text,
  estimated_price integer not null default 0,
  deposit_amount  integer not null default 0,
  deposit_paid    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists bookings_customer_idx on public.bookings(customer_id);
create index if not exists bookings_employee_idx on public.bookings(employee_id);

-- ---------- PAYMENTS -------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings(id) on delete cascade,
  customer_id         uuid not null references public.profiles(id),
  amount              integer not null,
  phone               text,
  method              text not null default 'mpesa',
  status              text not null default 'pending',  -- pending | paid | failed
  checkout_request_id text,
  mpesa_receipt       text,
  created_at          timestamptz not null default now()
);

-- ---------- MESSAGES -------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_booking_idx on public.messages(booking_id, created_at);

-- ---------- REVIEWS --------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid unique not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

-- ---------- PORTFOLIO ("OUR WORK") ----------------------------------
create table if not exists public.portfolio (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text not null default 'cleaning',
  image_path  text not null,              -- path in public bucket "portfolio"
  created_at  timestamptz not null default now()
);

-- ---------- NOTIFICATIONS -------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------- SETTINGS (admin editable) -------------------------------
create table if not exists public.settings (
  key   text primary key,
  value text not null
);
insert into public.settings(key, value) values
  ('deposit_threshold', '1000'),
  ('deposit_percent',   '10'),
  ('deposit_flat',      '100'),
  ('contact_phone',     '0707 089 523'),
  ('contact_email',     'jhomeandofficecare@gmail.com')
on conflict (key) do nothing;

-- =====================================================================
--  HELPER FUNCTIONS
-- =====================================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved');
$$;

create or replace function public.setting_int(k text, d integer) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((select value::integer from settings where key = k), d);
$$;

-- deposit rule: price >= threshold -> percent %, otherwise flat amount
create or replace function public.compute_deposit(price integer) returns integer
language sql stable security definer set search_path = public as $$
  select case
    when price >= setting_int('deposit_threshold', 1000)
      then ceil(price * setting_int('deposit_percent', 10) / 100.0)::integer
    else setting_int('deposit_flat', 100)
  end;
$$;

-- =====================================================================
--  TRIGGERS
-- =====================================================================

-- 1) create profile when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r user_role := 'customer';
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if meta->>'role' = 'employee' then r := 'employee'; end if;   -- admin can never be self-assigned
  insert into public.profiles (id, role, status, full_name, email, phone, national_id_number, skills, location)
  values (
    new.id, r,
    case when r = 'employee' then 'pending'::account_status else 'approved'::account_status end,
    coalesce(meta->>'full_name',''), new.email, meta->>'phone', meta->>'national_id_number',
    coalesce(array(select jsonb_array_elements_text(meta->'skills')), '{}'),
    meta->>'location'
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) users cannot change their own role / status / rating
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role         := old.role;
    new.status       := old.status;
    new.rating_avg   := old.rating_avg;
    new.rating_count := old.rating_count;
    new.rejection_reason := old.rejection_reason;
    new.email        := old.email;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 3) server computes price + deposit on every booking insert
create or replace function public.price_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare s services%rowtype;
begin
  select * into s from services where id = new.service_id and active;
  if not found then raise exception 'Service not available'; end if;
  if not exists (select 1 from profiles where id = new.employee_id and role = 'employee' and status = 'approved') then
    raise exception 'Chosen provider is not available';
  end if;
  new.estimated_price := s.base_price * greatest(new.quantity, 1);
  new.deposit_amount  := public.compute_deposit(new.estimated_price);
  new.deposit_paid    := false;
  new.status          := 'awaiting_deposit';
  return new;
end $$;

drop trigger if exists price_booking_trg on public.bookings;
create trigger price_booking_trg before insert on public.bookings
  for each row execute function public.price_booking();

-- 4) protect booking money fields + enforce status rules on update
create or replace function public.protect_booking_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is null then return new; end if;   -- service role (payment callback)
  if public.is_admin() then return new; end if;

  -- nobody else can touch money / ownership fields
  new.deposit_paid     := old.deposit_paid;
  new.deposit_amount   := old.deposit_amount;
  new.estimated_price  := old.estimated_price;
  new.customer_id      := old.customer_id;
  new.employee_id      := old.employee_id;
  new.service_id       := old.service_id;

  if auth.uid() = old.employee_id then
    -- employees only move the job forward, and only after the deposit is paid
    if not old.deposit_paid then new.status := old.status; end if;
    if new.status not in ('accepted','declined','in_progress','completed') then new.status := old.status; end if;
    if new.status = 'declined' and old.deposit_paid then new.status := 'refund_due'; end if;
  elsif auth.uid() = old.customer_id then
    if new.status not in ('cancelled') then new.status := old.status; end if;
    if new.status = 'cancelled' and old.deposit_paid then new.status := 'refund_due'; end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_booking on public.bookings;
create trigger protect_booking before update on public.bookings
  for each row execute function public.protect_booking_fields();

-- 5) deposit paid -> move booking forward and notify both sides
create or replace function public.on_deposit_paid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- only the server (payment callback, no auth user) or an admin may mark a deposit as paid
  if new.deposit_paid and not old.deposit_paid and (auth.uid() is null or public.is_admin()) then
    new.status := 'requested';
    insert into notifications(user_id, title, body, link) values
      (new.employee_id, 'New booking request', 'A customer has paid the deposit. Open the job to accept it.', '/employee/jobs'),
      (new.customer_id, 'Deposit received', 'Chat with your provider is now unlocked.', '/customer/bookings');
  end if;
  return new;
end $$;

drop trigger if exists on_deposit_paid_trg on public.bookings;
create trigger on_deposit_paid_trg before update on public.bookings
  for each row execute function public.on_deposit_paid();

-- 6) messages are only allowed after the deposit is paid
create or replace function public.guard_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare b bookings%rowtype;
begin
  select * into b from bookings where id = new.booking_id;
  if not found or not b.deposit_paid then
    raise exception 'Chat unlocks after the booking deposit is paid';
  end if;
  if new.sender_id <> auth.uid() or auth.uid() not in (b.customer_id, b.employee_id) then
    raise exception 'Not a participant of this booking';
  end if;
  return new;
end $$;

drop trigger if exists guard_message_trg on public.messages;
create trigger guard_message_trg before insert on public.messages
  for each row execute function public.guard_message();

-- 7) keep employee rating average up to date
create or replace function public.refresh_rating() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles p set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 2) from reviews where employee_id = new.employee_id), 0),
    rating_count = (select count(*) from reviews where employee_id = new.employee_id)
  where p.id = new.employee_id;
  return new;
end $$;

drop trigger if exists refresh_rating_trg on public.reviews;
create trigger refresh_rating_trg after insert or update on public.reviews
  for each row execute function public.refresh_rating();

-- 8) a review is only valid for a completed booking owned by the reviewer
create or replace function public.guard_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare b bookings%rowtype;
begin
  select * into b from bookings where id = new.booking_id;
  if not found or b.customer_id <> auth.uid() or b.status <> 'completed' then
    raise exception 'You can only review your own completed bookings';
  end if;
  new.customer_id := b.customer_id;
  new.employee_id := b.employee_id;
  return new;
end $$;

drop trigger if exists guard_review_trg on public.reviews;
create trigger guard_review_trg before insert on public.reviews
  for each row execute function public.guard_review();

-- =====================================================================
--  PROVIDER DIRECTORY  (what customers may see about employees)
--  Customers never get phone / email / ID details of employees.
-- =====================================================================
create or replace view public.provider_directory
with (security_invoker = false) as
  select id, full_name, avatar_url, bio, location, skills, rating_avg, rating_count, created_at
  from public.profiles
  where role = 'employee' and status = 'approved';

grant select on public.provider_directory to authenticated;

-- =====================================================================
--  ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.services       enable row level security;
alter table public.bookings       enable row level security;
alter table public.payments       enable row level security;
alter table public.messages       enable row level security;
alter table public.reviews        enable row level security;
alter table public.portfolio      enable row level security;
alter table public.notifications  enable row level security;
alter table public.settings       enable row level security;

-- profiles
drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "admin profile read" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "admin profile all"  on public.profiles;
drop policy if exists "booking party read" on public.profiles;
create policy "own profile read"   on public.profiles for select using (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid());
create policy "admin profile all"  on public.profiles for all using (public.is_admin()) with check (public.is_admin());
-- NOTE: customers and employees can NOT read each other's profile rows directly
-- (that would leak ID numbers / emails). They use public.booking_counterpart() below instead.
drop policy if exists "booking party read" on public.profiles;
drop policy if exists "employee sees booker" on public.profiles;

create or replace function public.booking_counterpart(bid uuid)
returns table (id uuid, full_name text, avatar_url text, phone text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url,
         case when b.deposit_paid then p.phone else null end as phone   -- contact only after deposit
  from bookings b
  join profiles p on p.id = case when auth.uid() = b.customer_id then b.employee_id else b.customer_id end
  where b.id = bid and auth.uid() in (b.customer_id, b.employee_id);
$$;
grant execute on function public.booking_counterpart(uuid) to authenticated;

-- services (public read, admin write)
drop policy if exists "services read"  on public.services;
drop policy if exists "services admin" on public.services;
create policy "services read"  on public.services for select using (true);
create policy "services admin" on public.services for all using (public.is_admin()) with check (public.is_admin());

-- bookings
drop policy if exists "bookings read"   on public.bookings;
drop policy if exists "bookings insert" on public.bookings;
drop policy if exists "bookings update" on public.bookings;
drop policy if exists "bookings admin"  on public.bookings;
create policy "bookings read"   on public.bookings for select using (customer_id = auth.uid() or employee_id = auth.uid());
create policy "bookings insert" on public.bookings for insert with check (
  customer_id = auth.uid()
  and exists (select 1 from profiles where id = auth.uid() and role = 'customer')
);
create policy "bookings update" on public.bookings for update using (customer_id = auth.uid() or employee_id = auth.uid());
create policy "bookings admin"  on public.bookings for all using (public.is_admin()) with check (public.is_admin());

-- payments (written by the server only)
drop policy if exists "payments read"  on public.payments;
drop policy if exists "payments admin" on public.payments;
create policy "payments read"  on public.payments for select using (customer_id = auth.uid());
create policy "payments admin" on public.payments for select using (public.is_admin());

-- messages
drop policy if exists "messages read"   on public.messages;
drop policy if exists "messages insert" on public.messages;
drop policy if exists "messages admin"  on public.messages;
create policy "messages read" on public.messages for select using (
  exists (select 1 from bookings b where b.id = messages.booking_id and b.deposit_paid
          and auth.uid() in (b.customer_id, b.employee_id))
);
create policy "messages insert" on public.messages for insert with check (sender_id = auth.uid());
create policy "messages admin"  on public.messages for select using (public.is_admin());

-- reviews
drop policy if exists "reviews read"   on public.reviews;
drop policy if exists "reviews insert" on public.reviews;
drop policy if exists "reviews admin"  on public.reviews;
create policy "reviews read"   on public.reviews for select using (true);
create policy "reviews insert" on public.reviews for insert with check (customer_id = auth.uid());
create policy "reviews admin"  on public.reviews for delete using (public.is_admin());

-- portfolio (public read, admin write)
drop policy if exists "portfolio read"  on public.portfolio;
drop policy if exists "portfolio admin" on public.portfolio;
create policy "portfolio read"  on public.portfolio for select using (true);
create policy "portfolio admin" on public.portfolio for all using (public.is_admin()) with check (public.is_admin());

-- notifications
drop policy if exists "notif own"   on public.notifications;
drop policy if exists "notif admin" on public.notifications;
create policy "notif own"   on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif admin" on public.notifications for insert with check (public.is_admin());

-- settings
drop policy if exists "settings read"  on public.settings;
drop policy if exists "settings admin" on public.settings;
create policy "settings read"  on public.settings for select using (true);
create policy "settings admin" on public.settings for all using (public.is_admin()) with check (public.is_admin());

-- realtime for chat + notifications
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;

-- =====================================================================
--  STORAGE BUCKETS
--    ids        private   employee ID card photos (owner + admin only)
--    portfolio  public    "OUR WORK" pictures (admin writes)
--    avatars    public    profile pictures
-- =====================================================================
insert into storage.buckets (id, name, public) values
  ('ids', 'ids', false),
  ('portfolio', 'portfolio', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "ids owner insert"  on storage.objects;
drop policy if exists "ids owner read"    on storage.objects;
drop policy if exists "ids admin read"    on storage.objects;
drop policy if exists "portfolio read"    on storage.objects;
drop policy if exists "portfolio admin"   on storage.objects;
drop policy if exists "avatars read"      on storage.objects;
drop policy if exists "avatars owner"     on storage.objects;

create policy "ids owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'ids' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ids owner read" on storage.objects for select to authenticated
  using (bucket_id = 'ids' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ids admin read" on storage.objects for select to authenticated
  using (bucket_id = 'ids' and public.is_admin());

create policy "portfolio read"  on storage.objects for select using (bucket_id = 'portfolio');
create policy "portfolio admin" on storage.objects for all to authenticated
  using (bucket_id = 'portfolio' and public.is_admin()) with check (bucket_id = 'portfolio' and public.is_admin());

create policy "avatars read"  on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars owner" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
--  SEED: SERVICES (prices from your flyers, in KSh)
-- =====================================================================
insert into public.services (slug, name, category, description, base_price, price_unit, featured, icon, sort_order) values
 ('house-hunting',   'House Hunting',          'house_hunting', 'Tell us your location and rent budget - we do the search. Studios, 1/2/3 bedrooms, own compound, maisonettes, apartments and mansionettes.', 1000, 'flat', true,  'search-home', 1),
 ('everyday-care',   'Everyday Care Cleaning', 'cleaning', 'Surface cleaning, toilet cleaning and disinfection, dusting of seats, tables and reachable areas, sweeping and mopping of all floors.', 1000, 'flat', true,  'sparkles', 2),
 ('deep-clean-care', 'Deep Clean Care',        'cleaning', 'Surface cleaning, closet organising, utensil cleaning, toilet and bathroom disinfection, dusting, window cleaning, sweeping and mopping.', 2000, 'flat', true,  'spray', 3),
 ('general-house-cleaning',  'General House Cleaning',  'cleaning', 'Regular cleaning for your home.', 1000, 'flat', false, 'home', 4),
 ('thorough-house-cleaning', 'Thorough House Cleaning', 'cleaning', 'Top-to-bottom cleaning for your whole house.', 2000, 'flat', false, 'home', 5),
 ('office-cleaning', 'Office Cleaning',        'cleaning', 'Professional cleaning for offices and workspaces.', 2000, 'flat', false, 'building', 6),
 ('carpet-cleaning', 'Carpet Cleaning',        'cleaning', 'Deep carpet cleaning. Free pick up and delivery available.', 400, 'flat', false, 'carpet', 7),
 ('couch-cleaning',  'Couch Cleaning',         'cleaning', 'Couch cleaning priced per seater.', 500, 'per_seater', false, 'sofa', 8),
 ('dish-washing',    'Dish Washing',           'cleaning', 'Dishes washed and put away.', 200, 'flat', false, 'utensils', 9),
 ('laundry',         'Laundry',                'laundry',  'Washed, dried and neatly folded. Free pick up and delivery available.', 60, 'per_kg', false, 'shirt', 10),
 ('folding-clothes', 'Folding Clothes',        'laundry',  'Neat folding and arranging of clothes.', 200, 'flat', false, 'shirt', 11),
 ('mama-fua',        'Mama Fua (New)',         'laundry',  'Perfect for distant customers and delicate garments. Priced per basket.', 800, 'per_basket', false, 'basket', 12),
 ('baby-sitting',    'Baby Sitting',           'care',     'Trusted baby sitting. Priced per child for 8 hours.', 600, 'per_child_8hrs', false, 'baby', 13),
 ('errands',         'Errands',                'errands',  'House hunting, market, business goods, home furnishing, pick up and delivery, school search, gift purchase, travel and appointments.', 400, 'flat', false, 'run', 14)
on conflict (slug) do nothing;

-- =====================================================================
--  MAKE YOURSELF THE ADMIN
--  1. Sign up on the website with your own email as a normal customer.
--  2. Then run this (replace the email) :
--
--  update public.profiles set role = 'admin', status = 'approved'
--  where email = 'jhomeandofficecare@gmail.com';
-- =====================================================================
