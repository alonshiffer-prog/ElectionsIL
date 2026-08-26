import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] || 'ElectionsIL'}/` : '/',
}));
