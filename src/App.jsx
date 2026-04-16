import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase.js'
import './App.css'

function App() {
  const navigate = useNavigate()
  const [mostrarPanelAdmin, setMostrarPanelAdmin] = useState(false)
  const [pinAdmin, setPinAdmin] = useState('')
  const [validandoPinAdmin, setValidandoPinAdmin] = useState(false)
  const [errorPinAdmin, setErrorPinAdmin] = useState('')

  const abrirPanelAdmin = (event) => {
    event.preventDefault()
    setErrorPinAdmin('')
    setPinAdmin('')
    setMostrarPanelAdmin(true)
  }

  const cerrarPanelAdmin = () => {
    setMostrarPanelAdmin(false)
    setPinAdmin('')
    setErrorPinAdmin('')
  }

  const ingresarAdmin = async () => {
    const pinIngresado = String(pinAdmin).trim()
    if (!pinIngresado) return

    setValidandoPinAdmin(true)
    setErrorPinAdmin('')

    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('pin', pinIngresado)
      .limit(1)

    setValidandoPinAdmin(false)

    if (error || !data || data.length === 0) {
      setErrorPinAdmin('PIN incorrecto')
      return
    }

    window.localStorage.setItem('admin_id_activo', String(data[0].id))
    cerrarPanelAdmin()
    navigate('/admin')
  }

  return (
    <div className="container">
      <div className="hero">
        <h1 className="app-title">
          <span className="title-regalo">Regalo</span> <span className="title-grupal">Grupal</span> 🎁
        </h1>
        <p className="app-subtitle">La forma más fácil de organizar regalos de cumpleaños</p>
      </div>

      <a
        href="#"
        onClick={abrirPanelAdmin}
        style={{
          position: 'fixed',
          right: '1rem',
          bottom: '0.8rem',
          fontSize: '0.74rem',
          color: '#9ca3af',
          textDecoration: 'none',
          zIndex: 40
        }}
      >
        Admin
      </a>

      {mostrarPanelAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '360px',
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
              padding: '1rem'
            }}
          >
            <h3 style={{ margin: '0 0 0.7rem 0', fontSize: '1.1rem', color: '#111827' }}>Acceso Admin</h3>
            <input
              type="password"
              className="ingreso-select"
              placeholder="Ingresa PIN"
              value={pinAdmin}
              onChange={(e) => {
                setPinAdmin(e.target.value)
                setErrorPinAdmin('')
              }}
            />
            {errorPinAdmin && (
              <p style={{ margin: '0.55rem 0 0 0', fontSize: '0.85rem', color: '#dc2626' }}>
                {errorPinAdmin}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.55rem', marginTop: '0.8rem' }}>
              <button type="button" className="btn btn-secondary" onClick={cerrarPanelAdmin} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={ingresarAdmin}
                disabled={validandoPinAdmin || !pinAdmin.trim()}
                style={{ flex: 1 }}
              >
                {validandoPinAdmin ? 'Ingresando...' : 'Ingresar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
