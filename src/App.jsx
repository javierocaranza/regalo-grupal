import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase.js'
import PageTopBar from './pages/PageTopBar.jsx'
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
  const [alumnosCurso, setAlumnosCurso] = useState([])
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)
  const [selectedCursoId, setSelectedCursoId] = useState(() => {
    if (cursoIdDesdeUrl) return cursoIdDesdeUrl
    return window.localStorage.getItem('curso_id_activo') || ''
  })
  const [alumnoApoderadoId, setAlumnoApoderadoId] = useState(() => {
    return window.localStorage.getItem('alumno_apoderado_id_activo') || ''
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
    if (rolIngreso === 'apoderado' && !alumnoApoderadoId) {
      setErrorIngreso('Selecciona primero tu alumno para continuar.')
      return
    }
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

  const handleSelectAlumnoApoderado = (alumnoId) => {
    setAlumnoApoderadoId(alumnoId)
    setErrorIngreso('')

    if (!alumnoId) {
      window.localStorage.removeItem('alumno_apoderado_id_activo')
      window.localStorage.removeItem('alumno_apoderado_nombre_activo')
      return
    }

    const alumno = alumnosCurso.find((item) => String(item.id) === String(alumnoId))
    window.localStorage.setItem('alumno_apoderado_id_activo', String(alumnoId))
    window.localStorage.setItem('alumno_apoderado_nombre_activo', alumno?.nombre || '')
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
    const handleHomeReset = () => {
      setRolIngreso('')
      setSelectedCursoId('')
      setAlumnoApoderadoId('')
      setErrorIngreso('')
    }

    window.addEventListener('regalo:home', handleHomeReset)
    return () => window.removeEventListener('regalo:home', handleHomeReset)
  }, [])

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

      const cursoIdNumero = selectedCursoId ? parseInt(selectedCursoId, 10) : null
      if (!cursoIdNumero) {
        setUpcomingEvents([])
        setLoadingUpcoming(false)
        return
      }

      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('id, fecha_evento, curso_id')
        .gt('fecha_evento', new Date().toISOString().split('T')[0])
        .order('fecha_evento', { ascending: true })

      if (eventosError) {
        console.error('Error cargando próximos eventos:', eventosError)
        setUpcomingEvents([])
        setLoadingUpcoming(false)
        return
      }

      const eventos = eventosData || []

      const { data: alumnosCursoData, error: alumnosCursoError } = await supabase
        .from('alumnos')
        .select('id')
        .eq('curso_id', cursoIdNumero)

      if (alumnosCursoError) {
        console.error('Error cargando alumnos del curso para filtrar eventos:', alumnosCursoError)
        setUpcomingEvents([])
        setLoadingUpcoming(false)
        return
      }

      const alumnoIdsCurso = new Set((alumnosCursoData || []).map((row) => Number(row.id)))

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

          const cumpleanerosIdsEvento = new Set((cumpleanerosData || []).map((row) => Number(row.alumno_id)))
          const pertenecePorCursoId = Number(evento.curso_id) === cursoIdNumero
          const pertenecePorCumpleaneros = [...cumpleanerosIdsEvento].some((alumnoId) => alumnoIdsCurso.has(alumnoId))

          if (!pertenecePorCursoId && !pertenecePorCumpleaneros) {
            return null
          }

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

      setUpcomingEvents(mapped.filter(Boolean))
      setLoadingUpcoming(false)
    }

    cargarProximosEventos()
  }, [selectedCursoId])

  useEffect(() => {
    const cargarAlumnosCurso = async () => {
      if (rolIngreso !== 'apoderado' || !selectedCursoId) {
        setAlumnosCurso([])
        return
      }

      setLoadingAlumnos(true)

      let data = []
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('id, nombre, curso_id')
        .eq('curso_id', selectedCursoId)
        .order('nombre', { ascending: true })

      if (alumnosError) {
        console.warn('No se pudo filtrar alumnos por curso_id, usando fallback:', alumnosError)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('alumnos')
          .select('id, nombre, curso_id')
          .order('nombre', { ascending: true })

        if (fallbackError) {
          console.error('Error cargando alumnos del curso:', fallbackError)
          setAlumnosCurso([])
          setLoadingAlumnos(false)
          return
        }

        data = (fallbackData || []).filter((row) => Number(row.curso_id) === Number(selectedCursoId))
      } else {
        data = alumnosData || []
      }

      setAlumnosCurso(data)

      if (alumnoApoderadoId && !data.some((alumno) => String(alumno.id) === String(alumnoApoderadoId))) {
        setAlumnoApoderadoId('')
        window.localStorage.removeItem('alumno_apoderado_id_activo')
        window.localStorage.removeItem('alumno_apoderado_nombre_activo')
      }

      setLoadingAlumnos(false)
    }

    cargarAlumnosCurso()
  }, [rolIngreso, selectedCursoId])

  const esCoordinador = rolIngreso === 'coordinador'
  const esApoderado = rolIngreso === 'apoderado'
  const alumnoApoderadoSeleccionado = alumnosCurso.find((alumno) => String(alumno.id) === String(alumnoApoderadoId))

  return (
    <div className="container">
      <PageTopBar />
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
            </div>

            {esApoderado && (
              <div className="upcoming-events" style={{ marginTop: '1rem' }}>
                <h3 className="upcoming-title">Tu alumno</h3>
                {loadingAlumnos ? (
                  <p style={{ margin: 0 }}>Cargando alumnos del curso...</p>
                ) : (
                  <>
                    <select
                      className="ingreso-select"
                      value={alumnoApoderadoId}
                      onChange={(e) => handleSelectAlumnoApoderado(e.target.value)}
                    >
                      <option value="">Selecciona tu alumno</option>
                      {alumnosCurso.map((alumno) => (
                        <option key={alumno.id} value={String(alumno.id)}>
                          {alumno.nombre}
                        </option>
                      ))}
                    </select>
                    {alumnoApoderadoSeleccionado && (
                      <p className="app-subtitle" style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '1rem' }}>
                        Alumno activo: <strong>{alumnoApoderadoSeleccionado.nombre}</strong>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="buttons-container">
              {esCoordinador && (
                <button className="btn btn-primary" onClick={handleCreateEvent}>
                  Crear evento
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={handleViewEvents}
                disabled={esApoderado && !alumnoApoderadoId}
              >
                Ver mis eventos
              </button>
              {esCoordinador && (
                <button className="btn btn-secondary" onClick={handleManageCourse}>
                  Administrar mi curso
                </button>
              )}
              {esCoordinador && (
                <button className="btn btn-secondary" onClick={() => navigate('/acusete')}>
                  Acusete
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