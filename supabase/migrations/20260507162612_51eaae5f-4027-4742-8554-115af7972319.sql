
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  plan text not null default 'trial',
  credits int not null default 0,
  trial_ends_at timestamptz default (now() + interval '7 days'),
  onboarding_dismissed boolean not null default false,
  dark_mode boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  business_type text,
  phone text,
  city text,
  address text,
  created_at timestamptz not null default now()
);
alter table public.clients enable row level security;
create policy "own clients all" on public.clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.clients(user_id);

-- Tours
create table public.tours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  type text not null default 'gmaps', -- 'gmaps' | 'custom'
  status text not null default 'draft', -- draft|processing|published|partial|rejected
  address text,
  google_place_url text,
  google_place_id text,
  cid text,
  created_at timestamptz not null default now()
);
alter table public.tours enable row level security;
create policy "own tours all" on public.tours for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.tours(user_id);

-- Islands
create table public.islands (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.islands enable row level security;
create policy "own islands all" on public.islands for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.islands(tour_id);

-- Photos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tour_id uuid not null references public.tours(id) on delete cascade,
  island_id uuid references public.islands(id) on delete set null,
  file_url text not null,
  file_path text not null,
  filename text,
  size_bytes bigint,
  status text not null default 'uploaded', -- uploaded|processing|published|rejected
  latitude double precision,
  longitude double precision,
  uploaded_at timestamptz not null default now()
);
alter table public.photos enable row level security;
create policy "own photos all" on public.photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.photos(tour_id);
create index on public.photos(island_id);

-- Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null,
  status text not null default 'active',
  razorpay_subscription_id text,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  amount_inr int,
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "own subs select" on public.subscriptions for select using (auth.uid() = user_id);
create policy "own subs insert" on public.subscriptions for insert with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Storage bucket
insert into storage.buckets (id, name, public) values ('tour-photos', 'tour-photos', true)
on conflict (id) do nothing;

create policy "tour-photos read" on storage.objects for select using (bucket_id = 'tour-photos');
create policy "tour-photos insert own" on storage.objects for insert
  with check (bucket_id = 'tour-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "tour-photos update own" on storage.objects for update
  using (bucket_id = 'tour-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "tour-photos delete own" on storage.objects for delete
  using (bucket_id = 'tour-photos' and auth.uid()::text = (storage.foldername(name))[1]);
