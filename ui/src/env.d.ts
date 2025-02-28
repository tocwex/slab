interface ImportMetaEnv extends Readonly<Record<string, string | boolean | undefined>> {
  readonly VITE_PACKAGE_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
