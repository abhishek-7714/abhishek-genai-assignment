-- FollowUpOS schema
-- Inbox → Signal → Action → Follow-up → Resolution

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.conversation_state as enum ('new', 'needs_attention', 'waiting_customer', 'resolved');
create type public.priority_level as enum ('high', 'medium', 'low');
create type public.sentiment_level as enum ('positive', 'neutral', 'concerned', 'negative', 'urgent');
create type public.follow_up_status as enum ('open', 'done', 'cancelled');
create type public.message_direction as enum ('inbound', 'outbound');

-- ---------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', null));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Businesses (one per owner for this prototype)
-- ---------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  business_type text not null check (business_type in ('salon', 'home_bakery', 'photographer', 'tutor', 'fitness_trainer', 'other')),
  language text not null default 'english' check (language in ('english', 'hindi', 'hinglish', 'regional')),
  facts text not null default '' check (char_length(facts) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.owns_business(b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.businesses
    where id = b and owner_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- Gmail: metadata (owner-readable) and credentials (server-only)
-- ---------------------------------------------------------------------
create table public.gmail_connections (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  email text not null,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected', 'error')),
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tokens are AES-256-GCM encrypted by the server before they reach the database.
create table public.gmail_credentials (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  refresh_token_enc text not null,
  access_token_enc text,
  access_token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Conversations, messages, analyses, follow-ups
-- ---------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  source text not null check (source in ('gmail', 'demo')),
  gmail_thread_id text,
  customer_name text,
  customer_email text,
  subject text,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  last_direction public.message_direction,
  state public.conversation_state not null default 'new',
  priority_override public.priority_level,
  analysis_dismissed boolean not null default false,
  needs_analysis boolean not null default true,
  latest_analysis_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, gmail_thread_id)
);

create index conversations_business_recent on public.conversations (business_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  business_id uuid not null,
  gmail_message_id text,
  rfc_message_id text,
  direction public.message_direction not null,
  from_name text,
  from_email text,
  to_email text,
  subject text,
  body text not null default '',
  sent_at timestamptz not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (conversation_id, business_id) references public.conversations (id, business_id) on delete cascade,
  unique (business_id, gmail_message_id)
);

create index messages_conversation_time on public.messages (conversation_id, sent_at);

create table public.conversation_analyses (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  business_id uuid not null,
  intent text not null,
  request_type text not null,
  priority public.priority_level not null,
  sentiment public.sentiment_level not null,
  urgency text not null check (urgency in ('immediate', 'today', 'this_week', 'no_rush')),
  blocker text not null,
  suggested_reply text not null,
  next_action text not null,
  reply_language text not null,
  needs_review boolean not null default false,
  review_reason text,
  is_demo boolean not null default false,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  foreign key (conversation_id, business_id) references public.conversations (id, business_id) on delete cascade
);

create index analyses_conversation_time on public.conversation_analyses (conversation_id, created_at desc);

alter table public.conversations
  add constraint conversations_latest_analysis_fk
  foreign key (latest_analysis_id) references public.conversation_analyses (id) on delete set null;

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  business_id uuid not null,
  action text not null check (char_length(action) between 1 and 300),
  due_at timestamptz not null,
  status public.follow_up_status not null default 'open',
  completed_at timestamptz,
  snooze_count integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (conversation_id, business_id) references public.conversations (id, business_id) on delete cascade
);

-- At most one open follow-up per conversation: setting a new one replaces the old.
create unique index follow_ups_one_open on public.follow_ups (conversation_id) where status = 'open';
create index follow_ups_business_due on public.follow_ups (business_id, status, due_at);

-- ---------------------------------------------------------------------
-- Assignment-facing AI exchange log (no customer PII from Gmail)
-- ---------------------------------------------------------------------
create table public.ai_exchanges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  input text not null,
  output jsonb not null,
  input_tokens integer,
  output_tokens integer,
  shop_type text,
  language text,
  request_type text,
  visitor_id text,
  source text not null default 'analyzer' check (source in ('analyzer', 'app'))
);

