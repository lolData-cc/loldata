import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import MainContext from './MainContext'

createRoot(document.getElementById('root')!).render(
    <MainContext>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MainContext>
)
