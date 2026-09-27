import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
// @ts-expect-error Server-side JavaScript module intentionally stays outside the browser bundle.
import { handleExplanationRequest } from './server/explanations.mjs'

const explanationPlugin = {
  name: 'parcel-explanations',
  configureServer(server: { middlewares: { use: (path: string, handler: typeof handleExplanationRequest) => void } }) {
    server.middlewares.use('/api/explanations', handleExplanationRequest)
  },
  configurePreviewServer(server: { middlewares: { use: (path: string, handler: typeof handleExplanationRequest) => void } }) {
    server.middlewares.use('/api/explanations', handleExplanationRequest)
  },
}

export default defineConfig({
  plugins: [react(), explanationPlugin],
  test: {
    environment: 'node',
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  worker: {
    format: 'es',
  },
  server: {
    proxy: {
      '/api/parcels': {
        target: 'https://gisdata.alleghenycounty.us',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/parcels/,
            '/arcgis/rest/services/OPENDATA/Parcels/MapServer/0',
          ),
      },
      '/api/ckan': {
        target: 'https://data.wprdc.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ckan/, '/api/3/action'),
      },
      '/api/zoning': {
        target: 'https://services1.arcgis.com',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/zoning/,
            '/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebZoning/FeatureServer/0',
          ),
      },
      '/api/pgh': {
        target: 'https://services1.arcgis.com',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/pgh\/([^/?]+)/,
            '/YZCmUqbcsUpOKfj7/arcgis/rest/services/$1/FeatureServer/0',
          ),
      },
      '/api/pasda': {
        target: 'https://mapservices.pasda.psu.edu',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/pasda/,
            '/server/rest/services/pasda/PittsburghCity/MapServer',
          ),
      },
      '/api/fema': {
        target: 'https://hazards.fema.gov',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/fema/,
            '/arcgis/rest/services/public/NFHL/MapServer/28',
          ),
      },
    },
  },
})
