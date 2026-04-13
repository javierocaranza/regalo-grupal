import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import CrearEvento from './pages/CrearEvento.jsx'
import MisEventos from './pages/MisEventos.jsx'
import MiCurso from './pages/MiCurso.jsx'
import DetalleEvento from './pages/DetalleEvento.jsx'
import Acusete from './pages/Acusete.jsx'
import HistorialEventos from './pages/HistorialEventos'
import Admin from './pages/Admin.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/crear-evento" element={<CrearEvento />} />
        <Route path="/mis-eventos" element={<MisEventos />} />
        <Route path="/historial-eventos" element={<HistorialEventos />} />
        <Route path="/mi-curso" element={<MiCurso />} />
        <Route path="/evento/:id" element={<DetalleEvento />} />
        <Route path="/acusete" element={<Acusete />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
