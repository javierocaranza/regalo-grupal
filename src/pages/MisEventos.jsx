import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import './pages.css'

function MisEventos() {
  const navigate = useNavigate()
  const rolIngreso = window.localStorage.getItem('rol_ingreso_activo') || ''
  const cursoIdActivo = window.localStorage.getItem('curso_id_activo') || ''
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const normalizeCumpleaneros = (evento) => {
    if (Array.isArray(evento.cumpleaneros) && evento.cumpleaneros.length > 0) {
      const nombres = evento.cumpleaneros
        .map((rel) => rel?.alumnos?.nombre)
        .filter(Boolean)
      if (nombres.length > 0) return nombres.join(', ')
    }

    const fallback =
      evento.nombres_cumpleaneros ??
      evento.nombresCumpleaneros ??
      evento.cumpleanero ??
      evento.cumpleañero ??
      evento.nombre_cumpleanero

    if (Array.isArray(fallback)) return fallback.join(', ')
    if (typeof fallback === 'string') return fallback
    return 'Sin cumpleañeros'
  }

  const normalizeFecha = (evento) => {
    return evento.fecha_evento ?? evento.fechaEvento ?? evento.fecha ?? null
  }

  const normalizeCuotaMin = (evento) => {
    return evento.cuota_minima ?? evento.cuotaMinima ?? evento.cuota_min ?? null
  }

  const normalizeCuotaMax = (evento) => {
    return evento.cuota_maxima ?? evento.cuotaMaxima ?? evento.cuota_max ?? null
  }

  const normalizeEstado = (evento) => {
    const raw = (evento.estado ?? '').toString().toLowerCase()
    if (raw === 'cerrado' || raw === 'closed') return 'Cerrado'
    return 'Activo'
  }

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

  useEffect(() => {
    const cargarEventos = async () => {
      setLoading(true)
      setError('')

      const { data, error: supabaseError } = await supabase
        .from('eventos')
        .select('')
        .order('fecha_evento', { ascending: true })

      if (supabaseError) {
        console.error('Error cargando eventos:', supabaseError)
        setError('No se pudieron cargar los eventos.')
        setEventos([])
        setLoading(false)
        return
      }

      const eventosBase = data || []

      const eventosConCumpleaneros = await Promise.all(
        eventosBase.map(async (evento) => {
          const { data: cumpleanerosData } = await supabase
            .from('cumpleaneros')
            .select('alumno_id, alumnos(nombre)')
            .eq('evento_id', evento.id)
          return { ...evento, cumpleaneros: cumpleanerosData || [] }
        })
      )

      setEventos(eventosConCumpleaneros)
      setLoading(false)
    }

    cargarEventos()
  }, [])

  const eventosOrdenados = useMemo(() => {
    return [...eventos].sort((a, b) => {
      const fechaA = normalizeFecha(a)
      const fechaB = normalizeFecha(b)

      if (!fechaA && !fechaB) return 0
      if (!fechaA) return 1
      if (!fechaB) return -1

      return new Date(`${fechaA}T00:00:00`) - new Date(`${fechaB}T00:00:00`)
    })
  }, [eventos])

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => {
        const params = new URLSearchParams()
        if (rolIngreso) params.append('rol', rolIngreso)
        if (cursoIdActivo) params.append('cursoId', cursoIdActivo)
        const query = params.toString()
        navigate(`/${query ? '?' + query : ''}`)
      }}>
        ← Volver
      </button>

      <h1 className="page-title">Mis Eventos</h1>
      <p>Revisa todos los eventos guardados de tu curso.</p>

      {loading && <p style={{ marginTop: '1.5rem' }}>Cargando eventos...</p>}

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

      {!loading && !error && eventosOrdenados.length === 0 && (
        <div className="upcoming-events" style={{ marginTop: '2rem' }}>
          <h3 className="upcoming-title">Eventos</h3>
          <p style={{ margin: 0 }}>Todavia no tienes eventos guardados.</p>
        </div>
      )}

      {!loading && !error && eventosOrdenados.length > 0 && (
        <div className="upcoming-events" style={{ marginTop: '2rem' }}>
          <h3 className="upcoming-title">Eventos Guardados</h3>
          <div className="events-list">
            {eventosOrdenados.map((evento) => {
              const fecha = normalizeFecha(evento)
              const cuotaMin = normalizeCuotaMin(evento)
              const cuotaMax = normalizeCuotaMax(evento)

              return (
                <div key={evento.id} className="event-item">
                  <div className="event-name">{normalizeCumpleaneros(evento)}</div>
                  <div className="event-details">Fecha: {formatFecha(fecha)}</div>
                  <div className="event-details">
                    Cuota: {cuotaMin ?? '-'} - {cuotaMax ?? '-'}
                  </div>
                  <div className="event-details">Estado: {normalizeEstado(evento)}</div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        const adminParam = rolIngreso === 'coordinador' ? '?admin=true' : ''
                        navigate(`/evento/${evento.id}${adminParam}`)
                      }}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default MisEventos
