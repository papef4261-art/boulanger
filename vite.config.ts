import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command }) => {
  // Détection robuste du base path pour GitHub Pages, domaine personnalisé et environnements de déploiement :
  // Pour une SPA sans routage d'URL imbriqué, le chemin relatif './' en build est la solution la plus robuste :
  // elle fonctionne automatiquement sur https://user.github.io/mon-repo/ ET https://user.github.io/ sans aucune erreur 404.
  // Si une variable explicite (ex: fournie par configure-pages) et non vide/non-slash est définie, on la prend en compte.
  let base = './';

  if (command === 'serve') {
    base = '/';
  } else if (process.env.VITE_BASE_PATH && process.env.VITE_BASE_PATH !== '/') {
    base = process.env.VITE_BASE_PATH.endsWith('/') ? process.env.VITE_BASE_PATH : `${process.env.VITE_BASE_PATH}/`;
  } else if (process.env.BASE_PATH && process.env.BASE_PATH !== '/') {
    base = process.env.BASE_PATH.endsWith('/') ? process.env.BASE_PATH : `${process.env.BASE_PATH}/`;
  }

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 3500,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
