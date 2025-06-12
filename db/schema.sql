create table generated_data (
  id serial primary key,
  topic text,
  platform text,
  source_id text,
  author text,
  content text,
  timestamp timestamptz,
  metadata jsonb
);
