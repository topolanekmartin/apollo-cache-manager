import { defineConfig, build, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import {
  copyFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'fs'

// After build: copy manifest + icons, fix HTML file locations
function chromeExtensionPlugin(): PluginOption {
  return {
    name: 'chrome-extension',
    async closeBundle() {
      const dist = resolve(__dirname, 'dist')

      // Copy manifest.json
      copyFileSync(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'))

      // Copy icons
      const iconsDir = resolve(__dirname, 'public/icons')
      const distIcons = resolve(dist, 'icons')
      if (!existsSync(distIcons)) mkdirSync(distIcons, { recursive: true })
      if (existsSync(iconsDir)) {
        for (const file of readdirSync(iconsDir)) {
          copyFileSync(resolve(iconsDir, file), resolve(distIcons, file))
        }
      }

      // Move HTML files from nested src/ dirs to dist root and fix asset paths
      const moves: Array<[string, string, string]> = [
        ['src/devtools/devtools.html', 'devtools.html', '../../'],
        ['src/panel/panel.html', 'panel.html', '../../'],
      ]

      for (const [from, to, prefixToRemove] of moves) {
        const srcPath = resolve(dist, from)
        const destPath = resolve(dist, to)
        if (existsSync(srcPath)) {
          let html = readFileSync(srcPath, 'utf-8')
          // Fix relative paths: the HTML was at src/panel/ level referencing ../../assets/
          // After moving to root, we need just ./assets/
          html = html.replace(new RegExp(prefixToRemove.replace(/\//g, '\\/'), 'g'), './')
          writeFileSync(destPath, html)
        }
      }

      // Clean up the empty src/ directory in dist
      const distSrc = resolve(dist, 'src')
      if (existsSync(distSrc)) {
        rmSync(distSrc, { recursive: true, force: true })
      }

      // Build injected.js separately as IIFE so it works in classic <script> tags
      await build({
        configFile: false,
        resolve: {
          alias: {
            '@shared': resolve(__dirname, 'src/shared'),
          },
        },
        build: {
          outDir: dist,
          emptyOutDir: false,
          sourcemap: false,
          minify: false,
          lib: {
            entry: resolve(__dirname, 'src/injected/bridge.ts'),
            formats: ['iife'],
            name: 'ApolloManagerBridge',
            fileName: () => 'injected.js',
          },
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
            },
          },
        },
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), chromeExtensionPlugin()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@panel': resolve(__dirname, 'src/panel'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'src/panel/panel.html'),
        devtools: resolve(__dirname, 'src/devtools/devtools.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        format: 'es',
        entryFileNames: (chunkInfo) => {
          if (['background', 'content'].includes(chunkInfo.name)) {
            return `${chunkInfo.name}.js`
          }
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
