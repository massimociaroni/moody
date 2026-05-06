import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ShareView from './pages/ShareView'
import './i18n'
import './index.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err =>
      console.error('SW registration failed:', err)
    )
  })
}

const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)/)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {shareMatch ? (
      <ShareView token={shareMatch[1]} />
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </React.StrictMode>
)