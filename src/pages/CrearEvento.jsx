import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import './pages.css'

function CrearEvento() {
  const navigate = useNavigate()
  const [alumnos, setAlumnos] = useState([])
  const [selectedCumpleaneros, setSelectedCumpleaneros] = useState([])
  const [formData, setFormData] = useState({
    fecha: '',
    cuotaMinima: '10000',
    cuotaMaxima: '15000',
    descripcion: '',
    coordinadorNombre: '',
    coordinadorRut: '',
    coordinadorBanco: '',
    coordinadorTipoCuenta: '',
    coordinadorNumeroCuenta: '',
    coordinadorEmail: '',
  })

  useEffect(() => {
    const cargarAlumnos = async () => {
      const { data, error } = await supabase.from('alumnos').select('id, nombre, fecha_cumpleanos')
      if (error) {
        console.error('Error cargando alumnos:', error)
        return
      }
      setAlumnos(data || [])
      console.log('Alumnos cargados:', data?.map(a => ({ id: a.id, type: typeof a.id })))
    }
    cargarAlumnos()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCumpleaneroChange = (alumnoId) => {
    console.log(`Toggle alumnoId: ${alumnoId} (${typeof alumnoId})`)
    setSelectedCumpleaneros(prev => {
      if (prev.includes(alumnoId)) {
        return prev.filter(id => id !== alumnoId)
      } else {
        return [...prev, alumnoId]
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (selectedCumpleaneros.length === 0) {
      alert('Debes seleccionar al menos un cumpleañero.')
      return
    }

    const eventoData = {
      fecha_evento: formData.fecha,
      cuota_minima: parseFloat(formData.cuotaMinima),
      cuota_maxima: parseFloat(formData.cuotaMaxima),
      descripcion_regalo: formData.descripcion,
      nombre_coordinador: formData.coordinadorNombre,
      rut_coordinador: formData.coordinadorRut,
      banco: formData.coordinadorBanco,
      tipo_cuenta: formData.coordinadorTipoCuenta,
      numero_cuenta: formData.coordinadorNumeroCuenta,
      email_pago: formData.coordinadorEmail,
    }

    const { data, error: eventoError } = await supabase
      .from('eventos')
      .insert(eventoData)
      .select('id')
      .single()

    if (eventoError) {
      console.error('Error creando evento:', eventoError)
      alert('Error al crear el evento.')
      return
    }

    const eventoId = data.id

    const cumpleanerosData = selectedCumpleaneros.map(alumnoId => ({
      evento_id: eventoId,
      alumno_id: alumnoId,
    }))

    const { error: cumpleanerosError } = await supabase
      .from('cumpleaneros')
      .insert(cumpleanerosData)

    if (cumpleanerosError) {
      console.error('Error agregando cumpleañeros:', cumpleanerosError)
      alert('Evento creado, pero error al agregar cumpleañeros.')
      return
    }

    alert('¡Evento creado exitosamente!')
    navigate('/mis-eventos')
  }

  // Calcular presupuesto estimado basado en cumpleañeros seleccionados
  const cuotaMinima = parseFloat(formData.cuotaMinima) || 0
  const cuotaMaxima = parseFloat(formData.cuotaMaxima) || 0
  const numCumpleaneros = selectedCumpleaneros.length
  
  const presupuestoMinimo = cuotaMinima * numCumpleaneros
  const presupuestoMaximo = cuotaMaxima * numCumpleaneros
  const presupuestoPromedio = ((cuotaMinima + cuotaMaxima) / 2) * numCumpleaneros

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate('/')}>← Volver</button>
      <h1 className="page-title">Crear Evento</h1>
      
      <form className="event-form" onSubmit={handleSubmit}>
        {/* Sección de Detalles del Evento */}
        <div className="form-section">
          <h2 className="section-title">Detalles del Evento</h2>
          
          <div className="form-group">
            <label>Seleccionar Cumpleañeros *</label>
            <div className="cumpleaneros-list">
              {alumnos.map(alumno => {
                const isSelected = selectedCumpleaneros.includes(alumno.id)
                console.log(`Alumno ${alumno.id} (${typeof alumno.id}) - Seleccionado: ${isSelected}`)
                return (
                  <div
                    key={alumno.id}
                    className={`cumpleanero-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleCumpleaneroChange(alumno.id)}
                  >
                    <div className="cumpleanero-name">{alumno.nombre}</div>
                    <div className="cumpleanero-date">{new Date(alumno.fecha_cumpleanos).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</div>
                  </div>
                )
              })}
            </div>
            {alumnos.length === 0 && <p>Cargando alumnos...</p>}
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
                placeholder="Ej: 10000"
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
                placeholder="Ej: 15000"
                min="0"
                required
              />
            </div>
          </div>

          {/* Presupuesto Estimado */}
          {numCumpleaneros > 0 && cuotaMinima > 0 && cuotaMaxima > 0 && (
            <div className="budget-summary">
              <h3>Presupuesto Estimado (por cumpleañero)</h3>
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
            <label htmlFor="coordinadorTipoCuenta">Tipo de Cuenta *</label>
            <select
              id="coordinadorTipoCuenta"
              name="coordinadorTipoCuenta"
              value={formData.coordinadorTipoCuenta}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona tipo de cuenta</option>
              <option value="Cuenta Corriente">Cuenta Corriente</option>
              <option value="Cuenta Vista">Cuenta Vista</option>
              <option value="Cuenta de Ahorro">Cuenta de Ahorro</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="coordinadorNumeroCuenta">Número de Cuenta *</label>
            <input
              type="text"
              id="coordinadorNumeroCuenta"
              name="coordinadorNumeroCuenta"
              value={formData.coordinadorNumeroCuenta}
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
