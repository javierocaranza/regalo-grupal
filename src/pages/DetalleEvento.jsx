import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase.js'
import './pages.css'

function DetalleEvento() {
  const navigate = useNavigate()
  const { id } = useParams()
  const OTRO_INVITADO_VALUE = 'otro_externo'
  const [evento, setEvento] = useState(null)
  const [participantes, setParticipantes] = useState([])
  const [miParticipacion, setMiParticipacion] = useState(null)
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([])
  const [selectedParticipante, setSelectedParticipante] = useState('')
  const [nombreParticipante, setNombreParticipante] = useState('')
  const [confirmandoParticipacion, setConfirmandoParticipacion] = useState(false)
  const [subiendoComprobante, setSubiendoComprobante] = useState(false)
  const [comprobanteFile, setComprobanteFile] = useState(null)
  const [mensajeFlujo, setMensajeFlujo] = useState('')
  const [errorFlujo, setErrorFlujo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const storageBucket = 'comprobantes'
  const localStorageKey = `participacion_evento_${id}`

  const formatFecha = (fechaIso) => {
    if (!fechaIso) return 'Sin fecha'
    const date = new Date(`${fechaIso}T00:00:00`)
    if (Number.isNaN(date.getTime())) return fechaIso
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatEstadoPago = (participante) => {
    const raw = (
      participante.estado_pago ??
      participante.estadoPago ??
      participante.pagado ??
      participante.estado ??
      ''
    )

    if (typeof raw === 'boolean') return raw ? 'Pagado' : 'Pendiente'

    const normalized = String(raw).toLowerCase().trim()
    if (['pagado', 'paid', 'si', 'sí', 'true', '1'].includes(normalized)) return 'Pagado'
    if (['pendiente', 'pending', 'no', 'false', '0'].includes(normalized)) return 'Pendiente'
    return normalized ? raw : 'Pendiente'
  }

  useEffect(() => {
    const cargarDetalle = async () => {
      setLoading(true)
      setError('')

      const eventoId = parseInt(id, 10)
      if (!eventoId) {
        setError('ID de evento invalido.')
        setLoading(false)
        return
      }

      const { data: eventoData, error: eventoError } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', eventoId)
        .single()

      if (eventoError) {
        console.error('Error cargando evento:', eventoError)
        setError('No se pudo cargar el detalle del evento.')
        setLoading(false)
        return
      }

      setEvento(eventoData)

      const { data: cumpleanerosData, error: cumpleanerosError } = await supabase
        .from('cumpleaneros')
        .select('alumno_id')
        .eq('evento_id', eventoId)

      if (cumpleanerosError) {
        console.error('Error cargando cumpleaneros del evento:', cumpleanerosError)
      }

      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('id, nombre')
        .order('nombre', { ascending: true })

      if (alumnosError) {
        console.error('Error cargando alumnos:', alumnosError)
        setAlumnosDisponibles([])
      } else {
        const cumpleanerosIds = new Set((cumpleanerosData || []).map((row) => row.alumno_id))
        const alumnosFiltrados = (alumnosData || []).filter((alumno) => !cumpleanerosIds.has(alumno.id))
        setAlumnosDisponibles(alumnosFiltrados)
      }

      const { data: participantesData, error: participantesError } = await supabase
        .from('participantes')
        .select('*')
        .eq('evento_id', id)

      if (participantesError) {
        console.error('Error cargando participantes:', participantesError)
        setParticipantes([])
      } else {
        const participantesBase = participantesData || []

        const participantesConAlumno = await Promise.all(
          participantesBase.map(async (participante) => {
            if (!participante.alumno_id) {
              return { ...participante, alumnoNombre: 'Sin nombre' }
            }

            const { data: alumnoData, error: alumnoError } = await supabase
              .from('alumnos')
              .select('nombre')
              .eq('id', participante.alumno_id)
              .single()

            if (alumnoError) {
              console.error('Error cargando alumno de participante:', alumnoError)
              return { ...participante, alumnoNombre: 'Sin nombre' }
            }

            return { ...participante, alumnoNombre: alumnoData?.nombre || 'Sin nombre' }
          })
        )

        setParticipantes(participantesConAlumno)

        const participacionGuardada = window.localStorage.getItem(localStorageKey)
        if (participacionGuardada) {
          const participanteId = parseInt(participacionGuardada, 10)
          if (participanteId) {
            const participacionActual = participantesConAlumno.find((p) => p.id === participanteId)
            if (participacionActual) {
              setMiParticipacion(participacionActual)
              setNombreParticipante(participacionActual.nombre_participante || '')
            }
          }
        }
      }

      setLoading(false)
    }

    cargarDetalle()
  }, [id])

  const fechaEvento = evento?.fecha_evento ?? evento?.fechaEvento ?? evento?.fecha ?? null

  const cuotaMin = evento?.cuota_minima ?? evento?.cuotaMinima ?? evento?.cuota_min ?? '-'
  const cuotaMax = evento?.cuota_maxima ?? evento?.cuotaMaxima ?? evento?.cuota_max ?? '-'
  const estadoEvento = evento?.estado ?? 'Activo'
  const esInvitadoExterno = selectedParticipante === OTRO_INVITADO_VALUE

  const confirmarParticipacion = async () => {
    setErrorFlujo('')
    setMensajeFlujo('')

    const eventoId = parseInt(id, 10)
    if (!eventoId) {
      setErrorFlujo('No se pudo identificar el evento.')
      return
    }

    if (!selectedParticipante) {
      setErrorFlujo('Debes seleccionar un alumno o la opcion de invitado externo.')
      return
    }

    const nombreManual = nombreParticipante.trim()
    if (esInvitadoExterno && !nombreManual) {
      setErrorFlujo('Debes ingresar un nombre para invitado externo.')
      return
    }

    setConfirmandoParticipacion(true)

    const payloadBase = {
      evento_id: eventoId,
      estado: 'pendiente'
    }

    let payload = payloadBase
    if (esInvitadoExterno) {
      payload = {
        ...payloadBase,
        nombre_participante: nombreManual
      }
    } else {
      payload = {
        ...payloadBase,
        alumno_id: parseInt(selectedParticipante, 10)
      }
    }

    const { data, error: insertError } = await supabase
      .from('participantes')
      .insert(payload)
      .select('*')
      .single()

    setConfirmandoParticipacion(false)

    if (insertError) {
      console.error('Error confirmando participacion:', insertError)
      setErrorFlujo('No se pudo confirmar tu participacion. Intenta nuevamente.')
      return
    }

    const nuevoParticipante = {
      ...data,
      alumnoNombre:
        data.nombre_participante ||
        alumnosDisponibles.find((alumno) => alumno.id === data.alumno_id)?.nombre ||
        'Sin nombre'
    }

    const participanteIdCreado = data.id

    setMiParticipacion({ ...nuevoParticipante, id: participanteIdCreado })
    setParticipantes((prev) => [nuevoParticipante, ...prev])
    if (esInvitadoExterno) {
      setNombreParticipante(nombreManual)
    } else {
      setNombreParticipante('')
    }
    window.localStorage.setItem(localStorageKey, String(participanteIdCreado))
    setMensajeFlujo('Tu participacion fue confirmada con estado pendiente.')
  }

  const subirComprobante = async () => {
    setErrorFlujo('')
    setMensajeFlujo('')

    const participanteId = miParticipacion?.id ?? parseInt(window.localStorage.getItem(localStorageKey) || '0', 10)

    if (!participanteId) {
      setErrorFlujo('Primero debes confirmar tu participacion.')
      return
    }

    if (!comprobanteFile) {
      setErrorFlujo('Selecciona una imagen para subir tu comprobante.')
      return
    }

    if (!comprobanteFile.type.startsWith('image/')) {
      setErrorFlujo('El archivo debe ser una imagen.')
      return
    }

    const extension = comprobanteFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const nombreArchivo = `${id}/participante_${participanteId}_${Date.now()}.${extension}`

    setSubiendoComprobante(true)

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(nombreArchivo, comprobanteFile, { upsert: true })

    if (uploadError) {
      console.error('Error subiendo comprobante:', uploadError)
      setSubiendoComprobante(false)
      setErrorFlujo('No se pudo subir el comprobante. Verifica que exista el bucket "comprobantes".')
      return
    }

    const { data: publicUrlData } = supabase.storage.from(storageBucket).getPublicUrl(nombreArchivo)
    const urlComprobante = publicUrlData?.publicUrl || ''

    if (import.meta.env.DEV) {
      console.log('Subiendo comprobante para participante:', {
        participanteId,
        eventoId: id,
        urlComprobante
      })
    }

    const { data: participanteActualizado, error: updateError } = await supabase
      .from('participantes')
      .update({ imagen_comprobante: urlComprobante, estado: 'comprobante_subido' })
      .eq('id', participanteId)
      .select('*')
      .single()

    setSubiendoComprobante(false)

    if (updateError) {
      console.error('Error guardando URL de comprobante:', updateError)
      setErrorFlujo('No se pudo guardar el comprobante en participantes. Verifica columnas y permisos.')
      return
    }

    const participanteConComprobante = {
      ...participanteActualizado,
      alumnoNombre: participanteActualizado.nombre_participante || miParticipacion.alumnoNombre || 'Sin nombre'
    }

    setMiParticipacion(participanteConComprobante)
    setParticipantes((prev) =>
      prev.map((p) => (p.id === participanteConComprobante.id ? participanteConComprobante : p))
    )
    setComprobanteFile(null)
    setMensajeFlujo('Comprobante subido exitosamente.')
  }

  const resetearParticipacionLocal = () => {
    setMiParticipacion(null)
    setSelectedParticipante('')
    setNombreParticipante('')
    setComprobanteFile(null)
    setErrorFlujo('')
    setMensajeFlujo('Puedes registrar la participacion de otro apoderado.')
    window.localStorage.removeItem(localStorageKey)
  }

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate('/mis-eventos')}>
        ← Volver
      </button>

      <h1 className="page-title">Detalle del Evento</h1>

      {loading && <p style={{ marginTop: '1.5rem' }}>Cargando detalle...</p>}

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

      {!loading && !error && evento && (
        <>
          <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
            <h3 className="upcoming-title">Informacion del Evento</h3>
            <div className="event-item">
              <div className="event-details">Fecha: {formatFecha(fechaEvento)}</div>
              <div className="event-details">
                Descripcion: {evento.descripcion_regalo || evento.descripcion || 'Sin descripcion'}
              </div>
              <div className="event-details">Cuota minima: {cuotaMin}</div>
              <div className="event-details">Cuota maxima: {cuotaMax}</div>
              <div className="event-details">Estado: {estadoEvento}</div>
            </div>
          </div>

          <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
            <h3 className="upcoming-title">Participacion de Apoderados</h3>
            <div className="event-item">
              {!miParticipacion && (
                <div className="participacion-form">
                  <label htmlFor="alumnoParticipante" className="participacion-label">
                    Selecciona alumno participante
                  </label>
                  <select
                    id="alumnoParticipante"
                    className="participacion-input"
                    value={selectedParticipante}
                    onChange={(e) => {
                      setSelectedParticipante(e.target.value)
                      if (e.target.value !== OTRO_INVITADO_VALUE) {
                        setNombreParticipante('')
                      }
                    }}
                  >
                    <option value="">Selecciona una opcion</option>
                    {alumnosDisponibles.map((alumno) => (
                      <option key={alumno.id} value={String(alumno.id)}>
                        {alumno.nombre}
                      </option>
                    ))}
                    <option value={OTRO_INVITADO_VALUE}>Otro (invitado externo)</option>
                  </select>

                  {esInvitadoExterno && (
                    <>
                      <label htmlFor="nombreParticipante" className="participacion-label">
                        Nombre invitado externo
                      </label>
                      <input
                        id="nombreParticipante"
                        type="text"
                        className="participacion-input"
                        placeholder="Ej: Maria Gonzalez"
                        value={nombreParticipante}
                        onChange={(e) => setNombreParticipante(e.target.value)}
                      />
                    </>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={confirmarParticipacion}
                    disabled={confirmandoParticipacion}
                  >
                    {confirmandoParticipacion ? 'Confirmando...' : 'Confirmar mi participacion'}
                  </button>
                </div>
              )}

              {miParticipacion && (
                <div className="participacion-ok">
                  <div className="event-name">Participacion confirmada</div>
                  <div className="event-details">
                    Nombre: {miParticipacion.nombre_participante || miParticipacion.alumnoNombre || nombreParticipante}
                  </div>
                  <div className="event-details">Estado: {miParticipacion.estado || 'pendiente'}</div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={resetearParticipacionLocal}
                  >
                    Soy otro apoderado
                  </button>

                  <div className="pago-datos-card">
                    <div className="pago-datos-title">Datos de pago del coordinador</div>
                    <div className="event-details">Banco: {evento.banco || 'No definido'}</div>
                    <div className="event-details">
                      Tipo de cuenta: {evento.tipo_cuenta || evento.tipoCuenta || 'No definido'}
                    </div>
                    <div className="event-details">
                      Numero de cuenta: {evento.numero_cuenta || evento.numeroCuenta || 'No definido'}
                    </div>
                    <div className="event-details">Email: {evento.email_pago || evento.email || 'No definido'}</div>
                  </div>

                  <div className="comprobante-box">
                    <label htmlFor="comprobanteFile" className="participacion-label">
                      Sube una imagen de tu comprobante
                    </label>
                    <input
                      id="comprobanteFile"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={subirComprobante}
                      disabled={subiendoComprobante}
                    >
                      {subiendoComprobante ? 'Subiendo...' : 'Subir comprobante'}
                    </button>
                    {(miParticipacion.imagen_comprobante || miParticipacion.comprobante_url) && (
                      <a
                        href={miParticipacion.imagen_comprobante || miParticipacion.comprobante_url}
                        target="_blank"
                        rel="noreferrer"
                        className="comprobante-link"
                      >
                        Ver comprobante subido
                      </a>
                    )}
                  </div>
                </div>
              )}

              {mensajeFlujo && <p className="mensaje-ok">{mensajeFlujo}</p>}
              {errorFlujo && <p className="mensaje-error">{errorFlujo}</p>}
            </div>
          </div>

          <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
            <h3 className="upcoming-title">Participantes y Estado de Pago</h3>
            {participantes.length === 0 ? (
              <p style={{ margin: 0 }}>No hay participantes registrados todavia.</p>
            ) : (
              <div className="events-list">
                {participantes.map((participante, index) => (
                  <div key={participante.id ?? index} className="event-item">
                    <div className="event-name">
                      {participante.nombre_participante || participante.alumnoNombre || 'Sin nombre'}
                    </div>
                    <div className="event-details">Estado de pago: {formatEstadoPago(participante)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default DetalleEvento
