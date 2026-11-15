alter table public.system_settings
  add column if not exists ai_provider text not null default 'local',
  add column if not exists groq_model text not null default 'qwen/qwen3.8-27b';

alter table public.system_settings
  drop constraint if exists system_settings_ai_provider_valid;

alter table public.system_settings
  add constraint system_settings_ai_provider_valid
  check (ai_provider in ('local', 'automatic', 'groq'));

comment on column public.system_settings.ai_provider is
  'Answer-generation provider mode: local Ollama, automatic Ollama-to-Groq fallback, or Groq only.';

comment on column public.system_settings.groq_model is
  'Server-side Groq model identifier. The API key remains in backend environment configuration.';
