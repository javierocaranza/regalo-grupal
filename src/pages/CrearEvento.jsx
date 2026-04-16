import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getCursoToken } from '../supabase.js'
import PageTopBar from './PageTopBar.jsx'
import './pages.css'

function CrearEvento() {
  const navigate = useNavigate()
  const rolIngreso = window.localStorage.getItem('rol_ingreso_activo') || ''
  const cursoIdActivo = window.localStorage.getItem('curso_id_activo') || ''
  const [alumnos, setAlumnos] = useState([])
  const [selectedCumpleaneros, setSelectedCumpleaneros] = useState([])
  const [invitados, setInvitados] = useState('todos')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitGuardRef = useRef(false)
  const [otroBanco, setOtroBanco] = useState('')
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
    const verificarToken = async () => {
      const tokenLocal = getCursoToken()
      if (!tokenLocal || !cursoIdActivo) {
        navigate('/')
        return
      }
      const { data, error } = await supabase
        .from('cursos')
        .select('token')
        .eq('id', cursoIdActivo)
        .single()
      if (error || !data || data.token !== tokenLocal) {
        navigate('/')
      }
    }
    verificarToken()
  }, [])

  useEffect(() => {
    const cargarAlumnos = async () => {
      const cursoIdNumero = cursoIdActivo ? parseInt(cursoIdActivo, 10) : null
      if (!cursoIdNumero) {
        setAlumnos([])
        return
      }

      const { data, error } = await supabase
        .from('alumnos')
        .select('id, nombre, fecha_cumpleanos, curso_id')
        .eq('curso_id', cursoIdNumero)

      if (error) {
        console.warn('No se pudo filtrar alumnos por curso_id, usando fallback:', error)

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('alumnos')
          .select('id, nombre, fecha_cumpleanos, curso_id')

        if (fallbackError) {
          console.error('Error cargando alumnos:', fallbackError)
          setAlumnos([])
          return
        }

        setAlumnos((fallbackData || []).filter((alumno) => Number(alumno.curso_id) === cursoIdNumero))
        return
      }

      setAlumnos(data || [])
    }
    cargarAlumnos()
  }, [cursoIdActivo])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'coordinadorBanco' && value !== 'Otro') {
      setOtroBanco('')
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCumpleaneroChange = (alumnoId) => {
    const alumnoIdNormalizado = Number(alumnoId)
    console.log(`Toggle alumnoId: ${alumnoIdNormalizado} (${typeof alumnoIdNormalizado})`)

    setSelectedCumpleaneros((prev) => {
      const prevNormalizado = prev
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))

      if (prevNormalizado.includes(alumnoIdNormalizado)) {
        return prevNormalizado.filter((id) => id !== alumnoIdNormalizado)
      }

      return [...prevNormalizado, alumnoIdNormalizado]
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isSubmitting || submitGuardRef.current) return

    submitGuardRef.current = true
    setIsSubmitting(true)

    try {
      if (selectedCumpleaneros.length === 0) {
        alert('Debes seleccionar al menos un cumpleañero.')
        return
      }

      const bancoSeleccionado = formData.coordinadorBanco === 'Otro'
        ? otroBanco.trim()
        : formData.coordinadorBanco

      const eventoData = {
        fecha_evento: formData.fecha,
        cuota_minima: parseFloat(formData.cuotaMinima),
        cuota_maxima: parseFloat(formData.cuotaMaxima),
        descripcion_regalo: formData.descripcion,
        curso_id: cursoIdActivo ? parseInt(cursoIdActivo, 10) : null,
        nombre_coordinador: formData.coordinadorNombre,
        rut_coordinador: formData.coordinadorRut,
        banco: bancoSeleccionado,
        tipo_cuenta: formData.coordinadorTipoCuenta,
        numero_cuenta: formData.coordinadorNumeroCuenta,
        email_pago: formData.coordinadorEmail,
        invitados,
      }

      const { data, error: eventoError } = await supabase
        .from('eventos')
        .insert(eventoData)
        .select('id')
        .single()

      if (eventoError) {
        console.error('Error creando evento:', eventoError)
        alert('Error al crear el cumpleaños.')
        return
      }

      const eventoId = data.id
      console.log('evento_id usado al insertar cumpleañeros:', eventoId)

      const alumnoIdsUnicos = [...new Set(
        selectedCumpleaneros
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))
      )]

      const cumpleanerosData = alumnoIdsUnicos.map(alumnoId => ({
        evento_id: eventoId,
        alumno_id: alumnoId,
      }))

      console.log('array exacto a insertar en cumpleaneros:', cumpleanerosData)
      const { error: cumpleanerosError } = await supabase
        .from('cumpleaneros')
        .insert(cumpleanerosData)

      if (cumpleanerosError) {
        console.error('Error agregando cumpleañeros:', cumpleanerosError)
        alert('Cumpleaños creado, pero error al agregar cumpleañeros.')
        return
      }

      alert('¡Cumpleaños creado exitosamente!')
      const adminParam = rolIngreso === 'coordinador' ? '?admin=true' : ''
      navigate(`/mis-eventos${adminParam}`)
    } finally {
      submitGuardRef.current = false
      setIsSubmitting(false)
    }
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
      <PageTopBar />
      <h1 className="page-title">Crear Cumpleaños</h1>
      
      <form className="event-form" onSubmit={handleSubmit}>
        {/* Sección de Detalles del Evento */}
        <div className="form-section">
          <h2 className="section-title">Detalles del Cumpleaños</h2>
          
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
            <label htmlFor="fecha">Fecha del Cumpleaños *</label>
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

          <div className="form-group">
            <label htmlFor="invitados">¿Quiénes están invitados?</label>
            <select
              id="invitados"
              value={invitados}
              onChange={(e) => setInvitados(e.target.value)}
            >
              <option value="todos">Todos (niños y niñas)</option>
              <option value="niñas">Solo niñas</option>
              <option value="niños">Solo niños</option>
            </select>
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

            {formData.coordinadorBanco === 'Otro' && (
              <input
                type="text"
                value={otroBanco}
                onChange={(e) => setOtroBanco(e.target.value)}
                placeholder="Escribe el nombre del banco"
                required
                style={{ marginTop: '8px' }}
              />
            )}
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

        <button type="submit" className="form-submit" disabled={isSubmitting}>Crear Cumpleaños</button>
      </form>
    </div>
  )
}

export default CrearEvento
