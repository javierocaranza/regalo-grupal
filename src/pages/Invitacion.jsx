import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase.js'
import './pages.css'

function Invitacion() {
  const { tokenInvitacion } = useParams()
  const [evento, setEvento] = useState(null)
  const [linkInvalido, setLinkInvalido] = useState(false)
  const [loading, setLoading] = useState(true)
  const [nombreInvitado, setNombreInvitado] = useState('')
  const [nombreApoderado, setNombreApoderado] = useState('')
  const [email, setEmail] = useState('')
  const [tipoParticipacion, setTipoParticipacion] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const buscarEvento = async () => {
      setLoading(true)
      console.log('Buscando evento con token_invitacion:', tokenInvitacion)
      const { data, error: fetchError } = await supabase
        .from('eventos')
        .select('*')
        .eq('token_invitacion', tokenInvitacion)
        .single()

      console.log('Resultado Supabase:', { data, error: fetchError })
      setLoading(false)

      if (fetchError || !data) {
        setLinkInvalido(true)
        return
      }

      setEvento(data)
    }

    buscarEvento()
  }, [tokenInvitacion])

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

  const confirmarAsistencia = async (tipo) => {
    setError('')
    if (!nombreInvitado.trim()) {
      setError('El nombre del invitado es obligatorio.')
      return
    }
    if (!nombreApoderado.trim()) {
      setError('El nombre del apoderado es obligatorio.')
      return
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

    const { error: insertError } = await supabase
      .from('invitados_externos')
      .insert(payload)

    setConfirmando('')

    if (insertError) {
      console.error('Error confirmando asistencia:', insertError)
      setError('No se pudo confirmar la asistencia. Intenta nuevamente.')
      return
    }

    setTipoParticipacion(tipo)
    setConfirmado(true)
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
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f8d7da',
            color: '#721c24',
            borderRadius: '8px',
            border: '1px solid #f5c6cb'
          }}
        >
          Link inválido. Este enlace de invitación no existe o ya no está disponible.
        </div>
      </div>
    )
  }

  if (confirmado) {
    return (
      <div className="page-container">
        <h1 className="page-title">¡Asistencia confirmada!</h1>
        <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
          <div className="event-item">
            <div className="event-name">
              🎉 ¡Gracias {nombreInvitado}!
            </div>
            <div className="event-details">
              Tu asistencia al cumpleaños de {evento.nombres_cumpleaneros || 'el/la cumpleañero/a'} fue confirmada.
            </div>
            <div className="event-details">
              Tipo: {tipoParticipacion === 'regalo_y_cumple' ? 'Regalo y cumpleaños 🎁' : 'Solo cumpleaños 🎂'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Invitación al Cumpleaños</h1>

      <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
        <h3 className="upcoming-title">Información del Evento</h3>
        <div className="event-item">
          <div className="event-name">
            🎂 {evento.nombres_cumpleaneros || 'Cumpleaños del curso'}
          </div>
          <div className="event-details">
            Fecha: {formatFecha(evento.fecha_evento)}
          </div>
        </div>
      </div>

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

            {error && (
              <p className="mensaje-error" style={{ marginTop: '0.75rem' }}>{error}</p>
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
    </div>
  )
}

export default Invitacion
