import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase.js'
import './pages.css'

function DetalleEvento() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [evento, setEvento] = useState(null)
  const [participantes, setParticipantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

      const { data: participantesData, error: participantesError } = await supabase
        .from('participantes')
        .select('')
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
      }

      setLoading(false)
    }

    cargarDetalle()
  }, [id])

  const fechaEvento = evento?.fecha_evento ?? evento?.fechaEvento ?? evento?.fecha ?? null

  const cuotaMin = evento?.cuota_minima ?? evento?.cuotaMinima ?? evento?.cuota_min ?? '-'
  const cuotaMax = evento?.cuota_maxima ?? evento?.cuotaMaxima ?? evento?.cuota_max ?? '-'
  const estadoEvento = evento?.estado ?? 'Activo'

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
            <h3 className="upcoming-title">Datos de Pago del Coordinador</h3>
            <div className="event-item">
              <div className="event-details">Banco: {evento.banco || 'No definido'}</div>
              <div className="event-details">
                Tipo de cuenta: {evento.tipo_cuenta || evento.tipoCuenta || 'No definido'}
              </div>
              <div className="event-details">
                Numero de cuenta: {evento.numero_cuenta || evento.numeroCuenta || 'No definido'}
              </div>
              <div className="event-details">Email: {evento.email_pago || evento.email || 'No definido'}</div>
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
                    <div className="event-name">{participante.alumnoNombre || 'Sin nombre'}</div>
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
