import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router/route'
import { ThemeProvider } from './components/theme-provider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="torrentstream-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
)
