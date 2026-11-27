import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { supabase } from '../supabase.js'
import PageTopBar from './PageTopBar.jsx'
import './pages.css'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatFechaCorta(fechaIso) {
  if (!fechaIso) return ''
  const date = new Date(`${fechaIso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getDate()} ${MESES[date.getMonth()]}`
}

function Acusete() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useParams()
  const cursoId = location.state?.cursoId || localStorage.getItem('curso_id_activo')
  const [cursoNombre, setCursoNombre] = useState('Mi curso')
  const [vista, setVista] = useState('alumno')
  const [resumenAlumnos, setResumenAlumnos] = useState([])
  const [resumenEventos, setResumenEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedAlumnos, setExpandedAlumnos] = useState({})
  const [expandedEventos, setExpandedEventos] = useState({})

  const fetchData = async () => {
    setLoading(true)
    setError('')

    const hoy = new Date().toISOString().split('T')[0]

    // Solo eventos pasados, con monto_total definido y no completados
    const { data: eventosCursoData, error: eventosCursoError } = await supabase
      .from('eventos')
      .select('id, fecha_evento')
      .eq('curso_id', cursoId)
      .lt('fecha_evento', hoy)
      .neq('estado', 'completado')
      .not('monto_total', 'is', null)

    if (eventosCursoError) {
      console.error('Error cargando eventos del curso:', eventosCursoError)
      setError('No se pudieron cargar los cumpleaños del curso.')
      setLoading(false)
      return
    }

    const eventoIdsCurso = (eventosCursoData || []).map((row) => row.id)

    if (eventoIdsCurso.length === 0) {
      setResumenAlumnos([])
      setResumenEventos([])
      setLoading(false)
      return
    }

    const eventosMap = {}
    for (const evento of eventosCursoData) {
      eventosMap[evento.id] = evento
    }

    const estadosPendientes = ['pendiente', 'comprobante_subido']
    const { data: participantesData, error: participantesError } = await supabase
      .from('participantes')
      .select('id, alumno_id, cuota, estado, evento_id')
      .in('evento_id', eventoIdsCurso)
      .in('estado', estadosPendientes)
      .eq('participa_regalo', true)
      .not('cuota', 'is', null)

    if (participantesError) {
      console.error('Error cargando participantes:', participantesError)
      setError('No se pudieron cargar los participantes.')
      setLoading(false)
      return
    }

    const participantes = (participantesData || []).filter((p) => Number(p.cuota) > 0)

    if (participantes.length === 0) {
      setResumenAlumnos([])
      setResumenEventos([])
      setLoading(false)
      return
    }

    // Traer cumpleañeros de cada evento para armar el label
    const { data: cumpleanerosData } = await supabase
      .from('cumpleaneros')
      .select('evento_id, alumno_id')
      .in('evento_id', eventoIdsCurso)

    const cumpleaneroAlumnoIds = [...new Set((cumpleanerosData || []).map((c) => c.alumno_id).filter(Boolean))]
    const cumpleaneroNombresMap = {}
    if (cumpleaneroAlumnoIds.length > 0) {
      const { data: cumpleaneroAlumnosData } = await supabase
        .from('alumnos')
        .select('id, nombre')
        .in('id', cumpleaneroAlumnoIds)
      for (const a of cumpleaneroAlumnosData || []) {
        cumpleaneroNombresMap[a.id] = a.nombre
      }
    }

    const eventoCumpleanerosMap = {}
    // Set de pares "eventoId_alumnoId" para excluir cumpleañeros de su propio evento
    const cumpleaneroKeys = new Set()
    for (const c of cumpleanerosData || []) {
      if (!eventoCumpleanerosMap[c.evento_id]) eventoCumpleanerosMap[c.evento_id] = []
      const nombre = cumpleaneroNombresMap[c.alumno_id]
      if (nombre) eventoCumpleanerosMap[c.evento_id].push(nombre)
      cumpleaneroKeys.add(`${c.evento_id}_${c.alumno_id}`)
    }

    const participantesFiltrados = participantes.filter(
      (p) => !cumpleaneroKeys.has(`${p.evento_id}_${p.alumno_id}`)
    )

    // Traer nombres de los participantes deudores
    const alumnoIds = [...new Set(participantesFiltrados.map((p) => p.alumno_id).filter(Boolean))]
    const alumnosMap = {}
    if (alumnoIds.length > 0) {
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('id, nombre')
        .in('id', alumnoIds)
      if (alumnosError) {
        console.error('Error cargando alumnos:', alumnosError)
      } else {
        for (const a of alumnosData || []) {
          alumnosMap[a.id] = a.nombre
        }
      }
    }

    const getEventoLabel = (eventoId) => {
      const nombres = eventoCumpleanerosMap[eventoId] || []
      const fecha = eventosMap[eventoId]?.fecha_evento
      const fechaStr = formatFechaCorta(fecha)
      const nombresStr = nombres.length > 0 ? nombres.join(', ') : `Cumpleaños ${eventoId}`
      return fechaStr ? `Cumpleaños de ${nombresStr} · ${fechaStr}` : `Cumpleaños de ${nombresStr}`
    }

    // Resumen por alumno
    const porAlumno = {}
    for (const p of participantesFiltrados) {
      const key = p.alumno_id ?? `ext_${p.id}`
      const nombre = alumnosMap[p.alumno_id] || 'Sin nombre'
      if (!porAlumno[key]) porAlumno[key] = { nombre, total: 0, eventos: [] }
      porAlumno[key].total += Number(p.cuota)
      porAlumno[key].eventos.push({ eventoId: p.evento_id, label: getEventoLabel(p.evento_id), cuota: Number(p.cuota) })
    }

    // Fetch invitados externos pendientes de pago
    const { data: externosData } = await supabase
      .from('invitados_externos')
      .select('id, nombre_invitado, cuota, estado, evento_id')
      .in('evento_id', eventoIdsCurso)
      .in('estado', estadosPendientes)
      .eq('participa_regalo', true)
      .not('cuota', 'is', null)

    for (const inv of (externosData || []).filter((inv) => Number(inv.cuota) > 0)) {
      const nombre = `${inv.nombre_invitado || 'Sin nombre'} (externo)`
      const key = `externo_${inv.id}`
      if (!porAlumno[key]) porAlumno[key] = { nombre, total: 0, eventos: [] }
      porAlumno[key].total += Number(inv.cuota)
      porAlumno[key].eventos.push({ eventoId: inv.evento_id, label: getEventoLabel(inv.evento_id), cuota: Number(inv.cuota) })
    }

    const resumenPorAlumno = Object.values(porAlumno).sort((a, b) => b.total - a.total)

    // Resumen por evento
    const porEvento = {}
    for (const p of participantesFiltrados) {
      const eventoId = p.evento_id
      if (!porEvento[eventoId]) porEvento[eventoId] = { eventoId, label: getEventoLabel(eventoId), total: 0, participantes: [] }
      porEvento[eventoId].total += Number(p.cuota)
      porEvento[eventoId].participantes.push({ nombre: alumnosMap[p.alumno_id] || 'Sin nombre', cuota: Number(p.cuota) })
    }

    for (const inv of (externosData || []).filter((inv) => Number(inv.cuota) > 0)) {
      const eventoId = inv.evento_id
      if (!porEvento[eventoId]) porEvento[eventoId] = { eventoId, label: getEventoLabel(eventoId), total: 0, participantes: [] }
      porEvento[eventoId].total += Number(inv.cuota)
      porEvento[eventoId].participantes.push({ nombre: `${inv.nombre_invitado || 'Sin nombre'} (externo)`, cuota: Number(inv.cuota) })
    }

    const resumenPorEvento = Object.values(porEvento).sort((a, b) => b.total - a.total)

    setResumenAlumnos(resumenPorAlumno)
    setResumenEventos(resumenPorEvento)
    setLoading(false)
  }

  useEffect(() => {
    const verificarToken = async () => {
      if (!token || !cursoId) {
        navigate('/')
        return
      }
      const { data, error } = await supabase
        .from('cursos')
        .select('token')
        .eq('id', cursoId)
        .single()
      if (error || !data || data.token !== token) {
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

  const totalPorCobrar = resumenAlumnos.reduce((acc, a) => acc + a.total, 0)
  const alumnosConDeuda = resumenAlumnos.length

  return (
    <div className="page-container">
      <PageTopBar />

      <h1 className="page-title">Acusete 🧾</h1>
      <p>Pagos pendientes de {cursoNombre}.</p>

      {loading && <p style={{ marginTop: '1.5rem' }}>Cargando datos...</p>}

      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f8d7da',
            color: '#721c24',
            borderRadius: '8px',
            border: '1px solid #f5c6cb',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Selector de vista compacto */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setVista('alumno')}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: 'none',
                border: 'none',
                borderBottom: vista === 'alumno' ? '2px solid #333' : '2px solid transparent',
                fontWeight: vista === 'alumno' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '0.95rem',
                marginBottom: '-2px',
              }}
            >
              Por alumno
            </button>
            <button
              type="button"
              onClick={() => setVista('evento')}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: 'none',
                border: 'none',
                borderBottom: vista === 'evento' ? '2px solid #333' : '2px solid transparent',
                fontWeight: vista === 'evento' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '0.95rem',
                marginBottom: '-2px',
              }}
            >
              Por cumpleaños
            </button>
          </div>

          {/* Resumen global */}
          {alumnosConDeuda > 0 && (
            <div style={{ fontSize: '0.9rem', color: '#555', margin: '0.75rem 0' }}>
              Total por cobrar: <strong>${totalPorCobrar.toLocaleString('es-CL')}</strong>
              {' · '}
              {alumnosConDeuda} {alumnosConDeuda === 1 ? 'alumno' : 'alumnos'} con deuda
            </div>
          )}

          {/* Vista por alumno */}
          {vista === 'alumno' && (
            <div>
              {resumenAlumnos.length === 0 ? (
                <p style={{ margin: '1rem 0 0' }}>No hay pagos pendientes.</p>
              ) : (
                resumenAlumnos.map((alumno, i) => (
                  <div key={alumno.nombre}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedAlumnos((prev) => ({ ...prev, [alumno.nombre]: !prev[alumno.nombre] }))}
                      onKeyDown={(e) => e.key === 'Enter' && setExpandedAlumnos((prev) => ({ ...prev, [alumno.nombre]: !prev[alumno.nombre] }))}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', cursor: 'pointer' }}
                    >
                      <span>{alumno.nombre}</span>
                      <span style={{ fontWeight: '600' }}>${alumno.total.toLocaleString('es-CL')}</span>
                    </div>
                    {expandedAlumnos[alumno.nombre] && (
                      <div style={{ paddingBottom: '0.5rem' }}>
                        {alumno.eventos.map((ev, j) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', paddingLeft: '0.75rem', paddingBottom: '0.25rem' }}>
                            <span>{ev.label}</span>
                            <span style={{ marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>${ev.cuota.toLocaleString('es-CL')}</span>
                          </div>
                        ))}
                        {alumno.eventos.length > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', paddingLeft: '0.75rem', paddingTop: '0.25rem', borderTop: '1px solid #e8e8e8', marginTop: '0.1rem' }}>
                            <span>Total</span>
                            <span>${alumno.total.toLocaleString('es-CL')}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {i < resumenAlumnos.length - 1 && <div style={{ borderBottom: '1px solid #e8e8e8' }} />}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Vista por cumpleaños */}
          {vista === 'evento' && (
            <div>
              {resumenEventos.length === 0 ? (
                <p style={{ margin: '1rem 0 0' }}>No hay pagos pendientes.</p>
              ) : (
                resumenEventos.map((evento, i) => (
                  <div key={evento.eventoId}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedEventos((prev) => ({ ...prev, [evento.eventoId]: !prev[evento.eventoId] }))}
                      onKeyDown={(e) => e.key === 'Enter' && setExpandedEventos((prev) => ({ ...prev, [evento.eventoId]: !prev[evento.eventoId] }))}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', cursor: 'pointer' }}
                    >
                      <span>{evento.label}</span>
                      <span style={{ fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>${evento.total.toLocaleString('es-CL')}</span>
                    </div>
                    {expandedEventos[evento.eventoId] && (
                      <div style={{ paddingBottom: '0.5rem' }}>
                        {evento.participantes.map((p, j) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', paddingLeft: '0.75rem', paddingBottom: '0.25rem' }}>
                            <span>{p.nombre}</span>
                            <span>${p.cuota.toLocaleString('es-CL')}</span>
                          </div>
                        ))}
                        {evento.participantes.length > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', paddingLeft: '0.75rem', paddingTop: '0.25rem', borderTop: '1px solid #e8e8e8', marginTop: '0.1rem' }}>
                            <span>Total</span>
                            <span>${evento.total.toLocaleString('es-CL')}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {i < resumenEventos.length - 1 && <div style={{ borderBottom: '1px solid #e8e8e8' }} />}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Acusete
