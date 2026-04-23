/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_ENABLE_GOOGLE_AUTH?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
