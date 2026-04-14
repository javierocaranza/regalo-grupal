import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import './pages.css'

function PageTopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const rol = window.localStorage.getItem('rol_ingreso_activo') || ''
  const cursoId = window.localStorage.getItem('curso_id_activo') || ''
  const alumnoNombre = window.localStorage.getItem('alumno_apoderado_nombre_activo') || ''
  const [cursoLabel, setCursoLabel] = useState('')
  const esPantallaPrincipal = location.pathname === '/'

  const rolLabel = rol ? rol.charAt(0).toUpperCase() + rol.slice(1) : ''

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    const params = new URLSearchParams()
    if (cursoId) params.set('cursoId', cursoId)
    if (rol) params.set('rol', rol)

    const target = params.toString() ? `/?${params.toString()}` : '/'
    navigate(target, { replace: true })
  }

  const handleGoHome = () => {
    // Volver al inicio real (pantalla principal de seleccion)
    window.localStorage.removeItem('rol_ingreso_activo')
    window.localStorage.removeItem('curso_id_activo')
    window.localStorage.removeItem('alumno_apoderado_id_activo')
    window.localStorage.removeItem('alumno_apoderado_nombre_activo')
    window.dispatchEvent(new Event('regalo:home'))
    navigate('/', { replace: true })
  }

  useEffect(() => {
    const loadCurso = async () => {
      if (!cursoId) {
        setCursoLabel('')
        return
      }

      const cursoIdNumero = parseInt(cursoId, 10)
      if (!cursoIdNumero) {
        setCursoLabel('')
        return
      }

      const { data, error } = await supabase
        .from('cursos')
        .select('nombre, anio')
        .eq('id', cursoIdNumero)
        .single()

      if (error || !data) {
        setCursoLabel(`Curso ${cursoId}`)
        return
      }

      const nombre = data.nombre || `Curso ${cursoId}`
      const anio = data.anio || ''
      setCursoLabel(anio ? `${nombre} - ${anio}` : nombre)
    }

    loadCurso()
  }, [cursoId])

  return (
    <div className="page-topbar">
      <div className="topbar-actions">
        {!esPantallaPrincipal && (
          <button
            type="button"
            className="back-btn"
            onClick={handleGoBack}
            aria-label="Volver a la pantalla anterior"
            title="Atrás"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
        )}

        <button
          type="button"
          className="back-btn"
          onClick={handleGoHome}
          aria-label="Volver al inicio"
          title="Inicio"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
          </svg>
        </button>
      </div>

      {!esPantallaPrincipal && (
        <div className="page-context">
          {rolLabel && <span className="context-chip">{rolLabel}</span>}
          {cursoLabel && <span className="context-chip">{cursoLabel}</span>}
          {rol === 'apoderado' && alumnoNombre && <span className="context-chip">Alumno: {alumnoNombre}</span>}
        </div>
      )}
    </div>
  )
}

export default PageTopBar