/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_RELEASE_CHANNEL?: string;
}

declare const __APP_VERSION__: string;
declare const __APP_BUILD_ID__: string;
