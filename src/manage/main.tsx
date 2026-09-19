import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { Manage } from './Manage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Manage />
  </StrictMode>,
)
