-- Chain deals: a single crawled source (e.g. a brand's national offers page) whose deals fan out to every active
-- business sharing the same chain_key. Flipp already does this via the capture payload; this makes it a source setting.
alter table public.sources add column if not exists fan_out boolean not null default false;
create index if not exists businesses_chain_key_idx on public.businesses (chain_key) where chain_key is not null;
