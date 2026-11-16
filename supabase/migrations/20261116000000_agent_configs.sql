
-- Store editable AI agent configurations.
-- Only authenticated administrators can read or modify them.

create table public.agent_configs (
    agent_key text primary key
        check (agent_key in ('marketing', 'development', 'recipe')),

    display_name text not null,
    role text not null,
    goal text not null,
    backstory text not null,
    instructions text not null default '',

    enabled boolean not null default true,

    updated_at timestamptz not null default now(),
    updated_by uuid references auth.users(id) on delete set null
);

-- Enable Row Level Security.
alter table public.agent_configs enable row level security;

-- Remove access from anonymous users.
revoke all on public.agent_configs from anon;

-- Allow administrators to read configurations.
create policy "agent_configs: admins read"
on public.agent_configs
for select
to authenticated
using ((select public.is_admin()));

-- Allow administrators to insert configurations.
create policy "agent_configs: admins insert"
on public.agent_configs
for insert
to authenticated
with check ((select public.is_admin()));

-- Allow administrators to update configurations.
create policy "agent_configs: admins update"
on public.agent_configs
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- No delete policy: configurations cannot be deleted through the client.
grant select, insert, update on public.agent_configs to authenticated;

-- Automatically update timestamps.
create trigger agent_configs_set_updated_at
before update on public.agent_configs
for each row
execute function public.set_updated_at();
