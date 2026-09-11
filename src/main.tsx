import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { BrandCompositionPage } from './brandCompositionAgCharts/BrandCompositionPage.tsx'
import { CompetitiveImpactPage } from './competitiveImpactAgCharts/CompetitiveImpactPage.tsx'
import { BrandDivergingPage } from './brandDivergingAgCharts/BrandDivergingPage.tsx'
import { BuyerDropoutPage } from './buyerDropoutAgCharts/BuyerDropoutPage.tsx'
import { HomePage } from './HomePage.tsx'
import { PurchaseInOutPage } from './purchaseInOutAgCharts/PurchaseInOutPage.tsx'
import { ScratchPage } from './transitionNetworkScratch/ScratchPage.tsx'
import { CytoscapePage } from './transitionNetworkCytoscape/CytoscapePage.tsx'
import { GoJsPage } from './transitionNetworkGoJs/GoJsPage.tsx'
import { AgChartsPage } from './transitionNetworkAgCharts/AgChartsPage.tsx'
import { VolumeMatrixPage } from './volumeMatrixAgCharts/VolumeMatrixPage.tsx'
import { VolumeMatrixBubbleCategoriesPage } from './volumeMatrixBubbleCategories/VolumeMatrixBubbleCategoriesPage.tsx'
import { WaterfallPage } from './waterfallAgCharts/WaterfallPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/transition-network" element={<ScratchPage />} />
        <Route
          path="/transition-network/cytoscape"
          element={<CytoscapePage />}
        />
        <Route path="/transition-network/gojs" element={<GoJsPage />} />
        <Route
          path="/transition-network/agcharts"
          element={<AgChartsPage />}
        />
        {/* ⑦数値軸版。非採用のためメニュー非表示。削除せずルートのみ残す */}
        <Route path="/volume-matrix" element={<VolumeMatrixPage />} />
        <Route
          path="/volume-matrix-bubble-categories"
          element={<VolumeMatrixBubbleCategoriesPage />}
        />
        <Route path="/purchase-in-out" element={<PurchaseInOutPage />} />
        <Route path="/waterfall" element={<WaterfallPage />} />
        <Route path="/brand-diverging" element={<BrandDivergingPage />} />
        <Route path="/buyer-dropout" element={<BuyerDropoutPage />} />
        <Route
          path="/brand-composition"
          element={<BrandCompositionPage />}
        />
        <Route path="/competitive-impact" element={<CompetitiveImpactPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
