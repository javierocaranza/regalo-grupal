import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase.js'
import './App.css'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const cursoIdDesdeUrl = searchParams.get('cursoId')
  const rolDesdeUrl = searchParams.get('rol')
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [cursos, setCursos] = useState([])
  const [loadingCursos, setLoadingCursos] = useState(true)
  const [selectedCursoId, setSelectedCursoId] = useState(() => {
    if (cursoIdDesdeUrl) return cursoIdDesdeUrl
    return window.localStorage.getItem('curso_id_activo') || ''
  })
  const [rolIngreso, setRolIngreso] = useState(() => {
    if (rolDesdeUrl) return rolDesdeUrl
    return window.localStorage.getItem('rol_ingreso_activo') || ''
  })
  const [errorIngreso, setErrorIngreso] = useState('')

  const handleCreateEvent = () => {
    navigate('/crear-evento')
  }

  const handleViewEvents = () => {
    navigate('/mis-eventos')
  }

  const handleManageCourse = () => {
    if (selectedCursoId) {
      window.localStorage.setItem('curso_id_activo', selectedCursoId)
      navigate(`/mi-curso?cursoId=${selectedCursoId}`)
      return
    }
    navigate('/mi-curso')
  }

  const handleCreateCourse = () => {
    navigate('/mi-curso?nuevo=true')
  }

  const handleSelectRol = (rol) => {
    if (!selectedCursoId) {
      setErrorIngreso('Primero selecciona un curso para continuar.')
      return
    }

    setErrorIngreso('')
    window.localStorage.setItem('curso_id_activo', selectedCursoId)
    window.localStorage.setItem('rol_ingreso_activo', rol)
    setRolIngreso(rol)
  }

  const handleCambiarIngreso = () => {
    window.localStorage.removeItem('rol_ingreso_activo')
    setRolIngreso('')
  }

  const getCursoNombre = (curso) => curso.nombre || curso.nombre_curso || `Curso ${curso.id}`

  const getCursoAnio = (curso) => curso.anio || curso.ano || curso.year || curso['año'] || null

  const getCursoLabel = (curso) => {
    const nombreCurso = getCursoNombre(curso)
    const anio = getCursoAnio(curso)
    return anio ? `${nombreCurso} - ${anio}` : nombreCurso
  }

  const cursosOrdenados = [...cursos].sort((a, b) => {
    const anioA = Number(getCursoAnio(a) || 0)
    const anioB = Number(getCursoAnio(b) || 0)

    if (anioA !== anioB) return anioB - anioA

    return getCursoNombre(a).localeCompare(getCursoNombre(b), 'es', { sensitivity: 'base' })
  })

  const hayCursos = cursosOrdenados.length > 0

  const cursoSeleccionado = cursos.find((curso) => String(curso.id) === selectedCursoId)

  useEffect(() => {
    if (cursoIdDesdeUrl) {
      setSelectedCursoId(cursoIdDesdeUrl)
      window.localStorage.setItem('curso_id_activo', cursoIdDesdeUrl)
    }

    if (rolDesdeUrl) {
      setRolIngreso(rolDesdeUrl)
      window.localStorage.setItem('rol_ingreso_activo', rolDesdeUrl)
    }
  }, [cursoIdDesdeUrl, rolDesdeUrl])

  useEffect(() => {
    const cargarCursos = async () => {
      setLoadingCursos(true)

      const { data, error } = await supabase
        .from('cursos')
        .select('')
        .order('anio', { ascending: true })

      if (error) {
        console.error('Error cargando cursos:', error)
        setCursos([])
      } else {
        setCursos(data || [])
      }

      setLoadingCursos(false)
    }

    cargarCursos()

    const cargarProximosEventos = async () => {
      setLoadingUpcoming(true)

      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('id, fecha_evento')
        .eq('estado', 'abierto')
        .gte('fecha_evento', new Date().toISOString().split('T')[0])
        .order('fecha_evento', { ascending: true })
        .limit(3)

      if (eventosError) {
        console.error('Error cargando próximos eventos:', eventosError)
        setUpcomingEvents([])
        setLoadingUpcoming(false)
        return
      }

      const eventos = eventosData || []
      const mapped = await Promise.all(
        eventos.map(async (evento) => {
          const { data: cumpleanerosData, error: cumpleanerosError } = await supabase
            .from('cumpleaneros')
            .select('alumno_id, alumnos(nombre)')
            .eq('evento_id', evento.id)

          if (cumpleanerosError) {
            console.error('Error cargando cumpleañeros del evento:', cumpleanerosError)
          }

          const nombres = (cumpleanerosData || [])
            .map((row) => row.alumnos?.nombre)
            .filter(Boolean)

          return {
            id: evento.id,
            name: nombres.length > 0 ? nombres.join(', ') : 'Sin cumpleañeros',
            date: evento.fecha_evento
              ? new Date(`${evento.fecha_evento}T00:00:00`).toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
              : 'Sin fecha'
          }
        })
      )

      setUpcomingEvents(mapped)
      setLoadingUpcoming(false)
    }

    cargarProximosEventos()
  }, [])

  const esCoordinador = rolIngreso === 'coordinador'
  const esApoderado = rolIngreso === 'apoderado'

  return (
    <div className="container">
      <div className="hero">
        <h1 className="app-title">Regalo Grupal 🎁</h1>
        <p className="app-subtitle">La forma más fácil de organizar regalos de cumpleaños</p>

        {!rolIngreso && (
          <div className="ingreso-card">
            <h3 className="ingreso-title">Selecciona tu curso</h3>
            {loadingCursos ? (
              <p>Cargando cursos...</p>
            ) : !hayCursos ? (
              <div className="ingreso-empty">
                <p>No hay cursos registrados aún</p>
                <button className="btn btn-primary" onClick={handleCreateCourse}>
                  Crear mi curso
                </button>
              </div>
            ) : (
              <>
                <select
                  className="ingreso-select"
                  value={selectedCursoId}
                  onChange={(e) => {
                    setSelectedCursoId(e.target.value)
                    setErrorIngreso('')
                  }}
                >
                  <option value="">Selecciona un curso</option>
                  {cursosOrdenados.map((curso) => (
                    <option key={curso.id} value={String(curso.id)}>
                      {getCursoLabel(curso)}
                    </option>
                  ))}
                </select>
              </>
            )}

            <h3 className="ingreso-title" style={{ marginTop: '1.2rem' }}>¿Cómo ingresas?</h3>
            <div className="buttons-container ingreso-roles">
              <button className="btn btn-primary" onClick={() => handleSelectRol('apoderado')}>
                Soy apoderado
              </button>
              <button className="btn btn-secondary" onClick={() => handleSelectRol('coordinador')}>
                Soy coordinador
              </button>
            </div>

            {errorIngreso && <p className="ingreso-error">{errorIngreso}</p>}

            {!loadingCursos && hayCursos && (
              <button className="btn btn-secondary btn-crear-curso-bottom" onClick={handleCreateCourse}>
                Crear curso
              </button>
            )}
          </div>
        )}

        {rolIngreso && (
          <>
            <div className="ingreso-resumen">
              <p>
                Ingresaste como <strong>{esCoordinador ? 'Coordinador' : 'Apoderado'}</strong>
                {cursoSeleccionado && (
                  <>
                    {' '}
                    en <strong>{getCursoLabel(cursoSeleccionado)}</strong>
                  </>
                )}
              </p>
              <button className="btn btn-secondary btn-cambiar" onClick={handleCambiarIngreso}>
                Cambiar ingreso
              </button>
            </div>

            <div className="buttons-container">
              {esCoordinador && (
                <button className="btn btn-primary" onClick={handleCreateEvent}>
                  Crear evento
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleViewEvents}>
                Ver mis eventos
              </button>
              {esCoordinador && (
                <button className="btn btn-secondary" onClick={handleManageCourse}>
                  Administrar mi curso
                </button>
              )}
              {esApoderado && (
                <p className="app-subtitle" style={{ margin: 0, fontSize: '1rem' }}>
                  Puedes revisar eventos y participar subiendo tu comprobante.
                </p>
              )}
            </div>
          </>
        )}

        {loadingUpcoming && <p>Cargando próximos eventos...</p>}

        {!loadingUpcoming && upcomingEvents.length > 0 && (
          <div className="upcoming-events">
            <h3 className="upcoming-title">Próximos eventos</h3>
            <div className="events-list">
              {upcomingEvents.map(event => (
                <div key={event.id} className="event-item">
                  <div className="event-name">{event.name}</div>
                  <div className="event-details">{event.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App