import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { editorRedirectPath } from './src/editorRoute'

function editorDirectoryRedirect(): Plugin {
  const install = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((request, response, next) => {
      const destination = editorRedirectPath((request as unknown as { url?: string }).url ?? '')
      if (!destination) return next()
      response.statusCode = 308
      response.setHeader('Location', destination)
      response.end()
    })
  }
  return { name: 'editor-directory-redirect', configureServer: install, configurePreviewServer: install }
}

function siteCatalogueEntry(): Plugin {
  return {
    name: 'site-catalogue-entry',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL((request as unknown as { url?: string }).url ?? '/', 'http://localhost').pathname
        if (pathname !== '/site/catalogue.js') return next()
        response.setHeader('Content-Type', 'text/javascript')
        response.end("import '/src/site/catalogue.ts'")
      })
    },
  }
}

export default defineConfig({
  plugins: [editorDirectoryRedirect(), siteCatalogueEntry(), react()],
  build: {
    rollupOptions: {
      input: { home: 'index.html', editor: 'editor/index.html', catalogue: 'src/site/catalogue.ts' },
      output: {
        entryFileNames: (chunk) => chunk.name === 'catalogue' ? 'site/catalogue.js' : 'assets/[name]-[hash].js',
      },
    },
  },
})
