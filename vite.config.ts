import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
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
    },
  },
})
