import './App.css'

function App() {
  const handleCreateEvent = () => {
    alert('Crear evento - Próximamente')
  }

  const handleViewEvents = () => {
    alert('Ver mis eventos - Próximamente')
  }

  const handleManageCourse = () => {
    alert('Administrar mi curso - Próximamente')
  }

  // Próximos eventos de ejemplo
  const upcomingEvents = [
    { id: 1, name: 'Cumpleaños de María', date: '15 de Marzo', organizer: 'Curso 3A' },
    { id: 2, name: 'Cumpleaños de Juan', date: '22 de Marzo', organizer: 'Curso 3B' },
  ]

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

        {upcomingEvents.length > 0 && (
          <div className="upcoming-events">
            <h3 className="upcoming-title">Próximos eventos</h3>
            <div className="events-list">
              {upcomingEvents.map(event => (
                <div key={event.id} className="event-item">
                  <div className="event-name">{event.name}</div>
                  <div className="event-details">{event.date} • {event.organizer}</div>
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