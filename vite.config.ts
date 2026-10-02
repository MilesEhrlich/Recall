import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build works at https://<user>.github.io/<repo>/ whatever the repo is called.
  base: './',
});
