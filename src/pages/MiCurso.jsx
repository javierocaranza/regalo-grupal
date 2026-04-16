import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase, getCursoToken } from '../supabase.js'
import PageTopBar from './PageTopBar.jsx'
import './pages.css'

function MiCurso() {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const esNuevoCurso = searchParams.get('nuevo') === 'true'
  const cursoIdParam = searchParams.get('cursoId') || window.localStorage.getItem('curso_id_activo')
  const cursoIdActivo = cursoIdParam ? parseInt(cursoIdParam, 10) : null
  const [alumnos, setAlumnos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef(null)
  const [currentStudent, setCurrentStudent] = useState({
    id: null,
    nombre: '',
    fechaCumple: '',
    nombrePadre: '',
    telefonoPadreCode: '+56',
    telefonoPadreNumber: '',
    emailPadre: '',
    nombreMadre: '',
    telefonoMadreCode: '+56',
    telefonoMadreNumber: '',
    emailMadre: ''
  })
  const [curso, setCurso] = useState({ nombre: '', anio: '' })
  const [cursoGuardado, setCursoGuardado] = useState(false)

  const handleVolver = () => {
    const rolActivo = window.localStorage.getItem('rol_ingreso_activo')
    const cursoActivo = window.localStorage.getItem('curso_id_activo')

    if (!rolActivo) {
      navigate('/')
      return
    }

    const params = new URLSearchParams({ rol: rolActivo })
    if (cursoActivo) params.set('cursoId', cursoActivo)
    navigate(`/?${params.toString()}`)
  }

  const months = {
    ene: '01',
    enero: '01',
    feb: '02',
    febrero: '02',
    mar: '03',
    marzo: '03',
    abr: '04',
    abril: '04',
    may: '05',
    mayo: '05',
    jun: '06',
    junio: '06',
    jul: '07',
    julio: '07',
    ago: '08',
    agosto: '08',
    sep: '09',
    septiembre: '09',
    oct: '10',
    octubre: '10',
    nov: '11',
    noviembre: '11',
    dic: '12',
    diciembre: '12'
  }

  const parsearFecha = (texto) => {
    const fechaOriginal = texto
    const logAndReturn = (resultado) => {
      console.log('fecha original:', fechaOriginal, '-> convertida:', resultado)
      return resultado
    }

    if (!texto) return logAndReturn(null)

    const raw = String(texto).trim()
    if (!raw) return logAndReturn(null)

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return logAndReturn(raw)
    }

    const normalized = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    let match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (match) {
      const [, dd, mm, yyyy] = match
      return logAndReturn(`${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`)
    }

    match = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (match) {
      const [, dd, mm, yyyy] = match
      return logAndReturn(`${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`)
    }

    match = normalized.match(/^(\d{1,2})-([a-z]{3})-(\d{4})$/)
    if (match) {
      const [, dd, mesTxt, yyyy] = match
      const mm = months[mesTxt]
      if (!mm) return logAndReturn(null)
      return logAndReturn(`${yyyy}-${mm}-${String(dd).padStart(2, '0')}`)
    }

    match = normalized.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/)
    if (match) {
      const [, dd, mesTxt, yyyy] = match
      const mm = months[mesTxt]
      if (!mm) return logAndReturn(null)
      return logAndReturn(`${yyyy}-${mm}-${String(dd).padStart(2, '0')}`)
    }

    return logAndReturn(null)
  }

  const cargarAlumnos = async (cursoId) => {
    if (cursoId) {
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .eq('curso_id', cursoId)

      if (!error) return data || []
      console.warn('No se pudo filtrar alumnos por curso_id, usando fallback:', error)
    }

    const { data, error } = await supabase.from('alumnos').select('*')
    if (error) {
      console.error('Error cargando alumnos:', error)
      return []
    }

    if (cursoId) {
      return (data || []).filter((row) => Number(row.curso_id) === Number(cursoId))
    }

    return data || []
  }

  const NOMBRES_NINA = new Set([
    'ana','maria','valentina','sofia','isadora','antonia','catalina','josefina','gabriela',
    'fernanda','camila','isabella','emilia','renata','florencia','constanza','francisca',
    'paula','javiera','martina','daniela','alicia','victoria','olivia','julieta','maite',
    'trinidad','paz','gracia','sara','julia','clara','elena','lucia','amanda','magdalena',
    'elisa','rocio','andrea','carolina','veronica','paola','natalia','claudia','monica',
    'patricia','barbara','lorena','pilar','regina','rosa','carmen','teresa','beatriz',
    'ximena','soledad','alejandra','yasna','ingrid','eliana','miriam','alondra','tamara',
    'valeria','pamela','viviana','nicole','vanessa','karla','margarita','cecilia','gloria',
    'susana','cristina','marcela','fabiola','iris','esperanza','luz','mercedes','gladys',
    'silvia','nadia','raquel','rebeca','eva','alba','paloma','mariana','jimena','cynthia',
    'denisse','priscilla','giselle','evelyn','jacqueline','yasmine','ariadna','camille',
    'elsa','hannah','emma','ava','sophia','mia','luna','abril','agustina','micaela','juanita','dolores',
    'graciela','hortensia','irene','leonor','lidia','lourdes','marta','milagros','nieves',
    'noelia','nora','olga','pia','rosario','salome','sandra','sonia','tania','tina',
    'ursula','yolanda','zoe','araceli','celeste','consuelo','dafne','delia','diana',
    'dulce','edith','estela','fatima','flor','gema','gianna','gina','hilda','ines','irma',
    // nombres en ingles
    'ava','charlotte','amelia','harper','abigail','emily','elizabeth','ella','madison',
    'scarlett','aria','grace','chloe','penelope','riley','zoey','lily','eleanor','lillian',
    'addison','aubrey','ellie','stella','natalie','leah','hazel','violet','aurora','savannah',
    'audrey','brooklyn','bella','claire','skylar','lucy','paisley','everly','anna','caroline',
    'nova','genesis','kennedy','samantha','maya','willow','kinsley','naomi','aaliyah','sarah',
    'ariana','allison','gabriella','alice','madelyn','cora','ruby','serenity','autumn',
    'adeline','hailey','quinn','nevaeh','ivy','sadie','piper','lydia','alexa','josephine',
    'emery','delilah','arianna','vivian','kaylee','sophie','brielle','madeline','peyton',
    'rylee','hadley','melody','aubree','jade','katherine','isabelle','nathalie','jasmine',
    'bridget','molly','daisy','maggie','lila','annabelle','paige','alexis','mckenzie',
    'mackenzie','adriana','amy','brooke','faith','mary','reagan','ashley','trinity','amber',
    'tiffany','crystal','michelle','stephanie','jennifer','jessica','melissa','lauren',
    'brittany','kayla','rebecca','rachel','danielle','kelsey','taylor','morgan','jordan',
    'sydney','shelby','cassandra','natasha','lacey','courtney','whitney','lindsey','chelsea',
    'megan','alyssa'
  ])

  const inferirGenero = (nombre) => {
    if (!nombre) return null

    const partes = String(nombre)
      .trim()
      .split(/\s+/)
      .filter(Boolean)

    const primerNombre = (partes[2] || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    if (!primerNombre) return null
    return NOMBRES_NINA.has(primerNombre) ? 'niña' : 'niño'
  }

  const importarAlumnos = async (alumnosArray, cursoId) => {
    const processedAlumnos = alumnosArray.map(alumno => ({
      nombre: alumno.nombre,
      fecha_cumpleanos: alumno.fechaCumple ?? null,
      nombre_padre: alumno.nombrePadre,
      telefono_padre: alumno.telefonoPadre,
      email_padre: alumno.emailPadre,
      nombre_madre: alumno.nombreMadre,
      telefono_madre: alumno.telefonoMadre,
      email_madre: alumno.emailMadre,
      curso_id: cursoId || null,
      genero: inferirGenero(alumno.nombre)
    }))

    const { data, error } = await supabase.from('alumnos').insert(processedAlumnos)
    if (error) {
      console.error('Error importando alumnos:', error)
      return false
    }
    return true
  }

  const mapDbToStudent = (row) => ({
    id: row.id,
    nombre: row.nombre || '',
    fechaCumple: row.fecha_cumpleanos || '',
    nombrePadre: row.nombre_padre || '',
    telefonoPadre: row.telefono_padre || '',
    emailPadre: row.email_padre || '',
    nombreMadre: row.nombre_madre || '',
    telefonoMadre: row.telefono_madre || '',
    emailMadre: row.email_madre || ''
  })

  const mapStudentToDb = (student) => ({
    nombre: student.nombre,
    fecha_cumpleanos: student.fechaCumple,
    nombre_padre: student.nombrePadre,
    telefono_padre: student.telefonoPadre,
    email_padre: student.emailPadre,
    nombre_madre: student.nombreMadre,
    telefono_madre: student.telefonoMadre,
    email_madre: student.emailMadre,
    curso_id: cursoIdActivo || null
  })

  const cargarCurso = async (cursoId) => {
    if (!cursoId) {
      setCurso({ nombre: '', anio: '' })
      setCursoGuardado(false)
      return
    }

    const { data, error } = await supabase.from('cursos').select('*').eq('id', cursoId)
    if (error) {
      console.error('Error cargando curso:', error)
      return
    }
    if (data && data.length > 0) {
      setCurso({ nombre: data[0].nombre || '', anio: data[0].anio || '' })
      if (data[0].nombre) setCursoGuardado(true)
      return
    }

    setCurso({ nombre: '', anio: '' })
    setCursoGuardado(false)
  }

  const isDuplicate = (student, list) => {
    const normalizedName = (student.nombre || '').trim().toLowerCase()
    return list.some(a => (a.nombre || '').trim().toLowerCase() === normalizedName)
  }

  useEffect(() => {
    const verificarToken = async () => {
      const tokenLocal = getCursoToken()
      if (!tokenLocal || !cursoIdActivo) {
        navigate('/')
        return
      }
      const { data, error } = await supabase
        .from('cursos')
        .select('token')
        .eq('id', cursoIdActivo)
        .single()
      if (error || !data || data.token !== tokenLocal) {
        navigate('/')
      }
    }
    verificarToken()
  }, [])

  // Cargar alumnos desde Supabase al montar el componente
  useEffect(() => {
    const fetchAlumnos = async () => {
      const data = await cargarAlumnos(cursoIdActivo)
      setAlumnos(data.map(mapDbToStudent))
    }

    if (esNuevoCurso) {
      setCurso({ nombre: '', anio: '' })
      setCursoGuardado(false)
      fetchAlumnos()
      return
    }

    fetchAlumnos()
    cargarCurso(cursoIdActivo)
  }, [esNuevoCurso, cursoIdActivo])


  const handleAddStudent = () => {
    setCurrentStudent({
      id: null,
      nombre: '',
      fechaCumple: '',
      nombrePadre: '',
      telefonoPadreCode: '+56',
      telefonoPadreNumber: '',
      emailPadre: '',
      nombreMadre: '',
      telefonoMadreCode: '+56',
      telefonoMadreNumber: '',
      emailMadre: ''
    })
    setIsEditing(false)
    setShowForm(true)
  }

  const handleEditStudent = (student) => {
    // Parsear teléfonos
    const [padreCode, padreNumber] = student.telefonoPadre ? student.telefonoPadre.split(' ') : ['+56', '']
    const [madreCode, madreNumber] = student.telefonoMadre ? student.telefonoMadre.split(' ') : ['+56', '']
    setCurrentStudent({
      ...student,
      telefonoPadreCode: padreCode,
      telefonoPadreNumber: padreNumber,
      telefonoMadreCode: madreCode,
      telefonoMadreNumber: madreNumber
    })
    setIsEditing(true)
    setShowForm(true)
  }

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este alumno?')) return

    const { error } = await supabase.from('alumnos').delete().eq('id', id)
    if (error) {
      console.error('Error eliminando alumno en Supabase:', error)
      return
    }

    setAlumnos(alumnos.filter(alumno => alumno.id !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const studentToSave = {
      nombre: currentStudent.nombre.trim(),
      fechaCumple: currentStudent.fechaCumple,
      nombrePadre: currentStudent.nombrePadre.trim(),
      telefonoPadre: `${currentStudent.telefonoPadreCode} ${currentStudent.telefonoPadreNumber}`,
      emailPadre: currentStudent.emailPadre.trim(),
      nombreMadre: currentStudent.nombreMadre.trim(),
      telefonoMadre: `${currentStudent.telefonoMadreCode} ${currentStudent.telefonoMadreNumber}`,
      emailMadre: currentStudent.emailMadre.trim()
    }

    if (!studentToSave.nombre) {
      setImportMessage('El nombre del alumno es obligatorio.')
      setTimeout(() => setImportMessage(''), 4000)
      return
    }

    if (!isEditing && isDuplicate(studentToSave, alumnos)) {
      setImportMessage('Ya existe un alumno con ese nombre.')
      setTimeout(() => setImportMessage(''), 4000)
      return
    }

    const dbRow = mapStudentToDb(studentToSave)

    console.log('Guardando en Supabase:', dbRow)

    if (isEditing) {
      const { data, error } = await supabase
        .from('alumnos')
        .update(dbRow)
        .eq('id', currentStudent.id)
        .select()
        .single()

      if (error) {
        console.error('Error actualizando alumno en Supabase:', error)
        return
      }

      setAlumnos(alumnos.map(alumno =>
        alumno.id === currentStudent.id ? mapDbToStudent(data) : alumno
      ))
    } else {
      const { data, error } = await supabase
        .from('alumnos')
        .insert(dbRow)
        .select()
        .single()

      if (error) {
        console.error('Error guardando alumno en Supabase:', error)
        return
      }

      setAlumnos([...alumnos, mapDbToStudent(data)])
    }

    setShowForm(false)
    setCurrentStudent({
      id: null,
      nombre: '',
      fechaCumple: '',
      nombrePadre: '',
      telefonoPadreCode: '+56',
      telefonoPadreNumber: '',
      emailPadre: '',
      nombreMadre: '',
      telefonoMadreCode: '+56',
      telefonoMadreNumber: '',
      emailMadre: ''
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setCurrentStudent({
      id: null,
      nombre: '',
      fechaCumple: '',
      nombrePadre: '',
      telefonoPadreCode: '+56',
      telefonoPadreNumber: '',
      emailPadre: '',
      nombreMadre: '',
      telefonoMadreCode: '+56',
      telefonoMadreNumber: '',
      emailMadre: ''
    })
  }

  const handleSaveCurso = async () => {
    if (!curso.nombre.trim() || !curso.anio) {
      alert('Completa todos los campos')
      return
    }
    const { data, error } = await supabase
      .from('cursos')
      .insert({ nombre: curso.nombre, anio: parseInt(curso.anio) })
      .select('id, nombre, anio')
      .single()
    if (error) {
      console.error('Error guardando curso:', error)
      alert('Error guardando el curso')
      return
    }
    window.localStorage.setItem('curso_id_activo', String(data.id))
    setCurso({ nombre: data.nombre, anio: data.anio })
    setCursoGuardado(true)
    navigate(`/mi-curso?cursoId=${data.id}`)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fileType = file.name.split('.').pop().toLowerCase()
    if (fileType === 'csv') {
      Papa.parse(file, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        complete: async (results) => {
          await processData(results.data)
        }
      })
    } else if (fileType === 'xlsx') {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        await processData(jsonData)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const processData = async (data) => {
    if (Array.isArray(data) && data.length > 0) {
      console.log('keys del CSV:', Object.keys(data[0]))
    }

    const normalizeKey = (value) =>
      String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const rowsToInsert = data
      .map(row => {
        const nombre = row['nombre'] || row['Nombre'] || row['Nombre alumno'] || row['nombre alumno']
        const keyCumple = Object.keys(row).find((key) => normalizeKey(key).includes('cumplea'))
        const fechaCumple = keyCumple ? row[keyCumple] : null
        const nombrePadre = row['nombre_padre'] || row['nombre padre'] || row['Nombre padre']
        const telefonoPadre = row['telefono_padre'] || row['telefono padre'] || row['Telefono padre']
        const emailPadre = row['email_padre'] || row['email padre'] || row['Email padre']
        const nombreMadre = row['nombre_madre'] || row['nombre madre'] || row['Nombre madre']
        const telefonoMadre = row['telefono_madre'] || row['telefono madre'] || row['Telefono madre']
        const emailMadre = row['email_madre'] || row['email madre'] || row['Email madre']

        const parseTelefono = (tel) => {
          if (!tel) return { code: '+56', number: '' }
          const parts = tel.toString().split(' ')
          if (parts.length > 1 && parts[0].startsWith('+')) {
            return { code: parts[0], number: parts.slice(1).join(' ') }
          } else {
            return { code: '+56', number: tel.toString() }
          }
        }

        const padreTel = parseTelefono(telefonoPadre)
        const madreTel = parseTelefono(telefonoMadre)

        if (!nombre) return null

        return {
          nombre,
          fechaCumple: parsearFecha(fechaCumple),
          nombrePadre,
          telefonoPadre: `${padreTel.code} ${padreTel.number}`,
          emailPadre,
          nombreMadre,
          telefonoMadre: `${madreTel.code} ${madreTel.number}`,
          emailMadre
        }
      })
      .filter(Boolean)

    if (rowsToInsert.length === 0) {
      setImportMessage('No se encontraron alumnos válidos para importar.')
      setTimeout(() => setImportMessage(''), 5000)
      return
    }

    const success = await importarAlumnos(rowsToInsert, cursoIdActivo)
    if (success) {
      const data = await cargarAlumnos(cursoIdActivo)
      setAlumnos(data.map(mapDbToStudent))
      setImportMessage(`Se importaron ${rowsToInsert.length} alumnos exitosamente.`)
    } else {
      setImportMessage('Error al importar alumnos.')
    }
    setTimeout(() => setImportMessage(''), 5000)
  }

  return (
    <div className="page-container">
      <PageTopBar />
      <h1 className="page-title">{cursoGuardado ? `${curso.nombre} - ${curso.anio}` : (esNuevoCurso ? 'Crear Curso' : 'Mi Curso')}</h1>
      <p>Administra los alumnos de tu curso</p>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button className="btn btn-primary" onClick={handleAddStudent} style={{ flex: 1 }}>
          Agregar Alumno
        </button>
        <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>
          Importar desde Excel/CSV
        </button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.xlsx"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      {importMessage && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#d4edda', color: '#155724', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
          {importMessage}
        </div>
      )}

      {!cursoGuardado && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Configurar Curso</h3>
          <div>
            <div className="form-group">
              <label htmlFor="cursoNombre">Nombre del Curso</label>
              <input
                type="text"
                id="cursoNombre"
                value={curso.nombre}
                onChange={(e) => setCurso({ ...curso, nombre: e.target.value })}
                placeholder="ej: 4A"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="cursoAnio">Año</label>
              <input
                type="number"
                id="cursoAnio"
                value={curso.anio}
                onChange={(e) => setCurso({ ...curso, anio: e.target.value })}
                placeholder="ej: 2026"
                required
              />
            </div>
            <button type="button" className="btn btn-primary" onClick={handleSaveCurso}>Guardar</button>
          </div>
        </div>
      )}

      {!esNuevoCurso && alumnos.length > 0 && (
        <div className="upcoming-events" style={{ marginTop: '2rem' }}>
          <h3 className="upcoming-title">Lista de Alumnos</h3>
          <div className="events-list">
            {alumnos.map(alumno => (
              <div key={alumno.id} className="event-item">
                <div className="event-name">{alumno.nombre}</div>
                <div className="event-details">
                  Cumpleaños: {alumno.fechaCumple} • Padre: {alumno.nombrePadre} ({alumno.telefonoPadre}) {alumno.emailPadre && `• ${alumno.emailPadre}`} • Madre: {alumno.nombreMadre} ({alumno.telefonoMadre}) {alumno.emailMadre && `• ${alumno.emailMadre}`}
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEditStudent(alumno)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDeleteStudent(alumno.id)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: '#ff6b6b', color: 'white', border: 'none' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="event-form">
          <div className="form-section">
            <h2 className="section-title">{isEditing ? 'Editar Alumno' : 'Agregar Alumno'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nombre">Nombre del Alumno</label>
                <input
                  type="text"
                  id="nombre"
                  value={currentStudent.nombre}
                  onChange={(e) => setCurrentStudent({ ...currentStudent, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="fechaCumple">Fecha de Cumpleaños</label>
                <input
                  type="date"
                  id="fechaCumple"
                  value={currentStudent.fechaCumple}
                  onChange={(e) => setCurrentStudent({ ...currentStudent, fechaCumple: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="nombrePadre">Nombre del Padre</label>
                <input
                  type="text"
                  id="nombrePadre"
                  value={currentStudent.nombrePadre}
                  onChange={(e) => setCurrentStudent({ ...currentStudent, nombrePadre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="telefonoPadre">Teléfono del Padre</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    id="telefonoPadreCode"
                    value={currentStudent.telefonoPadreCode}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, telefonoPadreCode: e.target.value })}
                    style={{ width: 'auto', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'inherit' }}
                  >
                    {countryCodes.map(code => (
                      <option key={code.code} value={code.code}>
                        {code.code} {code.country}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    id="telefonoPadreNumber"
                    value={currentStudent.telefonoPadreNumber}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, telefonoPadreNumber: e.target.value })}
                    placeholder="Número de teléfono"
                    required
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="emailPadre">Email del Padre</label>
                <input
                  type="email"
                  id="emailPadre"
                  value={currentStudent.emailPadre}
                  onChange={(e) => setCurrentStudent({ ...currentStudent, emailPadre: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="nombreMadre">Nombre de la Madre</label>
                <input
                  type="text"
                  id="nombreMadre"
                  value={currentStudent.nombreMadre}
                  onChange={(e) => setCurrentStudent({ ...currentStudent, nombreMadre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="telefonoMadre">Teléfono de la Madre</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    id="telefonoMadreCode"
                    value={currentStudent.telefonoMadreCode}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, telefonoMadreCode: e.target.value })}
                    style={{ width: 'auto', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'inherit' }}
                  >
                    {countryCodes.map(code => (
                      <option key={code.code} value={code.code}>
                        {code.code} {code.country}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    id="telefonoMadreNumber"
                    value={currentStudent.telefonoMadreNumber}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, telefonoMadreNumber: e.target.value })}
                    placeholder="Número de teléfono"
                    required
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="emailMadre">Email de la Madre</label>
                <input
                  type="email"
                  id="emailMadre"
                  value={currentStudent.emailMadre}
                  onChange={(e) => setCurrentStudent({ ...currentStudent, emailMadre: e.target.value })}
                />
              </div>
              <div className="form-row">
                <button type="submit" className="form-submit">
                  {isEditing ? 'Actualizar' : 'Agregar'}
                </button>
                <button type="button" className="form-submit" onClick={handleCancel} style={{ background: '#6c757d' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MiCurso
