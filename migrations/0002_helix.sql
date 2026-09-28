-- Helix CRM + ticketing schema. All tenant data is scoped by user_id
-- (staff workspace owner) or by portal_user_id on clients (client portal).

create table if not exists profiles (
  user_id text primary key,
  role text not null check (role in ('staff', 'client')),
  name text not null,
  company text not null default '',
  desk_code text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_desk_code_idx on profiles (desk_code) where desk_code <> '';

create table if not exists clients (
  id serial primary key,
  user_id text not null,
  company text not null,
  contact_name text not null,
  email text not null default '',
  phone text not null default '',
  portal_user_id text,
  status text not null default 'active',
  plan text not null default 'managed',
  notes text not null default '',
  city text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists clients_user_id_idx on clients (user_id);
create index if not exists clients_portal_user_id_idx on clients (portal_user_id);

create table if not exists tickets (
  id serial primary key,
  user_id text not null,
  client_id int not null references clients(id) on delete cascade,
  number int not null,
  subject text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  channel text not null default 'portal',
  assignee text not null default 'Unassigned',
  requester_name text not null default '',
  requester_email text not null default '',
  sla_due_at timestamptz,
  first_response_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_user_id_idx on tickets (user_id);
create index if not exists tickets_client_id_idx on tickets (client_id);
create index if not exists tickets_status_idx on tickets (status);
create unique index if not exists tickets_user_number_idx on tickets (user_id, number);

create table if not exists ticket_messages (
  id serial primary key,
  user_id text not null,
  ticket_id int not null references tickets(id) on delete cascade,
  author_type text not null,
  author_name text not null,
  body text not null,
  is_internal boolean not null default false,
  channel text not null default 'portal',
  created_at timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_id_idx on ticket_messages (ticket_id);

create table if not exists kb_articles (
  id serial primary key,
  user_id text not null,
  title text not null,
  category text not null,
  excerpt text not null default '',
  body text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists kb_articles_user_id_idx on kb_articles (user_id);

create table if not exists channels (
  id serial primary key,
  user_id text not null,
  kind text not null,
  status text not null default 'pending',
  handle text not null default '',
  verify_token text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists channels_user_kind_idx on channels (user_id, kind);
create unique index if not exists channels_verify_token_idx on channels (verify_token);

create table if not exists ticket_seq (
  user_id text primary key,
  last_number int not null default 1000
);
