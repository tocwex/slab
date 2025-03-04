import packageJson from './package.json';
import { loadEnv, defineConfig } from 'vite';
import react from '@vitejs/plugin-react'
import { TanStackRouterVite as routerPlugin } from '@tanstack/router-plugin/vite'
import { fileURLToPath } from 'url';
import { urbitPlugin } from '@urbit/vite-plugin-urbit';

// https://vitejs.dev/config/
export default ({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd()));
  process.env.VITE_PACKAGE_VERSION = (mode === 'development')
    ? (d => `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`)(new Date(Date.now()))
    : packageJson.version;
  const SHIP_URL = process.env.SHIP_URL || process.env.VITE_SHIP_URL || 'http://localhost:8080';
  const ENV = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    base: "/apps/slab/",
    plugins: [
      urbitPlugin({ base: 'slab', target: SHIP_URL }),
      routerPlugin({ target: 'react', routesDirectory: './src/app', autoCodeSplitting: true }),
      react({ include: /\.((t|j)sx?)|(s?css)$|(html?)/ }),
    ],
    // FIXME: The `@safe-global` packages use `process.env.*` (NodeJS accessors),
    // which isn't supported in embedded Vite by default.
    // See: https://dev.to/whchi/how-to-use-processenv-in-vite-ho9
    define: {
      'process.env': ENV,
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          // NOTE: Unlike Vite 4-, Vite 5 hashes with capital letters by
          // default, which Urbit will not accept
          hashCharacters: "base36",
          assetFileNames: ({ names, originalFileNames, source }: {
            names: string[];             // raw file names
            originalFileNames: string[]; // paths (relative to src)
            source: string | Uint8Array; // source bytes (for hashing)
          }) => {
            return !names?.[0]
              ? `assets/[name]-[hash][extname]`
              : `assets/${(names?.[0].split('.')[0]).toLowerCase()}-[hash][extname]`;
          },
          chunkFileNames: ({ name, moduleIds }: {
            name: string;        // module path
            moduleIds: string[]; // contents (absolute paths)
          }) => {
            return `${name.toLowerCase()}-[hash].js`;
          },
          entryFileNames: ({ name, moduleIds }: {
            name: string;        // module path
            moduleIds: string[]; // contents (absolute paths)
          }) => {
            return `${name.toLowerCase()}.js`;
          },
          manualChunks: {
            'lodash': ['lodash.merge'],
            'urbit': ['@urbit/api', '@urbit/http-api', '@urbit/sigil-js', 'urbit-ob'],
            '@safe-global/api-kit': ['@safe-global/api-kit'],
            '@safe-global/protocol-kit': ['@safe-global/protocol-kit'],
            '@tanstack/react-query': ['@tanstack/react-query'],
            '@tokenbound/sdk': ['@tokenbound/sdk'],
            '@wagmi/core': ['@wagmi/core'],
            '@web3-onboard/injected-wallets': ['@web3-onboard/injected-wallets'],
            '@web3-onboard/react': ['@web3-onboard/react'],
            '@web3-onboard/wagmi': ['@web3-onboard/wagmi'],
          },
        },
      },
    },
  });
};
