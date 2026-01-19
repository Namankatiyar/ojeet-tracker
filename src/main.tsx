import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/theme.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components/ui.css'
import './styles/components/misc.css'
import './styles/features/dashboard.css'
import './styles/features/subjects.css'
import './styles/features/planner.css'
import './styles/features/study-clock.css'
import App from './core/App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
)
