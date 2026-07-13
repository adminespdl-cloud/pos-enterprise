import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { MasterDataProvider } from './context/MasterDataContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MasterDataProvider>
      <App />
    </MasterDataProvider>
  </StrictMode>,
)
