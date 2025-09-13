import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Pricing from './Pricing.jsx' // add this file if you haven't already (or keep pricing inside App)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pricing" element={<Pricing />} />
        {/* add more routes as you build them */}
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
