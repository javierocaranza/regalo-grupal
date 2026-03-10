import { useNavigate } from 'react-router-dom'
import './pages.css'

function MisEventos() {
  const navigate = useNavigate()

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate('/')}>← Volver</button>
      <h1 className="page-title">Mis Eventos</h1>
      <p>Aquí verás todos tus eventos de cumpleaños</p>
    </div>
  )
}

export default MisEventos
