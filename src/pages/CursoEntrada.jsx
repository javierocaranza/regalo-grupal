import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase.js'
import TerminosModal from './TerminosModal.jsx'
import '../App.css'
import './pages.css'

function CursoEntrada() {
  const navigate = useNavigate()
  const { token } = useParams()

  const [cargandoCurso, setCargandoCurso] = useState(true)
  const [curso, setCurso] = useState(null) // { id, nombre, anio, token }

  const [rolIngreso, setRolIngreso] = useState('')
  const [errorIngreso, setErrorIngreso] = useState('')
  const [mostrarPinCoordinador, setMostrarPinCoordinador] = useState(false)
  const [pinCoordinador, setPinCoordinador] = useState('')
  const [validandoPinCoordinador, setValidandoPinCoordinador] = useState(false)

  const [alumnosCurso, setAlumnosCurso] = useState([])
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)
  const [alumnoApoderadoId, setAlumnoApoderadoId] = useState('')
  const [generoAlumnoActivo, setGeneroAlumnoActivo] = useState(null)

  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(false)

  const [modalPinCoordAbierto, setModalPinCoordAbierto] = useState(false)
  const [pinCoordActual, setPinCoordActual] = useState('')
  const [pinCoordNuevo, setPinCoordNuevo] = useState('')
  const [confirmarPinCoordNuevo, setConfirmarPinCoordNuevo] = useState('')
  const [cambiandoPinCoord, setCambiandoPinCoord] = useState(false)
  const [errorPinCoord, setErrorPinCoord] = useState('')
  const [mensajePinCoord, setMensajePinCoord] = useState('')

  // Load course by token
  useEffect(() => {
    const cargar = async () => {
      setCargandoCurso(true)
      const { data, error } = await supabase
        .from('cursos')
        .select('id, nombre, anio, token')
        .eq('token', token)
        .single()
      if (error || !data) {
        setCurso(null)
      } else {
        setCurso(data)
        window.localStorage.setItem('curso_id_activo', String(data.id))
      }
      setCargandoCurso(false)
    }
    cargar()
  }, [token])

  // Load upcoming events after login
  useEffect(() => {
    if (!curso || !rolIngreso) {
      setUpcomingEvents([])
      return
    }

    const cargarProximosEventos = async () => {
      setLoadingUpcoming(true)
      const cursoIdNumero = curso.id

      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('id, fecha_evento, curso_id')
        .gt('fecha_evento', new Date().toISOString().split('T')[0])
        .order('fecha_evento', { ascending: true })

      if (eventosError) {
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

          if (cumpleanerosError) return null

          const nombres = (cumpleanerosData || [])
            .map((row) => row.alumnos?.nombre)
            .filter(Boolean)

          const cumpleanerosIdsEvento = new Set((cumpleanerosData || []).map((row) => Number(row.alumno_id)))
          const pertenecePorCursoId = Number(evento.curso_id) === cursoIdNumero
          const pertenecePorCumpleaneros = [...cumpleanerosIdsEvento].some((id) => alumnoIdsCurso.has(id))

          if (!pertenecePorCursoId && !pertenecePorCumpleaneros) return null

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
  }, [curso, rolIngreso])

  // Load alumnos when apoderado logs in
  useEffect(() => {
    if (!curso || rolIngreso !== 'apoderado') {
      setAlumnosCurso([])
      return
    }

    const cargarAlumnos = async () => {
      setLoadingAlumnos(true)
      let data = []

      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('id, nombre, curso_id')
        .eq('curso_id', curso.id)
        .order('nombre', { ascending: true })

      if (alumnosError) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('alumnos')
          .select('id, nombre, curso_id')
          .order('nombre', { ascending: true })

        if (fallbackError) {
          setAlumnosCurso([])
          setLoadingAlumnos(false)
          return
        }
        data = (fallbackData || []).filter((row) => Number(row.curso_id) === Number(curso.id))
      } else {
        data = alumnosData || []
      }

      setAlumnosCurso(data)

      if (alumnoApoderadoId && !data.some((a) => String(a.id) === String(alumnoApoderadoId))) {
        setAlumnoApoderadoId('')
        window.localStorage.removeItem('alumno_apoderado_id_activo')
        window.localStorage.removeItem('alumno_apoderado_nombre_activo')
      }

      setLoadingAlumnos(false)
    }

    cargarAlumnos()
  }, [curso, rolIngreso])

  const getCursoLabel = () => {
    if (!curso) return ''
    const nombre = curso.nombre || `Curso ${curso.id}`
    const anio = curso.anio ? ` - ${curso.anio}` : ''
    return `${nombre}${anio}`
  }

  const handleSelectRol = (rol) => {
    if (rol === 'coordinador') {
      setErrorIngreso('')
      setMostrarPinCoordinador(true)
      return
    }
    setErrorIngreso('')
    setMostrarPinCoordinador(false)
    setPinCoordinador('')
    window.localStorage.setItem('rol_ingreso_activo', rol)
    setRolIngreso(rol)
  }

  const handleIngresarCoordinador = async () => {
    setValidandoPinCoordinador(true)
    setErrorIngreso('')

    const { data, error } = await supabase
      .from('cursos')
      .select('pin_coordinador')
      .eq('id', curso.id)
      .single()

    setValidandoPinCoordinador(false)

    if (error) {
      setErrorIngreso('Error al validar PIN. Inténtalo de nuevo.')
      return
    }

    const pinGuardado = data?.pin_coordinador == null ? '' : String(data.pin_coordinador).trim()
    const pinIngresado = String(pinCoordinador).trim()

    if (!pinGuardado || pinIngresado !== pinGuardado) {
      setErrorIngreso('PIN incorrecto, inténtalo de nuevo')
      return
    }

    window.localStorage.setItem('rol_ingreso_activo', 'coordinador')
    setRolIngreso('coordinador')
    setMostrarPinCoordinador(false)
    setPinCoordinador('')
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
    if (terminosAceptados && alumnoId && curso) {
      ;(async () => {
        try {
          await supabase.from('terminos_aceptados').insert({
            alumno_id: Number(alumnoId),
            curso_id: curso.id,
            version: '1.0'
          })
        } catch {
          // ignore
        }
      })()
    }
  }

  const handleCambiarGenero = async (nuevoGenero) => {
    const alumnoId = Number(alumnoApoderadoId)
    if (!alumnoId) return
    const valor = nuevoGenero === '' ? null : nuevoGenero
    setGeneroAlumnoActivo(valor)
    try {
      await supabase.from('alumnos').update({ genero: valor }).eq('id', alumnoId)
    } catch {
      // ignore
    }
  }

  const handleViewEvents = () => {
    if (rolIngreso === 'apoderado' && !alumnoApoderadoId) {
      setErrorIngreso('Selecciona primero tu alumno para continuar.')
      return
    }
    navigate(`/${token}/mis-eventos`)
  }

  const handleCreateEvent = () => navigate(`/${token}/crear-evento`)

  const handleManageCourse = () => {
    if (curso) {
      window.localStorage.setItem('curso_id_activo', String(curso.id))
      navigate(`/${token}/mi-curso?cursoId=${curso.id}`)
    }
  }

  const handleReabrirTerminos = (event) => {
    event.preventDefault()
    window.localStorage.removeItem('terminos_aceptados')
    window.location.reload()
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
      .eq('id', curso.id)
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
      .eq('id', curso.id)

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

  const esCoordinador = rolIngreso === 'coordinador'
  const esApoderado = rolIngreso === 'apoderado'
  const alumnoApoderadoSeleccionado = alumnosCurso.find((a) => String(a.id) === String(alumnoApoderadoId))

  if (cargandoCurso) {
    return (
      <div className="container">
        <div className="hero">
          <h1 className="app-title">
            <span className="title-regalo">Regalo</span> <span className="title-grupal">Grupal</span> 🎁
          </h1>
          <p style={{ marginTop: '2rem' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!curso) {
    return (
      <div className="container">
        <div className="hero">
          <h1 className="app-title">
            <span className="title-regalo">Regalo</span> <span className="title-grupal">Grupal</span> 🎁
          </h1>
          <p className="app-subtitle" style={{ marginTop: '2rem', color: '#dc2626' }}>
            Link inválido. Verifica el enlace con tu coordinador.
          </p>
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate('/')}>
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <TerminosModal />
      <div className="hero">
        <h1 className="app-title">
          <span className="title-regalo">Regalo</span> <span className="title-grupal">Grupal</span> 🎁
        </h1>
        <p className="app-subtitle">La forma más fácil de organizar regalos de cumpleaños</p>

        {!rolIngreso && (
          <div className="ingreso-card">
            <h3 className="ingreso-title">{getCursoLabel()}</h3>

            <h3 className="ingreso-title" style={{ marginTop: '1.2rem' }}>¿Cómo ingresas?</h3>
            <div className="buttons-container ingreso-roles">
              <button className="btn btn-primary" onClick={() => handleSelectRol('apoderado')}>
                Soy apoderado
              </button>
              <button className="btn btn-secondary" onClick={() => handleSelectRol('coordinador')}>
                Soy coordinador
              </button>
            </div>

            {mostrarPinCoordinador && (
              <div style={{ marginTop: '0.85rem', display: 'grid', gap: '0.55rem' }}>
                <input
                  type="password"
                  className="ingreso-select"
                  placeholder="Ingresa PIN de coordinador"
                  value={pinCoordinador}
                  onChange={(e) => {
                    setPinCoordinador(e.target.value)
                    setErrorIngreso('')
                  }}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleIngresarCoordinador}
                  disabled={validandoPinCoordinador || !pinCoordinador.trim()}
                >
                  {validandoPinCoordinador ? 'Validando...' : 'Ingresar'}
                </button>
              </div>
            )}

            {errorIngreso && <p className="ingreso-error">{errorIngreso}</p>}
          </div>
        )}

        {rolIngreso && (
          <>
            <div style={{ minHeight: '120px' }}>
              <div className="ingreso-resumen">
                <p>
                  Ingresaste como <strong>{esCoordinador ? 'Coordinador' : 'Apoderado'}</strong>
                  {' '}en <strong>{getCursoLabel()}</strong>
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
                <button className="btn btn-secondary" onClick={() => navigate(`/${token}/acusete`)}>
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

        {rolIngreso && loadingUpcoming && <p>Cargando próximos cumpleaños...</p>}

        {rolIngreso && !loadingUpcoming && upcomingEvents.length > 0 && (
          <div className="upcoming-events">
            <h3 className="upcoming-title">Próximos cumpleaños</h3>
            <div className="events-list">
              {upcomingEvents.map((event) => (
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
      </div>
    </div>
  )
}

export default CursoEntrada
