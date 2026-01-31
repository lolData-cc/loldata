import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import MainContext from './MainContext'

console.log("[v0] main.tsx - App mounting")

createRoot(document.getElementById('root')!).render(
    <MainContext>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MainContext>
)
