import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/main',
      lib: {
        entry: resolve(__dirname, 'electron/main.ts')
      },
      rollupOptions: {
        external: ['electron', 'node-pty']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'electron/preload.ts'),
          'preload-terminal': resolve(__dirname, 'electron/preload-terminal.ts')
        }
      }
    }
  },
  renderer: {
    root: '.',
    server: {
      port: 3010
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          terminal: resolve(__dirname, 'terminal.html'),
          'project-detail': resolve(__dirname, 'project-detail.html'),
          'journey-detail': resolve(__dirname, 'journey-detail.html'),
          'journey-overlay': resolve(__dirname, 'journey-overlay.html'),
          'markdown-viewer': resolve(__dirname, 'markdown-viewer.html')
        }
      }
    },
    plugins: [react()]
  }
})
