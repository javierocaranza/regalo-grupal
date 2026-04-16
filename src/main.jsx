import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import CursoEntrada from './pages/CursoEntrada.jsx'
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
        <Route path="/mi-curso" element={<MiCurso />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/:token" element={<CursoEntrada />} />
        <Route path="/:token/mis-eventos" element={<MisEventos />} />
        <Route path="/:token/crear-evento" element={<CrearEvento />} />
        <Route path="/:token/historial-eventos" element={<HistorialEventos />} />
        <Route path="/:token/mi-curso" element={<MiCurso />} />
        <Route path="/:token/evento/:id" element={<DetalleEvento />} />
        <Route path="/:token/acusete" element={<Acusete />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
