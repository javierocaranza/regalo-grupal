import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './pages.css'

function CrearEvento() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    cumpleaneros: '',
    fecha: '',
    cuotaMinima: '',
    cuotaMaxima: '',
    participantesEsperados: '',
    descripcion: '',
    coordinadorNombre: '',
    coordinadorRut: '',
    coordinadorBanco: '',
    coordinadorCuenta: '',
    coordinadorEmail: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Formulario enviado:', formData)
    alert('¡Evento creado exitosamente!')
    navigate('/mis-eventos')
  }

  // Calcular presupuesto estimado
  const cuotaMinima = parseFloat(formData.cuotaMinima) || 0
  const cuotaMaxima = parseFloat(formData.cuotaMaxima) || 0
  const participantes = parseInt(formData.participantesEsperados) || 0
  
  const presupuestoMinimo = cuotaMinima * participantes
  const presupuestoMaximo = cuotaMaxima * participantes
  const presupuestoPromedio = ((cuotaMinima + cuotaMaxima) / 2) * participantes

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate('/')}>← Volver</button>
      <h1 className="page-title">Crear Evento</h1>
      
      <form className="event-form" onSubmit={handleSubmit}>
        {/* Sección de Detalles del Evento */}
        <div className="form-section">
          <h2 className="section-title">Detalles del Evento</h2>
          
          <div className="form-group">
            <label htmlFor="cumpleaneros">Nombre del o los Cumpleañeros *</label>
            <input
              type="text"
              id="cumpleaneros"
              name="cumpleaneros"
              value={formData.cumpleaneros}
              onChange={handleChange}
              placeholder="Ej: María, Juan y Pedro"
              required
            />
            <small className="help-text">Puedes incluir varios nombres separados por comas</small>
          </div>

          <div className="form-group">
            <label htmlFor="fecha">Fecha del Evento *</label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cuotaMinima">Cuota Mínima (CLP) *</label>
              <input
                type="number"
                id="cuotaMinima"
                name="cuotaMinima"
                value={formData.cuotaMinima}
                onChange={handleChange}
                placeholder="Ej: 5000"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cuotaMaxima">Cuota Máxima (CLP) *</label>
              <input
                type="number"
                id="cuotaMaxima"
                name="cuotaMaxima"
                value={formData.cuotaMaxima}
                onChange={handleChange}
                placeholder="Ej: 10000"
                min="0"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="participantesEsperados">Número de Participantes Esperados *</label>
            <input
              type="number"
              id="participantesEsperados"
              name="participantesEsperados"
              value={formData.participantesEsperados}
              onChange={handleChange}
              placeholder="Ej: 20"
              min="1"
              required
            />
          </div>

          {/* Presupuesto Estimado */}
          {participantes > 0 && cuotaMinima > 0 && cuotaMaxima > 0 && (
            <div className="budget-summary">
              <h3>Presupuesto Estimado</h3>
              <div className="budget-row">
                <span>Mínimo estimado:</span>
                <span className="budget-value">${presupuestoMinimo.toLocaleString('es-CL')}</span>
              </div>
              <div className="budget-row">
                <span>Máximo estimado:</span>
                <span className="budget-value">${presupuestoMaximo.toLocaleString('es-CL')}</span>
              </div>
              <div className="budget-row budget-average">
                <span>Promedio estimado:</span>
                <span className="budget-value">${Math.round(presupuestoPromedio).toLocaleString('es-CL')}</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="descripcion">Descripción del Regalo</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Describe qué tipo de regalo deseas (ej: Videojuego, Bicicleta, etc.). Este campo es opcional y puedes completarlo después."
              rows="3"
            />
            <small className="help-text">Campo opcional - puedes completarlo después</small>
          </div>
        </div>

        {/* Sección de Datos de Pago */}
        <div className="form-section">
          <h2 className="section-title">Datos de Pago del Coordinador</h2>
          
          <div className="form-group">
            <label htmlFor="coordinadorNombre">Nombre Completo *</label>
            <input
              type="text"
              id="coordinadorNombre"
              name="coordinadorNombre"
              value={formData.coordinadorNombre}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="coordinadorRut">RUT *</label>
            <input
              type="text"
              id="coordinadorRut"
              name="coordinadorRut"
              value={formData.coordinadorRut}
              onChange={handleChange}
              placeholder="Ej: 12.345.678-9"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="coordinadorBanco">Banco *</label>
            <select
              id="coordinadorBanco"
              name="coordinadorBanco"
              value={formData.coordinadorBanco}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona un banco</option>
              <option value="Banco de Chile">Banco de Chile</option>
              <option value="BCI">BCI</option>
              <option value="Santander">Santander</option>
              <option value="Scotiabank">Scotiabank</option>
              <option value="BBVA">BBVA</option>
              <option value="Itaú">Itaú</option>
              <option value="Falabella">Banco Falabella</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="coordinadorCuenta">Número de Cuenta *</label>
            <input
              type="text"
              id="coordinadorCuenta"
              name="coordinadorCuenta"
              value={formData.coordinadorCuenta}
              onChange={handleChange}
              placeholder="Ej: 12345678"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="coordinadorEmail">Email *</label>
            <input
              type="email"
              id="coordinadorEmail"
              name="coordinadorEmail"
              value={formData.coordinadorEmail}
              onChange={handleChange}
              placeholder="Ej: juan@email.com"
              required
            />
          </div>
        </div>

        <button type="submit" className="form-submit">Crear Evento</button>
      </form>
    </div>
  )
}

export default CrearEvento
