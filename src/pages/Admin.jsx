import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import PageTopBar from './PageTopBar.jsx'
import './pages.css'

function Admin() {
  const navigate = useNavigate()
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pinActual, setPinActual] = useState('')
  const [pinNuevo, setPinNuevo] = useState('')
  const [confirmarPinNuevo, setConfirmarPinNuevo] = useState('')
  const [cambiandoPin, setCambiandoPin] = useState(false)
  const [mensajePin, setMensajePin] = useState('')
  const [errorPin, setErrorPin] = useState('')
  const [modalPinAbierto, setModalPinAbierto] = useState(false)
  const [modalCrearCursoAbierto, setModalCrearCursoAbierto] = useState(false)
  const [nuevoCursoNombre, setNuevoCursoNombre] = useState('')
  const [nuevoCursoAnio, setNuevoCursoAnio] = useState('')
  const [nuevoCursoColegio, setNuevoCursoColegio] = useState('')
  const [creandoCurso, setCreandoCurso] = useState(false)
  const [errorCrearCurso, setErrorCrearCurso] = useState('')
  const [modalPinCoordinadorAbierto, setModalPinCoordinadorAbierto] = useState(false)
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)
  const [pinCoordinadorNuevo, setPinCoordinadorNuevo] = useState('')
  const [confirmarPinCoordinadorNuevo, setConfirmarPinCoordinadorNuevo] = useState('')
  const [cambiandoPinCoordinador, setCambiandoPinCoordinador] = useState(false)
  const [errorPinCoordinador, setErrorPinCoordinador] = useState('')

  useEffect(() => {
    const cargarCursos = async () => {
      setLoading(true)
      setError('')

      const { data, error: cursosError } = await supabase
        .from('cursos')
        .select('id, nombre, anio, colegio, pin_coordinador, token')
        .order('anio', { ascending: false })

      if (cursosError) {
        console.error('Error cargando cursos en panel admin:', cursosError)
        setError('No se pudieron cargar los cursos.')
        setCursos([])
        setLoading(false)
        return
      }

      setCursos(data || [])
      setLoading(false)
    }

    cargarCursos()
  }, [])

  const cambiarPinAdmin = async () => {
    setMensajePin('')
    setErrorPin('')

    const adminIdRaw = window.localStorage.getItem('admin_id_activo') || ''
    const adminId = parseInt(adminIdRaw, 10)
    if (!adminId) {
      setErrorPin('No se pudo identificar el admin en sesión.')
      return
    }

    const pinActualNormalizado = String(pinActual).trim()
    const pinNuevoNormalizado = String(pinNuevo).trim()
    const confirmarPinNuevoNormalizado = String(confirmarPinNuevo).trim()

    if (!pinActualNormalizado || !pinNuevoNormalizado || !confirmarPinNuevoNormalizado) {
      setErrorPin('Completa todos los campos.')
      return
    }

    if (pinNuevoNormalizado !== confirmarPinNuevoNormalizado) {
      setErrorPin('PIN nuevo y Confirmar PIN nuevo deben ser iguales.')
      return
    }

    setCambiandoPin(true)

    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id, pin')
      .eq('id', adminId)
      .single()

    if (adminError || !adminData) {
      setCambiandoPin(false)
      setErrorPin('No se pudo verificar el PIN actual.')
      return
    }

    const pinActualGuardado = adminData.pin === null || adminData.pin === undefined ? '' : String(adminData.pin).trim()
    if (pinActualNormalizado !== pinActualGuardado) {
      setCambiandoPin(false)
      setErrorPin('PIN actual incorrecto.')
      return
    }

    const { error: updateError } = await supabase
      .from('admins')
      .update({ pin: pinNuevoNormalizado })
      .eq('id', adminId)

    setCambiandoPin(false)

    if (updateError) {
      setErrorPin('No se pudo cambiar el PIN.')
      return
    }

    setPinActual('')
    setPinNuevo('')
    setConfirmarPinNuevo('')
    setModalPinAbierto(false)
    setMensajePin('PIN actualizado correctamente.')
  }

  const abrirModalPinCoordinador = (curso) => {
    setCursoSeleccionado(curso)
    setPinCoordinadorNuevo('')
    setConfirmarPinCoordinadorNuevo('')
    setErrorPinCoordinador('')
    setModalPinCoordinadorAbierto(true)
  }

  const cambiarPinCoordinador = async () => {
    const pinNorm = String(pinCoordinadorNuevo).trim()
    const confirmarNorm = String(confirmarPinCoordinadorNuevo).trim()

    if (!pinNorm || !confirmarNorm) {
      setErrorPinCoordinador('Completa ambos campos.')
      return
    }

    if (pinNorm !== confirmarNorm) {
      setErrorPinCoordinador('Los PINs no coinciden.')
      return
    }

    setCambiandoPinCoordinador(true)
    setErrorPinCoordinador('')

    const { error: updateError } = await supabase
      .from('cursos')
      .update({ pin_coordinador: pinNorm })
      .eq('id', cursoSeleccionado.id)

    setCambiandoPinCoordinador(false)

    if (updateError) {
      console.error('Error cambiando PIN coordinador:', updateError)
      setErrorPinCoordinador('No se pudo actualizar el PIN.')
      return
    }

    setCursos((prev) =>
      prev.map((c) =>
        c.id === cursoSeleccionado.id ? { ...c, pin_coordinador: pinNorm } : c
      )
    )
    setModalPinCoordinadorAbierto(false)
  }

  const abrirModalCrearCurso = () => {
    setNuevoCursoNombre('')
    setNuevoCursoAnio('')
    setNuevoCursoColegio('')
    setErrorCrearCurso('')
    setModalCrearCursoAbierto(true)
  }

  const crearCurso = async () => {
    const nombreNorm = String(nuevoCursoNombre).trim()
    if (!nombreNorm) {
      setErrorCrearCurso('El nombre del curso es obligatorio.')
      return
    }

    setCreandoCurso(true)
    setErrorCrearCurso('')

    const payload = { nombre: nombreNorm }
    if (nuevoCursoAnio.trim()) payload.anio = nuevoCursoAnio.trim()
    if (nuevoCursoColegio.trim()) payload.colegio = nuevoCursoColegio.trim()

    const { data: nuevoCurso, error: insertError } = await supabase
      .from('cursos')
      .insert(payload)
      .select('id, nombre, anio, colegio, pin_coordinador')
      .single()

    setCreandoCurso(false)

    if (insertError) {
      console.error('Error creando curso:', insertError)
      setErrorCrearCurso('No se pudo crear el curso.')
      return
    }

    setCursos((prev) => [nuevoCurso, ...prev])
    setModalCrearCursoAbierto(false)
  }

  return (
    <div className="page-container">
      <PageTopBar />

      <h1 className="page-title">Panel Admin</h1>

      <div style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/')}
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.9rem' }}
        >
          Volver al inicio
        </button>
      </div>

      {loading && <p style={{ marginTop: '1.2rem' }}>Cargando cursos...</p>}

      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f8d7da',
            color: '#721c24',
            borderRadius: '8px',
            border: '1px solid #f5c6cb'
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <h3 className="upcoming-title" style={{ margin: 0 }}>Cursos</h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={abrirModalCrearCurso}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              >
                + Crear curso
              </button>
            </div>
            {cursos.length === 0 ? (
              <p style={{ margin: 0 }}>No hay cursos registrados.</p>
            ) : (
              <div className="events-list">
                {cursos.map((curso) => (
                  <div key={curso.id} className="event-item">
                    <div className="event-name">{curso.nombre || `Curso ${curso.id}`}</div>
                    <div className="event-details">Año: {curso.anio || '-'}</div>
                    <div className="event-details">Colegio: {curso.colegio || '-'}</div>
                    <div className="event-details">PIN coordinador: {curso.pin_coordinador || '-'}</div>
                    {curso.token && (
                      <div className="event-details" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ wordBreak: 'break-all' }}>
                          Link: {window.location.origin}/{curso.token}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${curso.token}`)}
                          style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem' }}
                        >
                          Copiar link
                        </button>
                      </div>
                    )}
                    <div style={{ marginTop: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => abrirModalPinCoordinador(curso)}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Cambiar PIN
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.2rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setErrorPin('')
                setMensajePin('')
                setPinActual('')
                setPinNuevo('')
                setConfirmarPinNuevo('')
                setModalPinAbierto(true)
              }}
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem' }}
            >
              Cambiar PIN
            </button>

            {mensajePin && (
              <p className="mensaje-ok" style={{ marginTop: '0.6rem' }}>
                {mensajePin}
              </p>
            )}
          </div>

          {modalPinCoordinadorAbierto && cursoSeleccionado && (
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
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#111827' }}>
                  Cambiar PIN de {cursoSeleccionado.nombre}{cursoSeleccionado.anio ? ` - ${cursoSeleccionado.anio}` : ''}
                </h3>

                <div className="form-group">
                  <label htmlFor="pinCoordinadorNuevo">PIN nuevo</label>
                  <input
                    id="pinCoordinadorNuevo"
                    type="password"
                    value={pinCoordinadorNuevo}
                    onChange={(e) => { setPinCoordinadorNuevo(e.target.value); setErrorPinCoordinador('') }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label htmlFor="confirmarPinCoordinadorNuevo">Confirmar PIN nuevo</label>
                  <input
                    id="confirmarPinCoordinadorNuevo"
                    type="password"
                    value={confirmarPinCoordinadorNuevo}
                    onChange={(e) => { setConfirmarPinCoordinadorNuevo(e.target.value); setErrorPinCoordinador('') }}
                  />
                </div>

                {errorPinCoordinador && (
                  <p className="mensaje-error" style={{ marginTop: '0.3rem', marginBottom: '0.7rem' }}>
                    {errorPinCoordinador}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.55rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalPinCoordinadorAbierto(false)}
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={cambiarPinCoordinador}
                    disabled={cambiandoPinCoordinador}
                    style={{ flex: 1 }}
                  >
                    {cambiandoPinCoordinador ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalCrearCursoAbierto && (
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
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#111827' }}>Crear curso</h3>

                <div className="form-group">
                  <label htmlFor="nuevoCursoNombre">Nombre *</label>
                  <input
                    id="nuevoCursoNombre"
                    type="text"
                    value={nuevoCursoNombre}
                    onChange={(e) => { setNuevoCursoNombre(e.target.value); setErrorCrearCurso('') }}
                    placeholder="Ej: 4A"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="nuevoCursoAnio">Año</label>
                  <input
                    id="nuevoCursoAnio"
                    type="number"
                    value={nuevoCursoAnio}
                    onChange={(e) => { setNuevoCursoAnio(e.target.value); setErrorCrearCurso('') }}
                    placeholder="Ej: 2026"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label htmlFor="nuevoCursoColegio">Colegio (opcional)</label>
                  <input
                    id="nuevoCursoColegio"
                    type="text"
                    value={nuevoCursoColegio}
                    onChange={(e) => { setNuevoCursoColegio(e.target.value); setErrorCrearCurso('') }}
                    placeholder="Nombre del colegio"
                  />
                </div>

                {errorCrearCurso && (
                  <p className="mensaje-error" style={{ marginTop: '0.3rem', marginBottom: '0.7rem' }}>
                    {errorCrearCurso}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.55rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalCrearCursoAbierto(false)}
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={crearCurso}
                    disabled={creandoCurso}
                    style={{ flex: 1 }}
                  >
                    {creandoCurso ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalPinAbierto && (
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
                  <label htmlFor="pinActual">PIN actual</label>
                  <input
                    id="pinActual"
                    type="password"
                    value={pinActual}
                    onChange={(e) => { setPinActual(e.target.value); setErrorPin('') }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pinNuevo">PIN nuevo</label>
                  <input
                    id="pinNuevo"
                    type="password"
                    value={pinNuevo}
                    onChange={(e) => { setPinNuevo(e.target.value); setErrorPin('') }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label htmlFor="confirmarPinNuevo">Confirmar PIN nuevo</label>
                  <input
                    id="confirmarPinNuevo"
                    type="password"
                    value={confirmarPinNuevo}
                    onChange={(e) => { setConfirmarPinNuevo(e.target.value); setErrorPin('') }}
                  />
                </div>

                {errorPin && (
                  <p className="mensaje-error" style={{ marginTop: '0.3rem', marginBottom: '0.7rem' }}>
                    {errorPin}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.55rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalPinAbierto(false)}
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={cambiarPinAdmin}
                    disabled={cambiandoPin}
                    style={{ flex: 1 }}
                  >
                    {cambiandoPin ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Admin
