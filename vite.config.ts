import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // File watching can be disabled in constrained build environments.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@xyflow') || id.includes('dagre')) {
              return 'vendor-xyflow';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
          },
        },
      },
    },
  };
});
