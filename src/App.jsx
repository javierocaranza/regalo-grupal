import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase.js'
import './App.css'

function App() {
  const navigate = useNavigate()
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)

  const handleCreateEvent = () => {
    navigate('/crear-evento')
  }

  const handleViewEvents = () => {
    navigate('/mis-eventos')
  }

  const handleManageCourse = () => {
    navigate('/mi-curso')
  }

  useEffect(() => {
    const cargarProximosEventos = async () => {
      setLoadingUpcoming(true)

      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('id, fecha_evento')
        .eq('estado', 'abierto')
        .gte('fecha_evento', new Date().toISOString().split('T')[0])
        .order('fecha_evento', { ascending: true })
        .limit(3)

      if (eventosError) {
        console.error('Error cargando próximos eventos:', eventosError)
        setUpcomingEvents([])
        setLoadingUpcoming(false)
        return
      }

      const eventos = eventosData || []
      const mapped = await Promise.all(
        eventos.map(async (evento) => {
          const { data: cumpleanerosData, error: cumpleanerosError } = await supabase
            .from('cumpleaneros')
            .select('alumno_id, alumnos(nombre)')
            .eq('evento_id', evento.id)

          if (cumpleanerosError) {
            console.error('Error cargando cumpleañeros del evento:', cumpleanerosError)
          }

          const nombres = (cumpleanerosData || [])
            .map((row) => row.alumnos?.nombre)
            .filter(Boolean)

          return {
            id: evento.id,
            name: nombres.length > 0 ? nombres.join(', ') : 'Sin cumpleañeros',
            date: evento.fecha_evento
              ? new Date(`${evento.fecha_evento}T00:00:00`).toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
              : 'Sin fecha'
          }
        })
      )

      setUpcomingEvents(mapped)
      setLoadingUpcoming(false)
    }

    cargarProximosEventos()
  }, [])

  return (
    <div className="container">
      <div className="hero">
        <h1 className="app-title">Regalo Grupal 🎁</h1>
        <p className="app-subtitle">La forma más fácil de organizar regalos de cumpleaños</p>
        
        <div className="buttons-container">
          <button className="btn btn-primary" onClick={handleCreateEvent}>
            Crear evento
          </button>
          <button className="btn btn-secondary" onClick={handleViewEvents}>
            Ver mis eventos
          </button>
          <button className="btn btn-secondary" onClick={handleManageCourse}>
            Administrar mi curso
          </button>
        </div>

        {loadingUpcoming && <p>Cargando próximos eventos...</p>}

        {!loadingUpcoming && upcomingEvents.length > 0 && (
          <div className="upcoming-events">
            <h3 className="upcoming-title">Próximos eventos</h3>
            <div className="events-list">
              {upcomingEvents.map(event => (
                <div key={event.id} className="event-item">
                  <div className="event-name">{event.name}</div>
                  <div className="event-details">{event.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App