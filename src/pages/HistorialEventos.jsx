import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase, getCursoToken } from '../supabase.js'
import PageTopBar from './PageTopBar.jsx'
import './pages.css'

function HistorialEventos() {
  const navigate = useNavigate()
  const location = useLocation()
  const cursoId = location.state?.cursoId || window.localStorage.getItem('curso_id_activo') || ''
  const cursoNombreState = location.state?.cursoNombre || ''
  const [cursoNombre, setCursoNombre] = useState(cursoNombreState || 'Mi curso')
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const formatFecha = (fechaIso) => {
    if (!fechaIso) return 'Sin fecha'
    const date = new Date(`${fechaIso}T00:00:00`)
    if (Number.isNaN(date.getTime())) return fechaIso
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const getFirstMediaUrl = (value) => {
    if (!value) return ''
    if (Array.isArray(value)) return String(value[0] || '')

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return ''

      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return String(parsed[0] || '')
          }
        } catch {
          return trimmed
        }
      }

      if (trimmed.includes(',')) {
        return trimmed.split(',')[0].trim()
      }

      return trimmed
    }

    return ''
  }

  useEffect(() => {
    const verificarToken = async () => {
      const tokenLocal = getCursoToken()
      if (!tokenLocal || !cursoId) {
        navigate('/')
        return
      }
      const { data, error } = await supabase
        .from('cursos')
        .select('token')
        .eq('id', cursoId)
        .single()
      if (error || !data || data.token !== tokenLocal) {
        navigate('/')
      }
    }
    verificarToken()
  }, [])

  useEffect(() => {
    if (!cursoId) {
      navigate('/')
      return
    }

    const cargarHistorial = async () => {
      setLoading(true)
      setError('')

      const cursoIdNumero = parseInt(cursoId, 10)
      if (!cursoIdNumero) {
        navigate('/')
        return
      }

      if (!cursoNombreState) {
        const { data: cursoData } = await supabase
          .from('cursos')
          .select('nombre, anio')
          .eq('id', cursoIdNumero)
          .single()

        if (cursoData) {
          const anio = cursoData.anio ? ` - ${cursoData.anio}` : ''
          setCursoNombre(`${cursoData.nombre}${anio}`)
        }
      }

      let alumnosCurso = []
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('id, curso_id')
        .eq('curso_id', cursoIdNumero)

      if (alumnosError) {
        console.warn('No se pudo filtrar alumnos por curso_id, usando fallback:', alumnosError)
        const { data: alumnosFallbackData, error: alumnosFallbackError } = await supabase
          .from('alumnos')
          .select('id, curso_id')

        if (alumnosFallbackError) {
          console.error('Error cargando alumnos del curso:', alumnosFallbackError)
          setError('No se pudo cargar el historial de cumpleaños.')
          setEventos([])
          setLoading(false)
          return
        }

        alumnosCurso = (alumnosFallbackData || []).filter((row) => Number(row.curso_id) === cursoIdNumero)
      } else {
        alumnosCurso = alumnosData || []
      }

      const alumnoIdsCurso = new Set(alumnosCurso.map((row) => Number(row.id)))

      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('id, curso_id, fecha_evento, descripcion_regalo, monto_total, estado, fotos_regalo, fotos_boletas')
        .order('fecha_evento', { ascending: false })

      if (eventosError) {
        console.error('Error cargando historial de eventos:', eventosError)
        setError('No se pudo cargar el historial de eventos.')
        setEventos([])
        setLoading(false)
        return
      }

      const eventosBase = eventosData || []
      if (eventosBase.length === 0) {
        setEventos([])
        setLoading(false)
        return
      }

      const eventoIdsBase = eventosBase.map((e) => e.id)

      const { data: cumpleanerosData, error: cumpleanerosError } = await supabase
        .from('cumpleaneros')
        .select('evento_id, alumno_id')
        .in('evento_id', eventoIdsBase)

      if (cumpleanerosError) {
        console.error('Error cargando cumpleañeros:', cumpleanerosError)
      }

      const cumpleanerosRowsPorEvento = {}
      for (const row of cumpleanerosData || []) {
        if (!cumpleanerosRowsPorEvento[row.evento_id]) {
          cumpleanerosRowsPorEvento[row.evento_id] = []
        }
        cumpleanerosRowsPorEvento[row.evento_id].push(row)
      }

      const eventosCurso = eventosBase.filter((evento) => {
        const cumpleRows = cumpleanerosRowsPorEvento[evento.id] || []
        const pertenecePorCursoId = Number(evento.curso_id) === cursoIdNumero
        const pertenecePorCumpleaneros = cumpleRows.some((row) => alumnoIdsCurso.has(Number(row.alumno_id)))
        return pertenecePorCursoId || pertenecePorCumpleaneros
      })

      if (eventosCurso.length === 0) {
        setEventos([])
        setLoading(false)
        return
      }

      const eventoIds = eventosCurso.map((e) => e.id)

      const alumnoIdsCumple = [...new Set((cumpleanerosData || []).map((row) => row.alumno_id).filter(Boolean))]
      const alumnosMap = {}

      if (alumnoIdsCumple.length > 0) {
        const { data: alumnosData, error: alumnosError } = await supabase
          .from('alumnos')
          .select('id, nombre')
          .in('id', alumnoIdsCumple)

        if (alumnosError) {
          console.error('Error cargando nombres de alumnos:', alumnosError)
        } else {
          for (const alumno of alumnosData || []) {
            alumnosMap[alumno.id] = alumno.nombre
          }
        }
      }

      const cumpleanerosPorEvento = {}
      for (const row of cumpleanerosData || []) {
        if (!cumpleanerosPorEvento[row.evento_id]) {
          cumpleanerosPorEvento[row.evento_id] = []
        }
        const nombre = alumnosMap[row.alumno_id] || 'Sin nombre'
        cumpleanerosPorEvento[row.evento_id].push(nombre)
      }

      const { data: cuotasData, error: cuotasError } = await supabase
        .from('participantes')
        .select('evento_id, cuota')
        .in('evento_id', eventoIds)
        .gt('cuota', 0)

      if (cuotasError) {
        console.error('Error cargando cuotas por evento:', cuotasError)
      }

      const cuotaPorEvento = {}
      for (const row of cuotasData || []) {
        if (!cuotaPorEvento[row.evento_id]) {
          cuotaPorEvento[row.evento_id] = Number(row.cuota) || 0
        }
      }

      const alumnoActivoRaw =
        window.localStorage.getItem('alumno_id_activo') ||
        window.localStorage.getItem('alumno_apoderado_id_activo') ||
        ''
      const alumnoActivoId = parseInt(alumnoActivoRaw, 10)
      const participoPorEvento = {}

      if (alumnoActivoId) {
        const { data: participacionesData, error: participacionesError } = await supabase
          .from('participantes')
          .select('evento_id')
          .eq('alumno_id', alumnoActivoId)
          .in('evento_id', eventoIds)

        if (participacionesError) {
          console.error('Error validando participacion del apoderado:', participacionesError)
        } else {
          for (const row of participacionesData || []) {
            participoPorEvento[row.evento_id] = true
          }
        }
      }

      const resultado = eventosCurso.map((evento) => ({
        ...evento,
        cumpleanerosTexto: (cumpleanerosPorEvento[evento.id] || []).join(', ') || 'Sin cumpleañeros',
        cuotaDefinida: cuotaPorEvento[evento.id] || 0,
        participe: Boolean(participoPorEvento[evento.id]),
        fotoRegaloUrl: getFirstMediaUrl(evento.fotos_regalo),
        fotoBoletaUrl: getFirstMediaUrl(evento.fotos_boletas)
      }))

      setEventos(resultado)
      setLoading(false)
    }

    cargarHistorial()
  }, [cursoId, cursoNombreState, navigate])

  return (
    <div className="page-container">
      <PageTopBar />

      <div style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.9rem' }}
        >
          ← Volver
        </button>
      </div>

      <h1 className="page-title" style={{ marginTop: '1rem' }}>Historial de cumpleaños</h1>
      <p>{cursoNombre || 'Mi curso'}</p>

      {loading && <p style={{ marginTop: '1.5rem' }}>Cargando historial...</p>}

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

      {!loading && !error && eventos.length === 0 && (
        <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
          <h3 className="upcoming-title">Cumpleaños</h3>
          <p style={{ margin: 0 }}>No hay cumpleaños en el historial de este curso.</p>
        </div>
      )}

      {!loading && !error && eventos.length > 0 && (
        <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
          <h3 className="upcoming-title">Cumpleaños</h3>
          <div className="events-list">
            {eventos.map((evento) => (
              <div key={evento.id} className="event-item">
                <div className="event-name">{evento.cumpleanerosTexto}</div>
                <div className="event-details">Fecha: {formatFecha(evento.fecha_evento)}</div>
                <div className="event-details">Descripcion: {evento.descripcion_regalo || 'Sin descripcion'}</div>
                <div className="event-details">
                  Monto total: {evento.monto_total ? `$${Number(evento.monto_total).toLocaleString('es-CL')}` : 'Sin definir'}
                </div>
                <div className="event-details">
                  Cuota: {evento.cuotaDefinida > 0 ? `$${evento.cuotaDefinida.toLocaleString('es-CL')}` : 'Sin definir'}
                </div>
                <div className="event-details">Estado: {evento.estado || 'Sin estado'}</div>

                <div style={{ marginTop: '0.55rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '999px',
                      padding: '0.2rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: evento.participe ? '#0f5132' : '#664d03',
                      background: evento.participe ? '#d1e7dd' : '#fff3cd',
                      border: evento.participe ? '1px solid #badbcc' : '1px solid #ffe69c'
                    }}
                  >
                    {evento.participe ? 'Participé ✓' : 'No participé'}
                  </span>
                </div>

                {(evento.fotoRegaloUrl || evento.fotoBoletaUrl) && (
                  <div style={{ marginTop: '0.65rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {evento.fotoRegaloUrl && (
                      <a href={evento.fotoRegaloUrl} target="_blank" rel="noreferrer" className="event-details" style={{ color: '#1f6feb', textDecoration: 'underline' }}>
                        Ver foto del regalo
                      </a>
                    )}
                    {evento.fotoBoletaUrl && (
                      <a href={evento.fotoBoletaUrl} target="_blank" rel="noreferrer" className="event-details" style={{ color: '#1f6feb', textDecoration: 'underline' }}>
                        Ver boleta
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default HistorialEventos
