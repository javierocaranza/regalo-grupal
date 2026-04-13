import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase.js'
import PageTopBar from './PageTopBar.jsx'
import './pages.css'

function Acusete() {
  const navigate = useNavigate()
  const location = useLocation()
  const cursoId = location.state?.cursoId || localStorage.getItem('curso_id_activo')
  const [cursoNombre, setCursoNombre] = useState('Mi curso')
  const [vista, setVista] = useState('alumno')
  const [resumenAlumnos, setResumenAlumnos] = useState([])
  const [resumenEventos, setResumenEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')

    const { data: alumnosCursoData, error: alumnosCursoError } = await supabase
      .from('alumnos')
      .select('id')
      .eq('curso_id', cursoId)

    if (alumnosCursoError) {
      console.error('Error cargando alumnos del curso:', alumnosCursoError)
      setError('No se pudieron cargar los alumnos del curso.')
      setLoading(false)
      return
    }

    const alumnoIdsCurso = (alumnosCursoData || []).map((row) => row.id)

    const { data: eventosCursoData, error: eventosCursoError } = await supabase
      .from('eventos')
      .select('id')
      .eq('curso_id', cursoId)

    if (eventosCursoError) {
      console.error('Error cargando eventos del curso:', eventosCursoError)
      setError('No se pudieron cargar los cumpleaños del curso.')
      setLoading(false)
      return
    }

    const eventoIdsCurso = (eventosCursoData || []).map((row) => row.id)
    const estadosPendientes = ['pendiente', 'comprobante_subido']
    const participantesPorAlumno = []
    const participantesPorEvento = []

    if (alumnoIdsCurso.length > 0) {
      const { data, error: errParticipantesAlumno } = await supabase
        .from('participantes')
        .select('id, alumno_id, cuota, estado, evento_id')
        .in('alumno_id', alumnoIdsCurso)
        .in('estado', estadosPendientes)

      if (errParticipantesAlumno) {
        console.error('Error cargando participantes por alumno:', errParticipantesAlumno)
      } else {
        participantesPorAlumno.push(...(data || []))
      }
    }

    if (eventoIdsCurso.length > 0) {
      const { data, error: errParticipantesEvento } = await supabase
        .from('participantes')
        .select('id, alumno_id, cuota, estado, evento_id')
        .in('evento_id', eventoIdsCurso)
        .in('estado', estadosPendientes)

      if (errParticipantesEvento) {
        console.error('Error cargando participantes por evento:', errParticipantesEvento)
      } else {
        participantesPorEvento.push(...(data || []))
      }
    }

    const participantesMap = {}
    for (const p of [...participantesPorAlumno, ...participantesPorEvento]) {
      participantesMap[p.id] = p
    }
    const participantes = Object.values(participantesMap)

    if (participantes.length === 0) {
      setResumenAlumnos([])
      setResumenEventos([])
      setLoading(false)
      return
    }

    const eventoIds = [...new Set(participantes.map((p) => p.evento_id).filter(Boolean))]
    const { data: eventosData, error: eventosError } = await supabase
      .from('eventos')
      .select('id, descripcion_regalo, fecha_evento')
      .in('id', eventoIds)

    if (eventosError) {
      console.error('Error cargando eventos usados en participantes:', eventosError)
      setError('No se pudieron cargar los cumpleaños relacionados.')
      setLoading(false)
      return
    }

    const alumnoIds = [...new Set(participantes.map((p) => p.alumno_id).filter(Boolean))]
    const alumnosMap = {}

    if (alumnoIds.length > 0) {
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('id, nombre')
        .in('id', alumnoIds)

      if (alumnosError) {
        console.error('Error cargando alumnos:', alumnosError)
      } else {
        for (const alumno of alumnosData || []) {
          alumnosMap[alumno.id] = alumno.nombre
        }
      }
    }

    const eventosMap = {}
    for (const evento of eventosData || []) {
      eventosMap[evento.id] = evento
    }

    // Resumen por alumno
    const porAlumno = {}
    for (const p of participantes) {
      const key = p.alumno_id ?? `ext_${p.id}`
      const nombre = alumnosMap[p.alumno_id] || 'Sin nombre'
      if (!porAlumno[key]) {
        porAlumno[key] = { nombre, total: 0, eventos: [] }
      }
      porAlumno[key].total += Number(p.cuota) || 0
      const eventoInfo = eventosMap[p.evento_id]
      porAlumno[key].eventos.push({
        eventoId: p.evento_id,
        desc: eventoInfo?.descripcion_regalo || `Cumpleaños ${p.evento_id}`,
        cuota: Number(p.cuota) || 0
      })
    }
    const resumenPorAlumno = Object.values(porAlumno).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    )

    // Resumen por evento
    const porEvento = {}
    for (const p of participantes) {
      const eventoId = p.evento_id
      if (!porEvento[eventoId]) {
        const evento = eventosMap[eventoId]
        const desc =
          evento?.descripcion_regalo ||
          `Cumpleaños ${eventoId}`
        const fecha = evento?.fecha_evento || null
        porEvento[eventoId] = { eventoId, desc, fecha, participantes: [] }
      }
      porEvento[eventoId].participantes.push({
        nombre: alumnosMap[p.alumno_id] || 'Sin nombre',
        cuota: Number(p.cuota) || 0,
        estado: p.estado
      })
    }
    const resumenPorEvento = Object.values(porEvento).sort((a, b) => {
      if (!a.fecha && !b.fecha) return 0
      if (!a.fecha) return 1
      if (!b.fecha) return -1
      return new Date(`${a.fecha}T00:00:00`) - new Date(`${b.fecha}T00:00:00`)
    })

    setResumenAlumnos(resumenPorAlumno)
    setResumenEventos(resumenPorEvento)
    setLoading(false)
  }

  useEffect(() => {
    if (!cursoId) {
      navigate('/')
      return
    }

    const init = async () => {
      const { data: cursoData } = await supabase
        .from('cursos')
        .select('nombre, anio')
        .eq('id', cursoId)
        .single()

      if (cursoData) {
        const anio = cursoData.anio ? ` - ${cursoData.anio}` : ''
        setCursoNombre(`${cursoData.nombre}${anio}`)
      }

      fetchData()
    }

    init()
  }, [cursoId])

  const formatFecha = (fechaIso) => {
    if (!fechaIso) return 'Sin fecha'
    const date = new Date(`${fechaIso}T00:00:00`)
    if (Number.isNaN(date.getTime())) return fechaIso
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="page-container">
      <PageTopBar />

      <h1 className="page-title">Acusete 🧾</h1>
      <p>Pagos pendientes de {cursoNombre}.</p>

      <div className="buttons-container" style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setVista('alumno')}
          disabled={vista === 'alumno'}
        >
          Ver por alumno
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setVista('evento')}
          disabled={vista === 'evento'}
        >
          Ver por cumpleaños
        </button>
      </div>

      {loading && <p style={{ marginTop: '1.5rem' }}>Cargando datos...</p>}

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
          {vista === 'alumno' && (
            <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
            <h3 className="upcoming-title">Resumen por alumno</h3>
            {resumenAlumnos.length === 0 ? (
              <p style={{ margin: 0 }}>No hay pagos pendientes.</p>
            ) : (
              <div className="events-list">
                {resumenAlumnos.map((alumno) => (
                  <div key={alumno.nombre} className="event-item">
                    <div className="event-name">{alumno.nombre}</div>
                    <div className="event-details">
                      Total adeudado: <strong>{alumno.total > 0 ? `$${alumno.total.toLocaleString('es-CL')}` : 'cuota por definir'}</strong>
                    </div>
                    {alumno.eventos.map((ev, i) => (
                      <div key={i} className="event-details" style={{ paddingLeft: '0.5rem', borderLeft: '2px solid #ddd', marginTop: '0.25rem' }}>
                        {ev.desc}: {ev.cuota > 0 ? `$${ev.cuota.toLocaleString('es-CL')}` : 'cuota por definir'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {vista === 'evento' && (
            <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
            <h3 className="upcoming-title">Resumen por cumpleaños</h3>
            {resumenEventos.length === 0 ? (
              <p style={{ margin: 0 }}>No hay pagos pendientes.</p>
            ) : (
              <div className="events-list">
                {resumenEventos.map((evento) => (
                  <div key={evento.eventoId} className="event-item">
                    <div className="event-name">{evento.desc}</div>
                    <div className="event-details">Fecha: {formatFecha(evento.fecha)}</div>
                    <div style={{ marginTop: '0.5rem' }}>
                      {evento.participantes.map((p, i) => (
                        <div key={i} className="event-details">
                          {p.nombre} — {p.cuota > 0 ? `$${p.cuota.toLocaleString('es-CL')}` : 'cuota por definir'} ({p.estado})
                        </div>
                      ))}
                      {evento.participantes.some((p) => p.cuota > 0) && (
                        <div className="event-details" style={{ marginTop: '0.25rem', fontWeight: 'bold' }}>
                          Total pendiente: ${evento.participantes.reduce((acc, p) => acc + p.cuota, 0).toLocaleString('es-CL')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Acusete
