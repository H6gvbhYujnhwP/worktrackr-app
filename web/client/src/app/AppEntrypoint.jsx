// web/client/src/app/AppEntrypoint.jsx
import React from 'react'
import { BrowserRouter } from 'react-router-dom'

// Thanks to the vite alias, "@/App" resolves to /web/client/src/app/src/App
import App from '@/App'

// If Manus had global styles, import here (adjust as needed):
// import '@/index.css'
// import '@/App.css'

export default function AppEntrypoint() {
  return (
    <BrowserRouter basename="/app">
      <App />
    </BrowserRouter>
  )
}
