import packageJson from './package.json';
import { loadEnv, defineConfig } from 'vite';
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url';
import { urbitPlugin } from '@urbit/vite-plugin-urbit';

// https://vitejs.dev/config/
export default ({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd()));
  process.env.VITE_PACKAGE_VERSION = (mode === 'development')
    ? (d => `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`)(new Date(Date.now()))
    : packageJson.version;
  const SHIP_URL = process.env.SHIP_URL || process.env.VITE_SHIP_URL || 'http://localhost:8080';

  return defineConfig({
    plugins: [
      urbitPlugin({ base: 'slab', target: SHIP_URL }),
      react({ include: /\.((t|j)sx?)|(s?css)$|(html?)/ }),
    ],
    server: {
      host: 'localhost',
      port: 3000,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  });
};
