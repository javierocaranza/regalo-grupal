import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase.js'
import PageTopBar from './pages/PageTopBar.jsx'
import TerminosModal from './pages/TerminosModal.jsx'
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
  const [generoAlumnoActivo, setGeneroAlumnoActivo] = useState(null)
  const [rolIngreso, setRolIngreso] = useState('')
  const [errorIngreso, setErrorIngreso] = useState('')
  const [modalPinCoordAbierto, setModalPinCoordAbierto] = useState(false)
  const [pinCoordActual, setPinCoordActual] = useState('')
  const [pinCoordNuevo, setPinCoordNuevo] = useState('')
  const [confirmarPinCoordNuevo, setConfirmarPinCoordNuevo] = useState('')
  const [cambiandoPinCoord, setCambiandoPinCoord] = useState(false)
  const [errorPinCoord, setErrorPinCoord] = useState('')
  const [mensajePinCoord, setMensajePinCoord] = useState('')
  const [mostrarPanelAdmin, setMostrarPanelAdmin] = useState(false)
  const [pinAdmin, setPinAdmin] = useState('')
  const [validandoPinAdmin, setValidandoPinAdmin] = useState(false)
  const [errorPinAdmin, setErrorPinAdmin] = useState('')

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

  const handleReabrirTerminos = (event) => {
    event.preventDefault()
    window.localStorage.removeItem('terminos_aceptados')
    window.location.reload()
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

    ;(async () => {
      try {
        const { data } = await supabase
          .from('alumnos')
          .select('genero')
          .eq('id', Number(alumnoId))
          .single()
        setGeneroAlumnoActivo(data?.genero ?? null)
      } catch {
        setGeneroAlumnoActivo(null)
      }
    })()

    const terminosAceptados = window.localStorage.getItem('terminos_aceptados') === 'true'
    if (terminosAceptados && alumnoId) {
      const alumnoIdNumero = Number(alumnoId)
      const cursoIdNumero = parseInt(selectedCursoId, 10)

      if (Number.isFinite(alumnoIdNumero) && Number.isFinite(cursoIdNumero)) {
        ;(async () => {
          try {
            const { error } = await supabase.from('terminos_aceptados').insert({
              alumno_id: alumnoIdNumero,
              curso_id: cursoIdNumero,
              version: '1.0'
            })

            if (error) {
              console.warn('No se pudo registrar aceptación de términos:', error)
            }
          } catch (insertError) {
            console.warn('No se pudo registrar aceptación de términos:', insertError)
          }
        })()
      }
    }
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
    window.localStorage.removeItem('rol_ingreso_activo')

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

  const handleCambiarGenero = async (nuevoGenero) => {
    const alumnoId = Number(alumnoApoderadoId)
    if (!alumnoId) return
    const valor = nuevoGenero === '' ? null : nuevoGenero
    setGeneroAlumnoActivo(valor)
    try {
      await supabase.from('alumnos').update({ genero: valor }).eq('id', alumnoId)
    } catch (err) {
      console.warn('No se pudo actualizar el género:', err)
    }
  }

  const cambiarPinCoordinador = async () => {
    const actualNorm = String(pinCoordActual).trim()
    const nuevoNorm = String(pinCoordNuevo).trim()
    const confirmarNorm = String(confirmarPinCoordNuevo).trim()

    if (!actualNorm || !nuevoNorm || !confirmarNorm) {
      setErrorPinCoord('Completa todos los campos.')
      return
    }

    if (nuevoNorm !== confirmarNorm) {
      setErrorPinCoord('PIN nuevo y Confirmar PIN nuevo deben ser iguales.')
      return
    }

    setCambiandoPinCoord(true)
    setErrorPinCoord('')

    const { data: cursoData, error: cursoError } = await supabase
      .from('cursos')
      .select('pin_coordinador')
      .eq('id', selectedCursoId)
      .single()

    if (cursoError || !cursoData) {
      setCambiandoPinCoord(false)
      setErrorPinCoord('No se pudo verificar el PIN actual.')
      return
    }

    const pinGuardado = cursoData.pin_coordinador == null ? '' : String(cursoData.pin_coordinador).trim()

    if (actualNorm !== pinGuardado) {
      setCambiandoPinCoord(false)
      setErrorPinCoord('PIN actual incorrecto.')
      return
    }

    const { error: updateError } = await supabase
      .from('cursos')
      .update({ pin_coordinador: nuevoNorm })
      .eq('id', selectedCursoId)

    setCambiandoPinCoord(false)

    if (updateError) {
      setErrorPinCoord('No se pudo actualizar el PIN.')
      return
    }

    setPinCoordActual('')
    setPinCoordNuevo('')
    setConfirmarPinCoordNuevo('')
    setModalPinCoordAbierto(false)
    setMensajePinCoord('PIN actualizado correctamente.')
  }

  const abrirPanelAdmin = (event) => {
    event.preventDefault()
    setErrorPinAdmin('')
    setPinAdmin('')
    setMostrarPanelAdmin(true)
  }

  const cerrarPanelAdmin = () => {
    setMostrarPanelAdmin(false)
    setPinAdmin('')
    setErrorPinAdmin('')
  }

  const ingresarAdmin = async () => {
    const pinIngresado = String(pinAdmin).trim()
    if (!pinIngresado) return

    setValidandoPinAdmin(true)
    setErrorPinAdmin('')

    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('pin', pinIngresado)
      .limit(1)

    setValidandoPinAdmin(false)

    if (error || !data || data.length === 0) {
      setErrorPinAdmin('PIN incorrecto')
      return
    }

    window.localStorage.setItem('admin_id_activo', String(data[0].id))
    cerrarPanelAdmin()
    navigate('/admin')
  }

  return (
    <div className="container">
      <PageTopBar />
      <TerminosModal />
      <div className="hero">
        <h1 className="app-title"><span className="title-regalo">Regalo</span> <span className="title-grupal">Grupal</span> 🎁</h1>
        <p className="app-subtitle">La forma más fácil de organizar regalos de cumpleaños</p>

        {!rolIngreso && (
          <div className="ingreso-card">
            <h3 className="ingreso-title">Selecciona tu curso</h3>
            {loadingCursos ? (
              <p>Cargando cursos...</p>
            ) : !hayCursos ? (
              <div className="ingreso-empty">
                <p>No hay cursos registrados aún</p>
                <button className="btn btn-primary" onClick={() => navigate('/mi-curso?nuevo=true')}>
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
          </div>
        )}

        {rolIngreso && (
          <>
            <div style={{ minHeight: '120px' }}>
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
                        <>
                          <p className="app-subtitle" style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '1rem' }}>
                            Alumno activo: <strong>{alumnoApoderadoSeleccionado.nombre}</strong>
                          </p>
                          <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <label
                              htmlFor="generoAlumno"
                              style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}
                            >
                              Género:
                            </label>
                            <select
                              id="generoAlumno"
                              value={generoAlumnoActivo ?? ''}
                              onChange={(e) => handleCambiarGenero(e.target.value)}
                              style={{
                                fontSize: '0.8rem',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                padding: '0.2rem 0.4rem',
                                background: '#f9fafb',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="">No especificado</option>
                              <option value="niña">Niña</option>
                              <option value="niño">Niño</option>
                            </select>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="buttons-container">
              {esCoordinador && (
                <button className="btn btn-primary" onClick={handleCreateEvent}>
                  Crear cumpleaños
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={handleViewEvents}
                disabled={esApoderado && !alumnoApoderadoId}
              >
                Ver mis cumpleaños
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
                  Puedes revisar cumpleaños y participar subiendo tu comprobante.
                </p>
              )}
            </div>

            {esCoordinador && (
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPinCoordActual('')
                    setPinCoordNuevo('')
                    setConfirmarPinCoordNuevo('')
                    setErrorPinCoord('')
                    setMensajePinCoord('')
                    setModalPinCoordAbierto(true)
                  }}
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem' }}
                >
                  Cambiar PIN
                </button>
                {mensajePinCoord && (
                  <p className="mensaje-ok" style={{ marginTop: '0.5rem' }}>{mensajePinCoord}</p>
                )}
              </div>
            )}
          </>
        )}

        {loadingUpcoming && <p>Cargando próximos cumpleaños...</p>}

        {!loadingUpcoming && upcomingEvents.length > 0 && (
          <div className="upcoming-events">
            <h3 className="upcoming-title">Próximos cumpleaños</h3>
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

        <p style={{ marginTop: '1.5rem', marginBottom: 0, textAlign: 'center', fontSize: '0.8rem', color: '#9ca3af' }}>
          <a
            href="#"
            onClick={handleReabrirTerminos}
            style={{ color: '#9ca3af', textDecoration: 'underline' }}
          >
            Términos y condiciones
          </a>
        </p>

        <a
          href="#"
          onClick={abrirPanelAdmin}
          style={{
            position: 'fixed',
            right: '1rem',
            bottom: '0.8rem',
            fontSize: '0.74rem',
            color: '#9ca3af',
            textDecoration: 'none',
            zIndex: 40
          }}
        >
          Admin
        </a>

        {modalPinCoordAbierto && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 50
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '360px',
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                padding: '1.2rem'
              }}
            >
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#111827' }}>Cambiar mi PIN</h3>

              <div className="form-group">
                <label htmlFor="pinCoordActual">PIN actual</label>
                <input
                  id="pinCoordActual"
                  type="password"
                  value={pinCoordActual}
                  onChange={(e) => { setPinCoordActual(e.target.value); setErrorPinCoord('') }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pinCoordNuevo">PIN nuevo</label>
                <input
                  id="pinCoordNuevo"
                  type="password"
                  value={pinCoordNuevo}
                  onChange={(e) => { setPinCoordNuevo(e.target.value); setErrorPinCoord('') }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="confirmarPinCoordNuevo">Confirmar PIN nuevo</label>
                <input
                  id="confirmarPinCoordNuevo"
                  type="password"
                  value={confirmarPinCoordNuevo}
                  onChange={(e) => { setConfirmarPinCoordNuevo(e.target.value); setErrorPinCoord('') }}
                />
              </div>

              {errorPinCoord && (
                <p className="mensaje-error" style={{ marginTop: '0.3rem', marginBottom: '0.7rem' }}>
                  {errorPinCoord}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.55rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalPinCoordAbierto(false)}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={cambiarPinCoordinador}
                  disabled={cambiandoPinCoord}
                  style={{ flex: 1 }}
                >
                  {cambiandoPinCoord ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarPanelAdmin && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 50
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '360px',
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                padding: '1rem'
              }}
            >
              <h3 style={{ margin: '0 0 0.7rem 0', fontSize: '1.1rem', color: '#111827' }}>Acceso Admin</h3>
              <input
                type="password"
                className="ingreso-select"
                placeholder="Ingresa PIN"
                value={pinAdmin}
                onChange={(e) => {
                  setPinAdmin(e.target.value)
                  setErrorPinAdmin('')
                }}
              />

              {errorPinAdmin && (
                <p style={{ margin: '0.55rem 0 0 0', fontSize: '0.85rem', color: '#dc2626' }}>
                  {errorPinAdmin}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.55rem', marginTop: '0.8rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cerrarPanelAdmin}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={ingresarAdmin}
                  disabled={validandoPinAdmin || !pinAdmin.trim()}
                  style={{ flex: 1 }}
                >
                  {validandoPinAdmin ? 'Ingresando...' : 'Ingresar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App