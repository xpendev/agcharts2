import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { brandCompositionApiPlugin } from './api/viteBrandCompositionApiPlugin.ts'
import { brandDivergingApiPlugin } from './api/viteBrandDivergingApiPlugin.ts'
import { buyerDropoutApiPlugin } from './api/viteBuyerDropoutApiPlugin.ts'
import { competitiveImpactApiPlugin } from './api/viteCompetitiveImpactApiPlugin.ts'
import { purchaseInOutApiPlugin } from './api/vitePurchaseInOutApiPlugin.ts'
import { transitionNetworkApiPlugin } from './api/viteTransitionNetworkApiPlugin.ts'
import { volumeMatrixApiPlugin } from './api/viteVolumeMatrixApiPlugin.ts'
import { waterfallApiPlugin } from './api/viteWaterfallApiPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    transitionNetworkApiPlugin(),
    volumeMatrixApiPlugin(),
    purchaseInOutApiPlugin(),
    waterfallApiPlugin(),
    brandDivergingApiPlugin(),
    buyerDropoutApiPlugin(),
    brandCompositionApiPlugin(),
    competitiveImpactApiPlugin(),
  ],
  server: {
    proxy: {
      '/api/xlsx': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
})
