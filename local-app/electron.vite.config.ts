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
          terminal: resolve(__dirname, 'terminal.html')
        }
      }
    },
    plugins: [react()]
  }
})