create index ai_exchanges_created on public.ai_exchanges (created_at desc);

-- Server-side request counter for analyzer limits
create table public.usage_events (
  id bigint generated always as identity primary key,
  usage_key text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index usage_events_key on public.usage_events (usage_key, created_at);
create index usage_events_ip on public.usage_events (ip_hash, created_at);

-- Atomically reserves one request. Returns remaining requests after this one, or -1 if the limit is reached.
create function public.reserve_usage(p_key text, p_ip_hash text, p_limit integer, p_window interval)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_key));
  if p_ip_hash is not null then
    perform pg_advisory_xact_lock(hashtext(p_ip_hash));
  end if;

  select greatest(
    (select count(*) from public.usage_events where usage_key = p_key and created_at > now() - p_window),
    case when p_ip_hash is null then 0
      else (select count(*) from public.usage_events where ip_hash = p_ip_hash and created_at > now() - p_window) end
  ) into used;

  if used >= p_limit then
    return -1;
  end if;

  insert into public.usage_events (usage_key, ip_hash) values (p_key, p_ip_hash);
  return p_limit - used - 1;
end;
$$;

create function public.release_usage(p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.usage_events
  where id = (select id from public.usage_events where usage_key = p_key order by created_at desc limit 1);
$$;

-- Assignment read-back metrics, derived from ai_exchanges.
-- shops = distinct shops served (anonymous analyzer visitors + app businesses), across N languages.
create function public.analyzer_readback()
returns table (shops bigint, languages bigint, shop_types bigint, top_request_type text, top_request_count bigint, exchanges bigint, avg_input_tokens numeric, avg_output_tokens numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(distinct visitor_id) from public.ai_exchanges where visitor_id is not null),
    (select count(distinct language) from public.ai_exchanges where language is not null),
    (select count(distinct shop_type) from public.ai_exchanges where shop_type is not null),
    (select request_type from public.ai_exchanges where request_type is not null
       group by request_type order by count(*) desc, request_type limit 1),
    (select count(*) from public.ai_exchanges where request_type is not null
       group by request_type order by count(*) desc, request_type limit 1),
    (select count(*) from public.ai_exchanges),
    (select round(avg(input_tokens), 1) from public.ai_exchanges where input_tokens is not null),
    (select round(avg(output_tokens), 1) from public.ai_exchanges where output_tokens is not null);
$$;

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_touch before update on public.businesses for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations for each row execute function public.touch_updated_at();
create trigger gmail_connections_touch before update on public.gmail_connections for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.gmail_connections enable row level security;
alter table public.gmail_credentials enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_analyses enable row level security;
alter table public.follow_ups enable row level security;
alter table public.ai_exchanges enable row level security;
alter table public.usage_events enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own business" on public.businesses
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Owners can see their connection status; all writes go through the server.
create policy "read own gmail connection" on public.gmail_connections
  for select to authenticated using (public.owns_business(business_id));

create policy "own conversations" on public.conversations
  for all to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create policy "own messages" on public.messages
  for all to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create policy "own analyses" on public.conversation_analyses
  for select to authenticated using (public.owns_business(business_id));

create policy "own follow-ups" on public.follow_ups
  for all to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- gmail_credentials, ai_exchanges and usage_events have no policies: service role only.
revoke all on public.gmail_credentials, public.ai_exchanges, public.usage_events from anon, authenticated;
revoke all on public.gmail_connections from anon;
revoke insert, update, delete on public.gmail_connections, public.conversation_analyses from authenticated;
revoke execute on function public.reserve_usage(text, text, integer, interval) from public, anon, authenticated;
revoke execute on function public.release_usage(text) from public, anon, authenticated;
revoke execute on function public.analyzer_readback() from public, anon, authenticated;
