import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { logActivity } from '../utils/activityLog.js'
import './pages.css'

function Invitacion() {
  const { tokenInvitacion } = useParams()

  // Carga del evento
  const [evento, setEvento] = useState(null)
  const [linkInvalido, setLinkInvalido] = useState(false)
  const [loading, setLoading] = useState(true)

  // Lista de todos los inscritos del evento (siempre visible)
  const [listaInscritos, setListaInscritos] = useState([])

  // Paso: 'buscar' | 'formulario' | 'estado'
  const [paso, setPaso] = useState('buscar')

  // Paso 1 – búsqueda por nombre
  const [nombreBusqueda, setNombreBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')

  // Invitado existente
  const [invitadoExistente, setInvitadoExistente] = useState(null)

  // Formulario de inscripción
  const [nombreInvitado, setNombreInvitado] = useState('')
  const [nombreApoderado, setNombreApoderado] = useState('')
  const [email, setEmail] = useState('')
  const [confirmando, setConfirmando] = useState('')
  const [errorFormulario, setErrorFormulario] = useState('')

  // Case B – subir comprobante
  const [comprobanteFile, setComprobanteFile] = useState(null)
  const [subiendoComprobante, setSubiendoComprobante] = useState(false)
  const [errorSubida, setErrorSubida] = useState('')
  const [desinscribiendoExterno, setDesinscribiendoExterno] = useState(false)
  const [uniendoseRegalo, setUniendoseRegalo] = useState(false)
  const [filaExpandida, setFilaExpandida] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('eventos')
        .select('*')
        .eq('token_invitacion', tokenInvitacion)
        .single()
      if (fetchError || !data) {
        setLinkInvalido(true)
        setLoading(false)
        return
      }
      setEvento(data)
      const { data: inscritos } = await supabase
        .from('invitados_externos')
        .select('*')
        .eq('evento_id', data.id)
        .order('id', { ascending: true })
      setListaInscritos(inscritos || [])
      setLoading(false)
    }
    cargar()
  }, [tokenInvitacion])

  const formatFecha = (fechaIso) => {
    if (!fechaIso) return 'Sin fecha'
    const date = new Date(`${fechaIso}T00:00:00`)
    if (Number.isNaN(date.getTime())) return fechaIso
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const verificarNombre = () => {
    setErrorBusqueda('')
    if (!nombreBusqueda.trim()) {
      setErrorBusqueda('Ingresa el nombre del invitado.')
      return
    }
    setBuscando(true)
    const nombreNorm = nombreBusqueda.trim().toLowerCase().replace(/\s+/g, ' ')
    const encontrado = listaInscritos.find(
      (inv) => (inv.nombre_invitado || '').trim().toLowerCase().replace(/\s+/g, ' ') === nombreNorm
    )
    setBuscando(false)
    if (encontrado) {
      setInvitadoExistente(encontrado)
      setPaso('estado')
    } else {
      setNombreInvitado(nombreBusqueda.trim())
      setPaso('formulario')
    }
  }

  const confirmarAsistencia = async (tipo) => {
    setErrorFormulario('')
    if (!nombreInvitado.trim()) {
      setErrorFormulario('El nombre del invitado es obligatorio.')
      return
    }
    if (!nombreApoderado.trim()) {
      setErrorFormulario('El nombre del apoderado es obligatorio.')
      return
    }
    const nombreNorm = nombreInvitado.trim().toLowerCase().replace(/\s+/g, ' ')

    // Verificar que no sea alumno de ningún curso
    const { data: alumnosData, error: alumnosError } = await supabase
      .from('alumnos')
      .select('nombre')
    if (!alumnosError && alumnosData) {
      const palabrasIngresadas = nombreInvitado.trim().toLowerCase().split(/\s+/).filter((p) => p.length >= 3)
      const coincide = alumnosData.some((a) => {
        const palabrasAlumno = (a.nombre || '').trim().toLowerCase().split(/\s+/).filter((p) => p.length >= 3)
        const coincidencias = palabrasIngresadas.filter((p) => palabrasAlumno.includes(p))
        return coincidencias.length >= 2
      })
      if (coincide) {
        setErrorFormulario('Este alumno ya pertenece a un curso, usa el link de tu curso para inscribirte.')
        return
      }
    }

    setConfirmando(tipo)
    const payload = {
      evento_id: evento.id,
      nombre_invitado: nombreInvitado.trim(),
      nombre_apoderado: nombreApoderado.trim(),
      email: email.trim() || null,
      participa_regalo: tipo === 'regalo_y_cumple',
      estado: 'pendiente'
    }
    const { data: insertData, error: insertError } = await supabase
      .from('invitados_externos')
      .insert(payload)
      .select('*')
      .single()
    setConfirmando('')
    if (insertError) {
      console.error('Error confirmando asistencia:', insertError)
      setErrorFormulario('No se pudo confirmar la asistencia. Intenta nuevamente.')
      return
    }
    logActivity(supabase, { accion: 'registro_invitado_externo', tabla_afectada: 'invitados_externos', registro_id: insertData?.id ?? null, rol: 'invitado', nombre_usuario: nombreApoderado.trim(), curso_id: evento.curso_id || null, detalle: nombreInvitado.trim() })
    setListaInscritos((prev) => [...prev, insertData])
    setInvitadoExistente(insertData)
    setPaso('estado')
  }

  const subirComprobanteExterno = async () => {
    setErrorSubida('')
    if (!comprobanteFile) {
      setErrorSubida('Selecciona un archivo.')
      return
    }
    if (!comprobanteFile.type.startsWith('image/')) {
      setErrorSubida('El archivo debe ser una imagen.')
      return
    }
    const extension = comprobanteFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const nombreArchivo = `${evento.id}/externo_${invitadoExistente.id}_${Date.now()}.${extension}`
    setSubiendoComprobante(true)
    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(nombreArchivo, comprobanteFile, { upsert: true })
    if (uploadError) {
      console.error('Error subiendo comprobante externo:', uploadError)
      setSubiendoComprobante(false)
      setErrorSubida('No se pudo subir el comprobante. Intenta nuevamente.')
      return
    }
    const { data: publicUrlData } = supabase.storage.from('comprobantes').getPublicUrl(nombreArchivo)
    const urlComprobante = publicUrlData?.publicUrl || ''
    const { data: updatedData, error: updateError } = await supabase
      .from('invitados_externos')
      .update({ imagen_comprobante: urlComprobante, estado: 'comprobante_subido' })
      .eq('id', invitadoExistente.id)
      .select('*')
      .single()
    setSubiendoComprobante(false)
    if (updateError) {
      console.error('Error guardando URL de comprobante externo:', updateError)
      setErrorSubida('No se pudo guardar el comprobante. Intenta nuevamente.')
      return
    }
    setInvitadoExistente(updatedData)
    setListaInscritos((prev) => prev.map((inv) => (inv.id === updatedData.id ? updatedData : inv)))
    setComprobanteFile(null)
    logActivity(supabase, { accion: 'subida_comprobante_externo', tabla_afectada: 'invitados_externos', registro_id: updatedData.id, rol: 'invitado', nombre_usuario: updatedData.nombre_apoderado || '', curso_id: evento.curso_id || null, detalle: updatedData.nombre_invitado || null })
  }

  const desinscribirseExterno = async () => {
    if (!invitadoExistente) return
    setDesinscribiendoExterno(true)
    const { error } = await supabase
      .from('invitados_externos')
      .delete()
      .eq('id', invitadoExistente.id)
    setDesinscribiendoExterno(false)
    if (error) {
      console.error('Error desinscribiéndose:', error)
      return
    }
    setListaInscritos((prev) => prev.filter((inv) => inv.id !== invitadoExistente.id))
    logActivity(supabase, { accion: 'desinscripcion_externo', tabla_afectada: 'invitados_externos', registro_id: invitadoExistente.id, rol: 'invitado', nombre_usuario: invitadoExistente.nombre_apoderado || '', curso_id: evento.curso_id || null, detalle: invitadoExistente.nombre_invitado || null })
    setInvitadoExistente(null)
    setNombreBusqueda('')
    setPaso('buscar')
  }

  const unirseAlRegalo = async () => {
    if (!invitadoExistente) return
    setUniendoseRegalo(true)
    const { data: updatedData, error } = await supabase
      .from('invitados_externos')
      .update({ participa_regalo: true })
      .eq('id', invitadoExistente.id)
      .select('*')
      .single()
    setUniendoseRegalo(false)
    if (error) {
      console.error('Error uniéndose al regalo:', error)
      return
    }
    setInvitadoExistente(updatedData)
    setListaInscritos((prev) => prev.map((inv) => (inv.id === updatedData.id ? updatedData : inv)))
    logActivity(supabase, { accion: 'cambio_tipo_participacion_externo', tabla_afectada: 'invitados_externos', registro_id: updatedData.id, rol: 'invitado', nombre_usuario: updatedData.nombre_apoderado || '', curso_id: evento.curso_id || null, detalle: updatedData.nombre_invitado || null })
  }

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ marginTop: '2rem' }}>Cargando invitación...</p>
      </div>
    )
  }

  if (linkInvalido) {
    return (
      <div className="page-container">
        <h1 className="page-title">Invitación</h1>
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8d7da', color: '#721c24', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
          Link inválido. Este enlace de invitación no existe o ya no está disponible.
        </div>
      </div>
    )
  }

  const infoEvento = (
    <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
      <h3 className="upcoming-title">Información del Evento</h3>
      <div className="event-item">
        <div className="event-name">🎂 {evento.nombres_cumpleaneros || 'Cumpleaños del curso'}</div>
        <div className="event-details">Fecha: {formatFecha(evento.fecha_evento)}</div>
      </div>
    </div>
  )

  // ── Sección 2: acción según paso ─────────────────────────────────────────
  let seccionAccion

  if (paso === 'buscar') {
    seccionAccion = (
      <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
        <h3 className="upcoming-title">¿Ya te inscribiste o quieres inscribirte?</h3>
        <div className="event-item">
          <div className="participacion-form">
            <label htmlFor="nombreBusqueda" className="participacion-label">
              Nombre del invitado (niño/a)
            </label>
            <input
              id="nombreBusqueda"
              type="text"
              className="participacion-input"
              placeholder="Ej: Martín González"
              value={nombreBusqueda}
              onChange={(e) => setNombreBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verificarNombre()}
            />
            {errorBusqueda && (
              <p className="mensaje-error" style={{ marginTop: '0.5rem' }}>{errorBusqueda}</p>
            )}
            <div className="buttons-container" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={buscando}
                onClick={verificarNombre}
              >
                {buscando ? 'Verificando...' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  } else if (paso === 'formulario') {
    seccionAccion = (
      <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
        <h3 className="upcoming-title">Confirmar Asistencia</h3>
        <div className="event-item">
          <div className="participacion-form">
            <label htmlFor="nombreInvitado" className="participacion-label">
              Nombre del invitado (niño/a) *
            </label>
            <input
              id="nombreInvitado"
              type="text"
              className="participacion-input"
              placeholder="Ej: Martín González"
              value={nombreInvitado}
              onChange={(e) => setNombreInvitado(e.target.value)}
            />
            <label htmlFor="nombreApoderado" className="participacion-label" style={{ marginTop: '0.75rem' }}>
              Nombre del apoderado *
            </label>
            <input
              id="nombreApoderado"
              type="text"
              className="participacion-input"
              placeholder="Ej: María González"
              value={nombreApoderado}
              onChange={(e) => setNombreApoderado(e.target.value)}
            />
            <label htmlFor="emailInvitado" className="participacion-label" style={{ marginTop: '0.75rem' }}>
              Email (opcional)
            </label>
            <input
              id="emailInvitado"
              type="email"
              className="participacion-input"
              placeholder="Ej: maria@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errorFormulario && (
              <p className="mensaje-error" style={{ marginTop: '0.75rem' }}>{errorFormulario}</p>
            )}
            <div className="buttons-container" style={{ gap: '0.6rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={Boolean(confirmando)}
                onClick={() => confirmarAsistencia('regalo_y_cumple')}
              >
                {confirmando === 'regalo_y_cumple' ? 'Confirmando...' : 'Confirmar regalo y cumpleaños 🎁'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={Boolean(confirmando)}
                onClick={() => confirmarAsistencia('solo_cumple')}
              >
                {confirmando === 'solo_cumple' ? 'Confirmando...' : 'Confirmar solo cumpleaños 🎂'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  } else if (paso === 'estado' && invitadoExistente) {
    const { estado, participa_regalo, cuota, nombre_invitado } = invitadoExistente
    const btnDesinscribirse = (
      <button
        type="button"
        className="btn btn-rechazar"
        disabled={desinscribiendoExterno}
        onClick={desinscribirseExterno}
        style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', marginTop: '0.75rem' }}
      >
        {desinscribiendoExterno ? 'Desinscribiendo...' : 'Desinscribirse'}
      </button>
    )
    let contenidoEstado
    if (!participa_regalo) {
      contenidoEstado = (
        <div className="event-item">
          <div className="event-name">Anotado para el cumpleaños 🎂</div>
          <div className="event-details">Hola {nombre_invitado}, ya confirmaste tu asistencia al festejo.</div>
          <div className="buttons-container" style={{ gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={uniendoseRegalo}
              onClick={unirseAlRegalo}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
            >
              {uniendoseRegalo ? 'Procesando...' : 'Unirse al regalo 🎁'}
            </button>
            {btnDesinscribirse}
          </div>
        </div>
      )
    } else if (estado === 'pagado') {
      contenidoEstado = (
        <div className="event-item">
          <div className="event-name" style={{ color: '#2e7d32' }}>Pago aprobado ✓</div>
          <div className="event-details">¡Gracias {nombre_invitado}! Tu aporte al regalo está confirmado.</div>
        </div>
      )
    } else if (estado === 'comprobante_subido') {
      contenidoEstado = (
        <div className="event-item">
          <div className="event-name">Comprobante enviado · Esperando aprobación ⏳</div>
          <div className="event-details">El coordinador revisará tu comprobante pronto.</div>
          {btnDesinscribirse}
        </div>
      )
    } else if (evento?.estado === 'en_pago') {
      contenidoEstado = (
        <>
          <div className="event-item">
            <div className="event-name">Pago pendiente</div>
            <div className="event-details">Hola {nombre_invitado}, ya confirmaste tu participación.</div>
            {cuota ? (
              <div className="event-details" style={{ marginTop: '0.4rem', fontWeight: 600 }}>
                Cuota a pagar: ${Number(cuota).toLocaleString('es-CL')}
              </div>
            ) : null}
            {(evento.nombre_coordinador || evento.banco) && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: '#444', lineHeight: '1.7' }}>
                <strong>Datos de transferencia:</strong>
                {evento.nombre_coordinador && <div>Nombre: {evento.nombre_coordinador}</div>}
                {evento.rut_coordinador && <div>RUT: {evento.rut_coordinador}</div>}
                {evento.banco && <div>Banco: {evento.banco}</div>}
                {evento.tipo_cuenta && <div>Tipo de cuenta: {evento.tipo_cuenta}</div>}
                {evento.numero_cuenta && <div>N° cuenta: {evento.numero_cuenta}</div>}
              </div>
            )}
          </div>
          <div className="event-item" style={{ marginTop: '0.5rem' }}>
            <div className="participacion-form">
              <label htmlFor="comprobanteExterno" className="participacion-label">
                Subir comprobante de transferencia
              </label>
              <input
                id="comprobanteExterno"
                type="file"
                accept="image/*"
                className="participacion-input"
                onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
              />
              {errorSubida && (
                <p className="mensaje-error" style={{ marginTop: '0.5rem' }}>{errorSubida}</p>
              )}
              <div className="buttons-container" style={{ gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={subiendoComprobante || !comprobanteFile}
                  onClick={subirComprobanteExterno}
                >
                  {subiendoComprobante ? 'Subiendo...' : 'Subir comprobante'}
                </button>
                {btnDesinscribirse}
              </div>
            </div>
          </div>
        </>
      )
    } else {
      contenidoEstado = (
        <div className="event-item">
          <div className="event-name">Inscrito · Pendiente cálculo de cuota</div>
          <div className="event-details">Hola {nombre_invitado}, ya confirmaste tu participación en el regalo.</div>
          <div className="buttons-container" style={{ marginTop: '0.75rem' }}>
            {btnDesinscribirse}
          </div>
        </div>
      )
    }
    seccionAccion = (
      <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
        <h3 className="upcoming-title">Tu estado</h3>
        {contenidoEstado}
      </div>
    )
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Invitación al Cumpleaños</h1>

      {/* Info del evento */}
      {infoEvento}

      {/* Sección 1: lista de inscritos */}
      <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
        <h3 className="upcoming-title">Inscritos ({listaInscritos.length})</h3>
        {listaInscritos.length === 0 ? (
          <p style={{ margin: '0.5rem 0', fontSize: '0.88rem', color: '#888' }}>Aún no hay inscritos.</p>
        ) : (
          <div>
            {listaInscritos.map((inv, index) => {
              const estadoLabel = !inv.participa_regalo
                ? 'Solo cumpleaños 🎂'
                : inv.estado === 'pagado'
                  ? 'Pago aprobado ✓'
                  : inv.estado === 'comprobante_subido'
                    ? 'Comprobante enviado ⏳'
                    : evento?.estado === 'en_pago'
                      ? 'Pago pendiente'
                      : 'Pendiente cálculo cuota'
              const expandida = filaExpandida === (inv.id ?? index)
              const toggleFila = () => {
                const nuevaId = expandida ? null : (inv.id ?? index)
                setFilaExpandida(nuevaId)
                if (!expandida) setInvitadoExistente(inv)
              }
              return (
                <div
                  key={inv.id ?? index}
                  style={{ borderBottom: '1px solid #f0f0f0', fontSize: '0.85rem' }}
                >
                  {/* Fila principal — clickeable */}
                  <div
                    onClick={toggleFila}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      padding: '0.5rem 0.25rem',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      background: expandida ? '#f5f0ff' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <span style={{ fontWeight: 500, color: '#333' }}>
                      {inv.nombre_invitado || 'Sin nombre'}
                    </span>
                    <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                      <span>{inv.participa_regalo ? '🎁' : '🎂'}</span>
                      <span style={{ fontSize: '0.78rem', color: inv.estado === 'pagado' ? '#2e7d32' : '#888' }}>{estadoLabel}</span>
                      <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{expandida ? '▲' : '▼'}</span>
                    </span>
                  </div>

                  {/* Panel de acciones expandido */}
                  {expandida && (
                    <div style={{ padding: '0.5rem 0.5rem 0.75rem', background: '#faf8ff', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {inv.estado === 'pagado' && (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#2e7d32' }}>Pago aprobado ✓</p>
                      )}

                      {inv.estado === 'comprobante_subido' && (
                        <>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#666' }}>Comprobante enviado · Esperando aprobación ⏳</p>
                          <button
                            className="btn-secondary"
                            onClick={desinscribirseExterno}
                            disabled={desinscribiendoExterno}
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                          >
                            {desinscribiendoExterno ? 'Eliminando...' : 'Desinscribirse'}
                          </button>
                        </>
                      )}

                      {inv.estado === 'pendiente' && inv.participa_regalo && (
                        evento?.estado === 'en_pago' ? (
                          <>
                            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#c17900' }}>Pago pendiente</p>
                            {inv.cuota && (
                              <p style={{ margin: 0, fontSize: '0.82rem', color: '#444' }}>Cuota: ${Number(inv.cuota).toLocaleString('es-CL')}</p>
                            )}
                            {(evento.nombre_coordinador || evento.banco) && (
                              <div style={{ fontSize: '0.82rem', color: '#444', lineHeight: '1.6' }}>
                                <strong>Datos de transferencia:</strong>
                                {evento.nombre_coordinador && <div>Nombre: {evento.nombre_coordinador}</div>}
                                {evento.rut_coordinador && <div>RUT: {evento.rut_coordinador}</div>}
                                {evento.banco && <div>Banco: {evento.banco}</div>}
                                {evento.tipo_cuenta && <div>Tipo de cuenta: {evento.tipo_cuenta}</div>}
                                {evento.numero_cuenta && <div>N° cuenta: {evento.numero_cuenta}</div>}
                              </div>
                            )}
                            <label style={{ fontSize: '0.82rem', color: '#444', fontWeight: 500 }}>Subir comprobante de pago:</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              style={{ fontSize: '0.8rem' }}
                              onChange={(e) => setComprobanteFile(e.target.files[0] || null)}
                            />
                            {errorSubida && <p style={{ margin: 0, color: '#c62828', fontSize: '0.8rem' }}>{errorSubida}</p>}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                className="btn-primary"
                                onClick={subirComprobanteExterno}
                                disabled={subiendoComprobante || !comprobanteFile}
                                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                              >
                                {subiendoComprobante ? 'Subiendo...' : 'Subir comprobante'}
                              </button>
                              <button
                                className="btn-secondary"
                                onClick={desinscribirseExterno}
                                disabled={desinscribiendoExterno}
                                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                              >
                                {desinscribiendoExterno ? 'Eliminando...' : 'Desinscribirse'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#555' }}>Inscrito · Pendiente cálculo de cuota</p>
                            <button
                              className="btn-secondary"
                              onClick={desinscribirseExterno}
                              disabled={desinscribiendoExterno}
                              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                            >
                              {desinscribiendoExterno ? 'Eliminando...' : 'Desinscribirse'}
                            </button>
                          </>
                        )
                      )}

                      {inv.estado === 'pendiente' && !inv.participa_regalo && (
                        <>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#555' }}>Anotado para el cumpleaños 🎂</p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn-primary"
                            onClick={unirseAlRegalo}
                            disabled={uniendoseRegalo}
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                          >
                            {uniendoseRegalo ? 'Procesando...' : 'Unirse al regalo 🎁'}
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={desinscribirseExterno}
                            disabled={desinscribiendoExterno}
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                          >
                            {desinscribiendoExterno ? 'Eliminando...' : 'Desinscribirse'}
                          </button>
                        </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sección 2: acción / formulario */}
      {seccionAccion}
    </div>
  )
}

export default Invitacion
