import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// strictPort: another dev server may already hold 5173, and silently shifting to a
// neighbouring port makes browser checks ambiguous.
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.CLIENT_PORT) || 5180,
    strictPort: true,
    proxy: { '/api': 'http://localhost:5174' }
  }
});
