import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import PageTopBar from './PageTopBar.jsx'
import './pages.css'

function MisEventos() {
  const navigate = useNavigate()
  const rolIngreso = window.localStorage.getItem('rol_ingreso_activo') || ''
  const cursoIdActivo = window.localStorage.getItem('curso_id_activo') || ''
  const [cursoNombreActivo, setCursoNombreActivo] = useState('Mi curso')
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

  const normalizeCuotaDefinida = (evento) => {
    return evento.cuota_definida ?? evento.cuotaDefinida ?? null
  }

  const normalizeEstado = (evento) => {
    return evento.estado ?? evento.estadoEvento ?? 'Activo'
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

  const formatMonedaClp = (monto) => {
    const montoNumero = Number(monto)
    if (!Number.isFinite(montoNumero)) return '-'
    return `$${montoNumero.toLocaleString('es-CL')}`
  }

  useEffect(() => {
    const cargarCursoActivo = async () => {
      const cursoIdNumero = cursoIdActivo ? parseInt(cursoIdActivo, 10) : null
      if (!cursoIdNumero) {
        setCursoNombreActivo('Mi curso')
        return
      }

      const { data, error: cursoError } = await supabase
        .from('cursos')
        .select('nombre, anio')
        .eq('id', cursoIdNumero)
        .single()

      if (cursoError || !data) {
        setCursoNombreActivo(`Curso ${cursoIdNumero}`)
        return
      }

      const nombre = data.nombre || `Curso ${cursoIdNumero}`
      const anio = data.anio ? ` - ${data.anio}` : ''
      setCursoNombreActivo(`${nombre}${anio}`)
    }

    cargarCursoActivo()
  }, [cursoIdActivo])

  useEffect(() => {
    const cargarEventos = async () => {
      setLoading(true)
      setError('')

      const cursoIdNumero = cursoIdActivo ? parseInt(cursoIdActivo, 10) : null
      if (!cursoIdNumero) {
        setEventos([])
        setLoading(false)
        return
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
          console.error('Error cargando alumnos para filtrar eventos:', alumnosFallbackError)
          setError('No se pudieron cargar los eventos del curso.')
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
        .select('')
        .order('fecha_evento', { ascending: true })

      if (eventosError) {
        console.error('Error cargando eventos:', eventosError)
        setError('No se pudieron cargar los eventos.')
        setEventos([])
        setLoading(false)
        return
      }

      const eventosConCumpleaneros = await Promise.all(
        (eventosData || []).map(async (evento) => {
          const { data: cumpleanerosData, error: cumpleanerosError } = await supabase
            .from('cumpleaneros')
            .select('alumno_id, alumnos(nombre)')
            .eq('evento_id', evento.id)

          const { data: participantesData, error: participantesError } = await supabase
            .from('participantes')
            .select('cuota')
            .eq('evento_id', evento.id)
            .gt('cuota', 0)
            .limit(1)

          const { count: participantesPagadosCount, error: participantesPagadosError } = await supabase
            .from('participantes')
            .select('id', { count: 'exact', head: true })
            .eq('evento_id', evento.id)
            .eq('estado', 'pagado')

          if (cumpleanerosError) {
            console.error('Error cargando cumpleañeros del evento:', cumpleanerosError)
          }

          if (participantesError) {
            console.error('Error cargando cuota definida del evento:', participantesError)
          }

          if (participantesPagadosError) {
            console.error('Error cargando participantes pagados del evento:', participantesPagadosError)
          }

          const cumpleaneros = cumpleanerosData || []
          const cuotaDefinida = Number(participantesData?.[0]?.cuota) || null
          const pertenecePorCursoId = Number(evento.curso_id) === cursoIdNumero
          const pertenecePorCumpleaneros = cumpleaneros.some((row) => alumnoIdsCurso.has(Number(row.alumno_id)))

          if (!pertenecePorCursoId && !pertenecePorCumpleaneros) {
            return null
          }

          return {
            ...evento,
            cumpleaneros,
            cuotaDefinida,
            participantesPagados: participantesPagadosCount || 0
          }
        })
      )

      const eventosFiltrados = eventosConCumpleaneros.filter(Boolean)

      if (rolIngreso !== 'apoderado') {
        setEventos(eventosFiltrados)
        setLoading(false)
        return
      }

      const alumnoApoderadoIdRaw = window.localStorage.getItem('alumno_apoderado_id_activo') || ''
      let generoAlumno = null

      if (alumnoApoderadoIdRaw) {
        const alumnoApoderadoIdNumero = parseInt(alumnoApoderadoIdRaw, 10)
        if (alumnoApoderadoIdNumero) {
          const { data: alumnoData } = await supabase
            .from('alumnos')
            .select('genero')
            .eq('id', alumnoApoderadoIdNumero)
            .single()
          generoAlumno = alumnoData?.genero ?? null
        }
      }

      const eventosPorGenero = generoAlumno === null
        ? eventosFiltrados
        : eventosFiltrados.filter((evento) => {
            const invitados = evento.invitados ?? 'todos'
            if (invitados === 'todos') return true
            if (invitados === 'niñas') return generoAlumno === 'niña'
            if (invitados === 'niños') return generoAlumno === 'niño'
            return true
          })

      setEventos(eventosPorGenero)
      setLoading(false)
    }

    cargarEventos()
  }, [cursoIdActivo, rolIngreso])

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
      <PageTopBar />

      <h1 className="page-title">{rolIngreso === 'apoderado' ? 'Invitaciones' : 'Mis Cumpleaños'}</h1>
      <p>Revisa todos los cumpleaños guardados de tu curso.</p>
      <div style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            navigate('/historial-eventos', {
              state: {
                cursoId: cursoIdActivo,
                cursoNombre: cursoNombreActivo
              }
            })
          }}
        >
          Ver todos los cumpleaños
        </button>
      </div>

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
          <h3 className="upcoming-title">Cumpleaños</h3>
          <p style={{ margin: 0 }}>Todavia no tienes cumpleaños guardados.</p>
        </div>
      )}

      {!loading && !error && eventosOrdenados.length > 0 && (
        <div className="upcoming-events" style={{ marginTop: '2rem' }}>
          <h3 className="upcoming-title">Cumpleaños Guardados</h3>
          <div className="events-list">
            {eventosOrdenados.map((evento) => {
              const fecha = normalizeFecha(evento)
              const cuotaMin = normalizeCuotaMin(evento)
              const cuotaMax = normalizeCuotaMax(evento)
              const cuotaDefinida = normalizeCuotaDefinida(evento)
              const estado = normalizeEstado(evento)
              const esCompletado = String(estado).toLowerCase() === 'completado'

              return (
                <div key={evento.id} className="event-item">
                  <div className="event-name">{normalizeCumpleaneros(evento)}</div>
                  <div className="event-details">Fecha: {formatFecha(fecha)}</div>
                  {esCompletado ? (
                    <>
                      <div className="event-details">Monto total del regalo: {formatMonedaClp(evento.monto_total)}</div>
                      <div className="event-details">Numero de participantes: {evento.participantesPagados ?? 0}</div>
                      <div className="event-details">Cuota por persona: {formatMonedaClp(cuotaDefinida)}</div>
                    </>
                  ) : (
                    <div className="event-details">
                      Cuota: {cuotaDefinida ? `$${cuotaDefinida.toLocaleString('es-CL')}` : `${cuotaMin ?? '-'} - ${cuotaMax ?? '-'}`}
                    </div>
                  )}
                  <div className="event-details">Estado: {estado}</div>
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
