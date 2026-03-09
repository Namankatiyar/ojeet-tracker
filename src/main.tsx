import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import App from './core/App.tsx'
import { Analytics } from '@vercel/analytics/react'
import { injectSpeedInsights } from '@vercel/speed-insights';
import { initPwaBridge } from './shared/utils/pwaBridge';

injectSpeedInsights();
initPwaBridge();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <App />
            <Analytics />
        </BrowserRouter>
    </StrictMode>,
)
