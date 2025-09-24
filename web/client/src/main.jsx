// web/client/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import RootApp from './App.jsx' // App.jsx exports the router (RootApp)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RootApp />
    </BrowserRouter>
  </StrictMode>
)
