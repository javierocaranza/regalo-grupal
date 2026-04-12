import { useState } from 'react'

function TerminosModal() {
  const [visible, setVisible] = useState(() => {
    return window.localStorage.getItem('terminos_aceptados') !== 'true'
  })

  const handleAceptar = () => {
    window.localStorage.setItem('terminos_aceptados', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminos-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 2000
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#fff',
          color: '#1f2937',
          borderRadius: '12px',
          padding: '1.25rem 1.25rem 1rem',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)'
        }}
      >
        <h2 id="terminos-modal-title" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Términos y Condiciones de Uso
        </h2>

        <ol style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.55 }}>
          <li style={{ marginBottom: '0.9rem' }}>
            <strong>Herramienta sin fines de lucro</strong> - Regalo Grupal es una herramienta gratuita, de uso voluntario,
            desarrollada sin fines comerciales para facilitar la organización de regalos grupales en comunidades
            escolares. No se cobra por su uso ni se monetizan los datos de los usuarios.
          </li>
          <li style={{ marginBottom: '0.9rem' }}>
            <strong>Datos personales</strong> - Esta app almacena nombres, correos electrónicos y teléfonos de
            apoderados. Al usar la app, el usuario acepta que esta información se usa exclusivamente para coordinar
            regalos grupales dentro del curso. Los datos no se comparten con terceros ni se usan con fines
            publicitarios.
          </li>
          <li style={{ marginBottom: '0.9rem' }}>
            <strong>Seguridad</strong> - Regalo Grupal no cuenta aún con mecanismos avanzados de protección. El nivel
            de seguridad es comparable al de una planilla compartida en Google Sheets. El uso es bajo la
            responsabilidad de cada comunidad escolar.
          </li>
          <li style={{ marginBottom: '0.9rem' }}>
            <strong>Sin garantía de disponibilidad</strong> - La app puede tener interrupciones sin previo aviso. No se
            garantiza continuidad del servicio.
          </li>
          <li style={{ marginBottom: '0.9rem' }}>
            <strong>Responsabilidad del coordinador</strong> - El coordinador es responsable de la información que
            ingresa. La verificación de pagos es responsabilidad de las personas involucradas.
          </li>
          <li style={{ marginBottom: '0.9rem' }}>
            <strong>Menores de edad</strong> - La información puede incluir nombre y fecha de cumpleaños de alumnos. Al
            usar la app, cada apoderado acepta que estos datos sean utilizados dentro de la comunidad del curso con
            el único fin de organizar regalos grupales.
          </li>
        </ol>

        <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleAceptar}
            style={{
              border: 'none',
              borderRadius: '8px',
              background: '#1d4ed8',
              color: '#fff',
              padding: '0.65rem 1rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Acepto los términos y condiciones
          </button>
        </div>
      </div>
    </div>
  )
}

export default TerminosModal
