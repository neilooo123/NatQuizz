-- =====================================================================
-- NatQuizz : schéma de la base Supabase
--
-- À coller en entier dans Supabase > SQL Editor > « New query »,
-- puis cliquer sur « Run ». Le script peut être relancé sans danger.
-- =====================================================================


-- 1. Tables -------------------------------------------------------------

-- Une fiche espèce (les noms), propre à chaque utilisateur.
create table if not exists public.species (
  id uuid primary key,                       -- créé par l'appli
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vernacular_name text not null,
  latin_name text not null default '',       -- peut être complété plus tard
  category text not null default '',         -- groupe : arbre, oiseau…
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz                     -- suppression « douce » (synchro)
);

-- Une observation : photo, lieu, date, observateur.
create table if not exists public.observations (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  species_id uuid not null references public.species (id) on delete cascade,
  photo_path text,                           -- chemin dans le bucket « photos »
  observed_at timestamptz not null,
  latitude double precision,
  longitude double precision,
  place_name text not null default '',
  observer text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Une fiche partagée (QR code / lien), lisible par qui connaît son id.
create table if not exists public.shares (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create index if not exists species_user_updated_idx on public.species (user_id, updated_at);
create index if not exists observations_user_updated_idx on public.observations (user_id, updated_at);
create index if not exists observations_species_idx on public.observations (species_id);


-- 2. Date de modification fixée par le serveur ---------------------------
-- La synchronisation s'appuie sur l'heure du serveur, pas sur celle
-- (parfois fausse) des téléphones.

create or replace function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger species_set_updated_at
  before insert or update on public.species
  for each row execute function public.set_updated_at();

create or replace trigger observations_set_updated_at
  before insert or update on public.observations
  for each row execute function public.set_updated_at();


-- 3. Sécurité : chacun ne voit que ses propres données (RLS) ------------

alter table public.species enable row level security;
alter table public.observations enable row level security;
alter table public.shares enable row level security;

drop policy if exists "species: accès propriétaire" on public.species;
create policy "species: accès propriétaire" on public.species
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "observations: accès propriétaire" on public.observations;
create policy "observations: accès propriétaire" on public.observations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "shares: accès propriétaire" on public.shares;
create policy "shares: accès propriétaire" on public.shares
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- Droits explicites (Supabase n'ouvre plus les nouvelles tables par défaut).
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.species, public.observations, public.shares to authenticated;
revoke all on public.species, public.observations, public.shares from anon;


-- 4. Lecture d'une fiche partagée ----------------------------------------
-- « security definer » : la fonction passe outre la RLS, mais ne renvoie
-- qu'un partage dont on connaît l'identifiant (impossible de lister).

create or replace function public.get_share(share_id uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select s.payload
  from public.shares s
  where s.id = share_id
    and s.expires_at > now();
$$;

revoke all on function public.get_share(uuid) from public, anon;
grant execute on function public.get_share(uuid) to authenticated;


-- 5. Stockage des photos -------------------------------------------------
-- Bucket privé ; chaque utilisateur n'accède qu'à son dossier « <son id>/ ».

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "photos: lecture propriétaire" on storage.objects;
create policy "photos: lecture propriétaire" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "photos: ajout propriétaire" on storage.objects;
create policy "photos: ajout propriétaire" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "photos: modification propriétaire" on storage.objects;
create policy "photos: modification propriétaire" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "photos: suppression propriétaire" on storage.objects;
create policy "photos: suppression propriétaire" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
