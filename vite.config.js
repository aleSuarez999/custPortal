//import { defineConfig } from 'vite'
//import react from '@vitejs/plugin-react'
/*
const PRODUCTION = import.meta.env.VITE_PRODUCTION

export default defineConfig({
  plugins: [react()],
   base: (PRODUCTION === true) ? '/help2/merakiApp/' : "/" 

})
*/
/*
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const isProduction = env.VITE_PRODUCTION === 'true';

  return {
    plugins: [react()],
    base: isProduction ? '/help2/merakiInc/' : '/',
  };
});
*/
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const isProduction = env.VITE_PRODUCTION === 'true'

  return {
    plugins: [react()],
    base: isProduction ? '/help2/incidentPortal/' : '/',
  }
})
