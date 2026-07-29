create type public.app_role as enum ('owner','admin','player');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('owner','admin'))
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  rarity text not null default 'common',
  color text not null,
  accent text not null,
  style int not null default 2,
  speed int not null default 5,
  handling int not null default 5,
  acceleration int not null default 5,
  braking int not null default 5,
  unlock_type text not null default 'starter',
  unlock_value int not null default 0,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.cars to anon, authenticated;
grant all on public.cars to service_role;
alter table public.cars enable row level security;
create policy "Cars are public" on public.cars for select to anon, authenticated using (true);
create policy "Owner manages cars" on public.cars for all to authenticated
  using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

insert into public.cars (slug,name,rarity,color,accent,style,speed,handling,acceleration,braking,unlock_type,unlock_value,description,sort_order) values
 ('cyan-cruiser','Cyan Cruiser','common','#00e5ff','#e9fdff',2,5,6,5,5,'starter',0,'Balanced all-rounder. The classic neon commuter.',1),
 ('ember-gt','Ember GT','common','#ff7a18','#ffe0b8',1,6,4,6,4,'starter',0,'Hot-headed coupe with punchy acceleration.',2),
 ('violet-vector','Violet Vector','common','#b46bff','#f0e2ff',3,4,7,5,5,'starter',0,'Nimble wedge built for tight lane weaving.',3),
 ('nitro-shark','Nitro Shark','rare','#00ff9d','#dcfff2',2,6,6,6,4,'high_score',25,'Reach a high score of 25 to unlock.',4),
 ('phantom-drift','Phantom Drift','rare','#ff2d6f','#ffd9e5',3,5,7,5,6,'high_score',50,'Reach a high score of 50 to unlock.',5),
 ('chrome-vandal','Chrome Vandal','rare','#c9d6e4','#ffffff',1,5,5,6,6,'games_played',10,'Play 10 runs to unlock.',6),
 ('solar-reaper','Solar Reaper','epic','#ffd400','#fff6c2',2,7,5,6,5,'high_score',100,'Reach a high score of 100 to unlock.',7),
 ('midnight-onyx','Midnight Onyx','epic','#2b3550','#8fa5c9',3,6,6,5,7,'games_played',50,'Play 50 runs to unlock.',8),
 ('gold-baron','Gold Baron','legendary','#e6b422','#fff1b8',1,6,6,7,5,'total_coins',100,'Collect 100 coins in total to unlock.',9),
 ('aurora-prime','Aurora Prime','legendary','#7dfcd6','#eafff8',2,7,7,6,6,'high_score',200,'Reach a high score of 200 to unlock.',10);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  high_score int not null default 0,
  games_played int not null default 0,
  total_coins int not null default 0,
  total_score bigint not null default 0,
  selected_car_slug text not null default 'cyan-cruiser' references public.cars(slug),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles are public" on public.profiles for select to anon, authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create table public.unlocked_cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, car_id)
);
grant select on public.unlocked_cars to authenticated;
grant all on public.unlocked_cars to service_role;
alter table public.unlocked_cars enable row level security;
create policy "Users read own unlocks" on public.unlocked_cars for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create or replace function public.protect_profile_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then
    new.updated_at = now();
    return new;
  end if;
  if new.high_score is distinct from old.high_score
     or new.games_played is distinct from old.games_played
     or new.total_coins is distinct from old.total_coins
     or new.total_score is distinct from old.total_score
     or new.id is distinct from old.id then
    raise exception 'Score fields can only be updated by the game server';
  end if;
  if new.selected_car_slug is distinct from old.selected_car_slug
     and not exists (select 1 from public.unlocked_cars uc
                     join public.cars c on c.id = uc.car_id
                     where uc.user_id = new.id and c.slug = new.selected_car_slug) then
    raise exception 'Car is not unlocked';
  end if;
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_protect_stats before update on public.profiles
  for each row execute function public.protect_profile_stats();

create table public.game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  coins int not null default 0,
  duration_ms int not null default 0,
  car_slug text not null default 'cyan-cruiser',
  created_at timestamptz not null default now()
);
create index game_runs_user_idx on public.game_runs(user_id, created_at desc);
create index game_runs_score_idx on public.game_runs(score desc);
grant select on public.game_runs to authenticated;
grant all on public.game_runs to service_role;
alter table public.game_runs enable row level security;
create policy "Users read own runs" on public.game_runs for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_name text;
  final_name text;
  n int := 0;
  assigned public.app_role;
begin
  base_name := coalesce(nullif(trim(new.raw_user_meta_data->>'username'),''), split_part(new.email,'@',1));
  base_name := regexp_replace(base_name, '[^A-Za-z0-9_ -]', '', 'g');
  if length(base_name) < 3 then base_name := 'racer' || floor(random()*10000)::text; end if;
  final_name := base_name;
  while exists (select 1 from public.profiles where lower(username) = lower(final_name)) loop
    n := n + 1;
    final_name := base_name || n::text;
  end loop;

  insert into public.profiles (id, username) values (new.id, final_name);

  insert into public.unlocked_cars (user_id, car_id)
    select new.id, id from public.cars where unlock_type = 'starter';

  if lower(new.email) = 'rahmah.gl.syedaaziz@gmail.com' then assigned := 'owner';
  elsif lower(new.email) = 'syedaazizfatima@gmail.com' then assigned := 'admin';
  else assigned := 'player';
  end if;
  insert into public.user_roles (user_id, role) values (new.id, assigned) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.get_player_rank(_user_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when p.high_score <= 0 then null else
    (select count(*)::int + 1 from public.profiles o where o.high_score > p.high_score)
  end from public.profiles p where p.id = _user_id
$$;
grant execute on function public.get_player_rank(uuid) to anon, authenticated;