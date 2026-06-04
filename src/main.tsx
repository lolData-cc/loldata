import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import MainContext from './MainContext'
import { cdnVersionReady } from './config'

// Wait for CDN version detection before rendering so all components
// see the correct patch version from the start.
cdnVersionReady.then(() => {
  createRoot(document.getElementById('root')!).render(
      <MainContext>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MainContext>
  )
})
