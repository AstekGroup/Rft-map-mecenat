import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ConfigProvider } from './components/Layout/ConfigProvider'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider>
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>,
)
