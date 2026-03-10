import { useNavigate } from 'react-router-dom'
import './pages.css'

function MiCurso() {
  const navigate = useNavigate()

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate('/')}>← Volver</button>
      <h1 className="page-title">Mi Curso</h1>
      <p>Aquí puedes administrar tu curso</p>
    </div>
  )
}

export default MiCurso
