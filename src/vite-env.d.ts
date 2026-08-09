/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLAYER1_LABEL: string
  readonly VITE_PLAYER1_USERNAME: string
  readonly VITE_PLAYER2_LABEL: string
  readonly VITE_PLAYER2_USERNAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
