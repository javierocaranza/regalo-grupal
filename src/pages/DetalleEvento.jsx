import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { logActivity } from '../utils/activityLog.js'
import PageTopBar from './PageTopBar.jsx'
import './pages.css'

function DetalleEvento() {
  const navigate = useNavigate()
  const { token, id } = useParams()
  const location = useLocation()
  const esAdmin = new URLSearchParams(location.search).get('admin') === 'true'
  const OTRO_INVITADO_VALUE = 'otro_externo'
  const rolIngreso = window.localStorage.getItem('rol_ingreso_activo') || ''
  const esApoderado = rolIngreso === 'apoderado'
  const alumnoApoderadoId = window.localStorage.getItem('alumno_apoderado_id_activo') || ''
  const alumnoApoderadoNombre = window.localStorage.getItem('alumno_apoderado_nombre_activo') || ''
  const cursoIdActivo = window.localStorage.getItem('curso_id_activo') || ''
  const [evento, setEvento] = useState(null)
  const [participantes, setParticipantes] = useState([])
  const [miParticipacion, setMiParticipacion] = useState(null)
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([])
  const [selectedParticipante, setSelectedParticipante] = useState('')
  const [nombreParticipante, setNombreParticipante] = useState('')
  const [participaRegaloSeleccion, setParticipaRegaloSeleccion] = useState('true')
  const [mostrarOpcionesInscripcion, setMostrarOpcionesInscripcion] = useState(false)
  const [confirmandoParticipacion, setConfirmandoParticipacion] = useState(false)
  const [subiendoComprobante, setSubiendoComprobante] = useState(false)
  const [subiendoComprobanteDetalleId, setSubiendoComprobanteDetalleId] = useState(null)
  const [comprobanteFile, setComprobanteFile] = useState(null)
  const [comprobanteFileSeleccionado, setComprobanteFileSeleccionado] = useState(null)
  const [mensajeFlujo, setMensajeFlujo] = useState('')
  const [errorFlujo, setErrorFlujo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actualizandoPagoId, setActualizandoPagoId] = useState(null)
  const [cerrandoLista, setCerrandoLista] = useState(false)
  const [montoTotal, setMontoTotal] = useState('')
  const [cuotaCalculada, setCuotaCalculada] = useState(null)
  const [confirmandoCuota, setConfirmandoCuota] = useState(false)
  const [completandoEvento, setCompletandoEvento] = useState(false)
  const [retrocediendoEstado, setRetrocediendoEstado] = useState(false)
  const [boletaFile, setBoletaFile] = useState(null)
  const [regaloFile, setRegaloFile] = useState(null)
  const [boletaUrl, setBoletaUrl] = useState('')
  const [regaloUrl, setRegaloUrl] = useState('')
  const [subiendoBoleta, setSubiendoBoleta] = useState(false)
  const [subiendoRegalo, setSubiendoRegalo] = useState(false)
  const [desinscribiendoId, setDesinscribiendoId] = useState(null)
  const [errorAdmin, setErrorAdmin] = useState('')
  const [mensajeAdmin, setMensajeAdmin] = useState('')
  const [detalleParticipanteAbiertoId, setDetalleParticipanteAbiertoId] = useState(null)
  const [modalPinCoordAbierto, setModalPinCoordAbierto] = useState(false)
  const [pinCoordActual, setPinCoordActual] = useState('')
  const [pinCoordNuevo, setPinCoordNuevo] = useState('')
  const [confirmarPinCoordNuevo, setConfirmarPinCoordNuevo] = useState('')
  const [cambiandoPinCoord, setCambiandoPinCoord] = useState(false)
  const [errorPinCoord, setErrorPinCoord] = useState('')
  const [mensajePinCoord, setMensajePinCoord] = useState('')
  const [activandoToken, setActivandoToken] = useState(false)
  const [copiadoLink, setCopiadoLink] = useState(false)
  const [invitadosExternos, setInvitadosExternos] = useState([])
  const [modalCuentaAbierto, setModalCuentaAbierto] = useState(false)
  const [editCuenta, setEditCuenta] = useState({ nombre_coordinador: '', rut_coordinador: '', banco: '', tipo_cuenta: '', numero_cuenta: '', email_pago: '' })
  const [guardandoCuenta, setGuardandoCuenta] = useState(false)
  const [errorCuenta, setErrorCuenta] = useState('')
  const [actualizandoPagoExternoId, setActualizandoPagoExternoId] = useState(null)
  const [desinscribiendoExternoId, setDesinscribiendoExternoId] = useState(null)

  const cambiarPinCoordinador = async () => {
    const actualNorm = String(pinCoordActual).trim()
    const nuevoNorm = String(pinCoordNuevo).trim()
    const confirmarNorm = String(confirmarPinCoordNuevo).trim()

    if (!actualNorm || !nuevoNorm || !confirmarNorm) {
      setErrorPinCoord('Completa todos los campos.')
      return
    }

    if (nuevoNorm !== confirmarNorm) {
      setErrorPinCoord('PIN nuevo y Confirmar PIN nuevo deben ser iguales.')
      return
    }

    setCambiandoPinCoord(true)
    setErrorPinCoord('')

    const { data: cursoData, error: cursoError } = await supabase
      .from('cursos')
      .select('pin_coordinador')
      .eq('id', cursoIdActivo)
      .single()

    if (cursoError || !cursoData) {
      setCambiandoPinCoord(false)
      setErrorPinCoord('No se pudo verificar el PIN actual.')
      return
    }

    const pinGuardado = cursoData.pin_coordinador === null || cursoData.pin_coordinador === undefined
      ? ''
      : String(cursoData.pin_coordinador).trim()

    if (actualNorm !== pinGuardado) {
      setCambiandoPinCoord(false)
      setErrorPinCoord('PIN actual incorrecto.')
      return
    }

    const { error: updateError } = await supabase
      .from('cursos')
      .update({ pin_coordinador: nuevoNorm })
      .eq('id', cursoIdActivo)

    setCambiandoPinCoord(false)

    if (updateError) {
      setErrorPinCoord('No se pudo actualizar el PIN.')
      return
    }

    setPinCoordActual('')
    setPinCoordNuevo('')
    setConfirmarPinCoordNuevo('')
    setModalPinCoordAbierto(false)
    setMensajePinCoord('PIN actualizado correctamente.')
  }

  const storageBucket = 'comprobantes'
  const localStorageKey = `participacion_evento_${id}`
  const boletaStorageKey = `evento_${id}_boleta_url`
  const regaloStorageKey = `evento_${id}_regalo_url`

  useEffect(() => {
    if (esAdmin) return
    const verificarToken = async () => {
      if (!token || !cursoIdActivo) {
        navigate('/')
        return
      }
      const { data, error } = await supabase
        .from('cursos')
        .select('token')
        .eq('id', cursoIdActivo)
        .single()
      if (error || !data || data.token !== token) {
        navigate('/')
      }
    }
    verificarToken()
  }, [])

  useEffect(() => {
    setBoletaUrl(window.localStorage.getItem(boletaStorageKey) || '')
    setRegaloUrl(window.localStorage.getItem(regaloStorageKey) || '')
  }, [boletaStorageKey, regaloStorageKey])

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

  const getEstadoNormalizado = (participante) => {
    const estados = [
      participante.estado,
      participante.estado_pago,
      participante.estadoPago,
      participante.pagado
    ]
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value).toLowerCase().trim())

    if (estados.includes('comprobante_subido')) return 'comprobante_subido'
    if (estados.includes('pagado') || estados.includes('paid') || estados.includes('true') || estados.includes('1')) return 'pagado'
    if (estados.includes('pendiente') || estados.includes('pending') || estados.includes('false') || estados.includes('0')) return 'pendiente'

    return estados[0] || ''
  }

  const formatEstadoPago = (participante) => {
    const raw = participante.estado_pago ?? participante.estadoPago ?? participante.pagado ?? participante.estado ?? ''

    if (typeof raw === 'boolean') return raw ? 'Pagado' : 'Pendiente'

    const normalized = getEstadoNormalizado(participante)
    if (['pagado', 'paid', 'si', 'sí', 'true', '1'].includes(normalized)) return 'Pagado'
    if (['pendiente', 'pending', 'no', 'false', '0'].includes(normalized)) return 'Pendiente'
    if (normalized === 'comprobante_subido') return 'Comprobante subido'
    return normalized ? raw : 'Pendiente'
  }

  useEffect(() => {
    if (esApoderado && alumnoApoderadoId) {
      setSelectedParticipante(String(alumnoApoderadoId))
      setNombreParticipante('')
      setParticipaRegaloSeleccion('true')
    }
  }, [esApoderado, alumnoApoderadoId, id])

  useEffect(() => {
    const cargarDetalle = async () => {
      setLoading(true)
      setError('')

      const eventoId = parseInt(id, 10)
      if (!eventoId) {
        setError('ID de cumpleaños invalido.')
        setLoading(false)
        return
      }

      const { data: eventoData, error: eventoError } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', eventoId)
        .single()

      if (eventoError) {
        console.error('Error cargando evento:', eventoError)
        setError('No se pudo cargar el detalle del cumpleaños.')
        setLoading(false)
        return
      }

      setEvento(eventoData)

      const { data: invExtData } = await supabase
        .from('invitados_externos')
        .select('*')
        .eq('evento_id', eventoId)
      setInvitadosExternos(invExtData || [])

      const { data: cumpleanerosData, error: cumpleanerosError } = await supabase
        .from('cumpleaneros')
        .select('alumno_id')
        .eq('evento_id', eventoId)

      if (cumpleanerosError) {
        console.error('Error cargando cumpleaneros del evento:', cumpleanerosError)
      }

      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('id, nombre')
        .eq('curso_id', parseInt(cursoIdActivo, 10))
        .order('nombre', { ascending: true })

      if (alumnosError) {
        console.error('Error cargando alumnos:', alumnosError)
        setAlumnosDisponibles([])
      } else {
        const cumpleanerosIds = new Set((cumpleanerosData || []).map((row) => row.alumno_id))
        const alumnosFiltrados = (alumnosData || []).filter((alumno) => !cumpleanerosIds.has(alumno.id))
        setAlumnosDisponibles(alumnosFiltrados)
      }

      const { data: participantesData, error: participantesError } = await supabase
        .from('participantes')
        .select('*')
        .eq('evento_id', id)

      if (participantesError) {
        console.error('Error cargando participantes:', participantesError)
        setParticipantes([])
      } else {
        const participantesBase = participantesData || []

        const participantesConAlumno = await Promise.all(
          participantesBase.map(async (participante) => {
            if (!participante.alumno_id) {
              return { ...participante, alumnoNombre: 'Sin nombre' }
            }

            const { data: alumnoData, error: alumnoError } = await supabase
              .from('alumnos')
              .select('nombre')
              .eq('id', participante.alumno_id)
              .single()

            if (alumnoError) {
              console.error('Error cargando alumno de participante:', alumnoError)
              return { ...participante, alumnoNombre: 'Sin nombre' }
            }

            return { ...participante, alumnoNombre: alumnoData?.nombre || 'Sin nombre' }
          })
        )

        setParticipantes(participantesConAlumno)

        // Para apoderado: detectar participacion por alumno_id; para otros usuarios: usar localStorage
        const rolActivo = window.localStorage.getItem('rol_ingreso_activo')
        const alumnoIdActivo = window.localStorage.getItem('alumno_apoderado_id_activo')
        if (rolActivo === 'apoderado' && alumnoIdActivo) {
          const participacionPorAlumno = participantesConAlumno.find(
            (p) => String(p.alumno_id) === String(alumnoIdActivo)
          )
          if (participacionPorAlumno) {
            setMiParticipacion(participacionPorAlumno)
            setNombreParticipante(participacionPorAlumno.nombre_participante || '')
            window.localStorage.setItem(localStorageKey, String(participacionPorAlumno.id))
          } else {
            setMiParticipacion(null)
          }
        } else if (!esAdmin) {
          const participacionGuardada = window.localStorage.getItem(localStorageKey)
          if (participacionGuardada) {
            const participanteId = parseInt(participacionGuardada, 10)
            if (participanteId) {
              const participacionActual = participantesConAlumno.find((p) => p.id === participanteId)
              if (participacionActual) {
                setMiParticipacion(participacionActual)
                setNombreParticipante(participacionActual.nombre_participante || '')
              }
            }
          }
        } else {
          setMiParticipacion(null)
        }
      }

      setLoading(false)
    }

    cargarDetalle()
  }, [id])

  const fechaEvento = evento?.fecha_evento ?? evento?.fechaEvento ?? evento?.fecha ?? null

  const cuotaMin = evento?.cuota_minima ?? evento?.cuotaMinima ?? evento?.cuota_min ?? '-'
  const cuotaMax = evento?.cuota_maxima ?? evento?.cuotaMaxima ?? evento?.cuota_max ?? '-'
  const estadoEvento = evento?.estado ?? 'Activo'
  const estadoEventoNormalizado = String(estadoEvento).toLowerCase()
  const puedeInscribirParticipantes = esAdmin || ['abierto', 'activo'].includes(estadoEventoNormalizado)
  const esInvitadoExterno = selectedParticipante === OTRO_INVITADO_VALUE
  const alumnoSeleccionadoId =
    !esInvitadoExterno && selectedParticipante ? parseInt(selectedParticipante, 10) : null
  const participanteSeleccionado = alumnoSeleccionadoId
    ? participantes.find((p) => Number(p.alumno_id) === alumnoSeleccionadoId)
    : null
  const cumpleanerosTitulo =
    evento?.nombres_cumpleaneros ||
    evento?.nombresCumpleaneros ||
    evento?.cumpleanero ||
    evento?.nombre_cumpleanero ||
    'Cumpleaños del curso'
  const esEventoAbierto = ['abierto', 'activo'].includes(estadoEventoNormalizado)
  const esEventoEnPago = estadoEventoNormalizado === 'en_pago'
  const esEventoCompletado = estadoEventoNormalizado === 'completado'
  const estadoMiParticipacion = miParticipacion ? getEstadoNormalizado(miParticipacion) : ''
  const miParticipaRegalo = miParticipacion?.participa_regalo !== false

  const confirmarParticipacion = async (participaRegaloOverride = null) => {
    setErrorFlujo('')
    setMensajeFlujo('')

    const eventoId = parseInt(id, 10)
    if (!eventoId) {
      setErrorFlujo('No se pudo identificar el cumpleaños.')
      return
    }

    if (!puedeInscribirParticipantes) {
      setErrorFlujo('La lista de participantes esta cerrada. Solo el administrador puede agregar en este estado.')
      return
    }

    if (!selectedParticipante) {
      setErrorFlujo(esAdmin ? 'Debes seleccionar un alumno.' : 'Debes seleccionar un alumno o la opcion de invitado externo.')
      return
    }

    const nombreManual = nombreParticipante.trim()
    if (esInvitadoExterno && !nombreManual) {
      setErrorFlujo('Debes ingresar un nombre para invitado externo.')
      return
    }

    setConfirmandoParticipacion(true)

    const payloadBase = {
      evento_id: eventoId,
      estado: 'pendiente',
      participa_regalo: participaRegaloOverride ?? (participaRegaloSeleccion === 'true')
    }

    let payload = payloadBase
    if (esInvitadoExterno) {
      payload = {
        ...payloadBase,
        nombre_participante: nombreManual
      }
    } else {
      const alumnoId = parseInt(selectedParticipante, 10)

      const { data: participantesExistentes, error: existenteError } = await supabase
        .from('participantes')
        .select('id')
        .eq('evento_id', eventoId)
        .eq('alumno_id', alumnoId)
        .limit(1)

      if (existenteError) {
        console.error('Error validando participante existente:', existenteError)
        setConfirmandoParticipacion(false)
        setErrorFlujo('No se pudo validar si el alumno ya estaba registrado.')
        return
      }

      if ((participantesExistentes || []).length > 0) {
        setConfirmandoParticipacion(false)
        setErrorFlujo('Este alumno ya está registrado')
        return
      }

      payload = {
        ...payloadBase,
        alumno_id: alumnoId
      }
    }

    const { data, error: insertError } = await supabase
      .from('participantes')
      .insert(payload)
      .select('*')
      .single()

    setConfirmandoParticipacion(false)

    if (insertError) {
      console.error('Error confirmando participacion:', insertError)
      setErrorFlujo('No se pudo confirmar tu participacion. Intenta nuevamente.')
      return
    }

    const nuevoParticipante = {
      ...data,
      alumnoNombre:
        data.nombre_participante ||
        alumnosDisponibles.find((alumno) => alumno.id === data.alumno_id)?.nombre ||
        'Sin nombre'
    }

    const participanteIdCreado = data.id

    logActivity(supabase, { accion: 'inscripcion', tabla_afectada: 'participantes', registro_id: participanteIdCreado, rol: rolIngreso || 'coordinador', nombre_usuario: alumnoApoderadoNombre || nombreManual || '', curso_id: parseInt(cursoIdActivo, 10) || null, detalle: `evento_id:${id}` })
    setMiParticipacion({ ...nuevoParticipante, id: participanteIdCreado })
    setParticipantes((prev) => [nuevoParticipante, ...prev])
    if (esInvitadoExterno) {
      setNombreParticipante(nombreManual)
    } else {
      setNombreParticipante('')
    }
    window.localStorage.setItem(localStorageKey, String(participanteIdCreado))
    setMostrarOpcionesInscripcion(false)
    setMensajeFlujo(
      payloadBase.participa_regalo
        ? 'Tu participacion fue confirmada con estado pendiente.'
        : 'Tu participación fue confirmada solo para el cumpleaños.'
    )
  }

  const cambiarParticipacionRegalo = async (participaRegalo) => {
    if (!miParticipacion?.id) return

    setErrorFlujo('')
    setMensajeFlujo('')

    const { data, error: updateError } = await supabase
      .from('participantes')
      .update({ participa_regalo: participaRegalo, cuota: participaRegalo ? miParticipacion.cuota || 0 : 0 })
      .eq('id', miParticipacion.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error actualizando tipo de participación:', updateError)
      setErrorFlujo('No se pudo actualizar tu tipo de participación.')
      return
    }

    const participanteActualizado = {
      ...data,
      alumnoNombre: miParticipacion.alumnoNombre || 'Sin nombre'
    }

    setMiParticipacion(participanteActualizado)
    setParticipantes((prev) => prev.map((p) => (p.id === participanteActualizado.id ? participanteActualizado : p)))
    setMensajeFlujo(
      participaRegalo
        ? 'Ahora participas en el regalo grupal 🎁'
        : 'Quedaste inscrito solo para el cumpleaños 🎂'
    )
  }

  const subirComprobante = async () => {
    setErrorFlujo('')
    setMensajeFlujo('')

    const participanteId = miParticipacion?.id ?? parseInt(window.localStorage.getItem(localStorageKey) || '0', 10)

    if (!participanteId) {
      setErrorFlujo('Primero debes confirmar tu participacion.')
      return
    }

    if (!comprobanteFile) {
      setErrorFlujo('Selecciona una imagen para subir tu comprobante.')
      return
    }

    if (!comprobanteFile.type.startsWith('image/')) {
      setErrorFlujo('El archivo debe ser una imagen.')
      return
    }

    const extension = comprobanteFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const nombreArchivo = `${id}/participante_${participanteId}_${Date.now()}.${extension}`

    setSubiendoComprobante(true)

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(nombreArchivo, comprobanteFile, { upsert: true })

    if (uploadError) {
      console.error('Error subiendo comprobante:', uploadError)
      setSubiendoComprobante(false)
      setErrorFlujo('No se pudo subir el comprobante. Verifica que exista el bucket "comprobantes".')
      return
    }

    const { data: publicUrlData } = supabase.storage.from(storageBucket).getPublicUrl(nombreArchivo)
    const urlComprobante = publicUrlData?.publicUrl || ''

    if (import.meta.env.DEV) {
      console.log('Subiendo comprobante para participante:', {
        participanteId,
        eventoId: id,
        urlComprobante
      })
    }

    const { data: participanteActualizado, error: updateError } = await supabase
      .from('participantes')
      .update({ imagen_comprobante: urlComprobante, estado: 'comprobante_subido' })
      .eq('id', participanteId)
      .select('*')
      .single()

    setSubiendoComprobante(false)

    if (updateError) {
      console.error('Error guardando URL de comprobante:', updateError)
      setErrorFlujo('No se pudo guardar el comprobante en participantes. Verifica columnas y permisos.')
      return
    }

    const participanteConComprobante = {
      ...participanteActualizado,
      alumnoNombre: participanteActualizado.nombre_participante || miParticipacion.alumnoNombre || 'Sin nombre'
    }

    logActivity(supabase, { accion: 'subida_comprobante', tabla_afectada: 'participantes', registro_id: participanteId, rol: rolIngreso || 'apoderado', nombre_usuario: alumnoApoderadoNombre || '', curso_id: parseInt(cursoIdActivo, 10) || null, detalle: `evento_id:${id}` })
    setMiParticipacion(participanteConComprobante)
    setParticipantes((prev) =>
      prev.map((p) => (p.id === participanteConComprobante.id ? participanteConComprobante : p))
    )
    setComprobanteFile(null)
    setMensajeFlujo('Comprobante subido exitosamente.')
  }

  const cambiarEstadoPago = async (participanteId, nuevoEstado) => {
    setActualizandoPagoId(participanteId)

    const { data, error: updateError } = await supabase
      .from('participantes')
      .update({ estado: nuevoEstado })
      .eq('id', participanteId)
      .select('*')
      .single()

    setActualizandoPagoId(null)

    if (updateError) {
      console.error('Error actualizando estado de pago:', updateError)
      return
    }

    logActivity(supabase, { accion: nuevoEstado === 'pagado' ? 'aprobacion_pago' : 'rechazo_pago', tabla_afectada: 'participantes', registro_id: participanteId, rol: 'coordinador', nombre_usuario: '', curso_id: parseInt(cursoIdActivo, 10) || null, detalle: `evento_id:${id}` })
    setParticipantes((prev) =>
      prev.map((p) =>
        p.id === participanteId
          ? { ...p, ...data }
          : p
      )
    )
  }

  const cerrarLista = async () => {
    setCerrandoLista(true)
    setErrorAdmin('')
    setMensajeAdmin('')

    const eventoId = parseInt(id, 10)
    const { data, error: updateError } = await supabase
      .from('eventos')
      .update({ estado: 'cerrado' })
      .eq('id', eventoId)
      .select('*')
      .single()

    setCerrandoLista(false)

    if (updateError) {
      console.error('Error cerrando lista:', updateError)
      setErrorAdmin('No se pudo cerrar la lista de participantes.')
      return
    }

    logActivity(supabase, { accion: 'cierre_lista', tabla_afectada: 'eventos', registro_id: eventoId, rol: 'coordinador', nombre_usuario: '', curso_id: parseInt(cursoIdActivo, 10) || null, detalle: null })
    setEvento(data)
    setMensajeAdmin('Lista de participantes cerrada exitosamente.')
  }

  const calcularCuota = () => {
    setErrorAdmin('')
    const monto = parseFloat(montoTotal)
    if (!monto || monto <= 0) {
      setErrorAdmin('Ingresa un monto total valido.')
      return
    }
    const participantesRegalo = participantes.filter((p) => p.participa_regalo !== false)
    const externosRegalo = invitadosExternos.filter((inv) => inv.participa_regalo)
    const totalAportantes = participantesRegalo.length + externosRegalo.length
    if (totalAportantes === 0) {
      setErrorAdmin('No hay participantes que aporten al regalo para calcular la cuota.')
      return
    }
    setCuotaCalculada(Math.ceil(monto / totalAportantes))
  }

  const confirmarCuotaYPasarACobro = async () => {
    if (!cuotaCalculada) {
      setErrorAdmin('Primero calcula la cuota.')
      return
    }

    setConfirmandoCuota(true)
    setErrorAdmin('')
    setMensajeAdmin('')

    const eventoId = parseInt(id, 10)

    const { data: eventoActualizado, error: eventoError } = await supabase
      .from('eventos')
      .update({ monto_total: parseFloat(montoTotal), estado: 'en_pago' })
      .eq('id', eventoId)
      .select('*')
      .single()

    if (eventoError) {
      console.error('Error actualizando evento:', eventoError)
      setConfirmandoCuota(false)
      setErrorAdmin('No se pudo guardar el monto total en el cumpleaños.')
      return
    }

    const { error: participantesRegaloError } = await supabase
      .from('participantes')
      .update({ cuota: cuotaCalculada })
      .eq('evento_id', eventoId)
      .neq('participa_regalo', false)

    const { error: participantesSinRegaloError } = await supabase
      .from('participantes')
      .update({ cuota: 0 })
      .eq('evento_id', eventoId)
      .eq('participa_regalo', false)

    const { error: externosRegaloError } = await supabase
      .from('invitados_externos')
      .update({ cuota: cuotaCalculada })
      .eq('evento_id', eventoId)
      .eq('participa_regalo', true)

    const { error: externosSinRegaloError } = await supabase
      .from('invitados_externos')
      .update({ cuota: 0 })
      .eq('evento_id', eventoId)
      .eq('participa_regalo', false)

    setConfirmandoCuota(false)

    if (participantesRegaloError || participantesSinRegaloError || externosRegaloError || externosSinRegaloError) {
      console.error('Error actualizando cuotas:', participantesRegaloError || participantesSinRegaloError || externosRegaloError || externosSinRegaloError)
      setErrorAdmin('Monto guardado, pero no se pudieron actualizar algunas cuotas.')
      return
    }

    logActivity(supabase, { accion: 'cambio_en_pago', tabla_afectada: 'eventos', registro_id: eventoId, rol: 'coordinador', nombre_usuario: '', curso_id: parseInt(cursoIdActivo, 10) || null, detalle: `cuota:${cuotaCalculada}` })
    setEvento(eventoActualizado)
    setParticipantes((prev) =>
      prev.map((p) => ({ ...p, cuota: p.participa_regalo === false ? 0 : cuotaCalculada }))
    )
    setInvitadosExternos((prev) =>
      prev.map((inv) => ({ ...inv, cuota: inv.participa_regalo ? cuotaCalculada : 0 }))
    )
    setMensajeAdmin(
      `Cuota de $${cuotaCalculada.toLocaleString('es-CL')} confirmada. El cumpleaños paso a estado "en_pago".`
    )
  }

  const participantesRegalo = participantes.filter((p) => p.participa_regalo !== false)
  const participantesSoloCumple = participantes.filter((p) => p.participa_regalo === false)
  const externosRegalo = invitadosExternos.filter((inv) => inv.participa_regalo)
  const todosHanPagado =
    (participantesRegalo.length > 0 || externosRegalo.length > 0) &&
    participantesRegalo.every((p) => p.estado === 'pagado') &&
    externosRegalo.every((inv) => inv.estado === 'pagado')

  const marcarComoCompletado = async () => {
    setCompletandoEvento(true)
    setErrorAdmin('')
    setMensajeAdmin('')

    const eventoId = parseInt(id, 10)
    const { data, error: updateError } = await supabase
      .from('eventos')
      .update({ estado: 'completado' })
      .eq('id', eventoId)
      .select('*')
      .single()

    setCompletandoEvento(false)

    if (updateError) {
      console.error('Error completando evento:', updateError)
      setErrorAdmin('No se pudo marcar el cumpleaños como completado.')
      return
    }

    logActivity(supabase, { accion: 'evento_completado', tabla_afectada: 'eventos', registro_id: eventoId, rol: 'coordinador', nombre_usuario: '', curso_id: parseInt(cursoIdActivo, 10) || null, detalle: null })
    setEvento(data)
    setMensajeAdmin('🎉 ¡Cumpleaños completado! Todos los pagos fueron confirmados.')
  }

  const retrocederEstado = async () => {
    const mapRetroceso = {
      completado: 'en_pago',
      en_pago: 'cerrado',
      cerrado: 'abierto'
    }
    const estadoAnterior = mapRetroceso[estadoEventoNormalizado]
    if (!estadoAnterior) return
    if (!window.confirm('¿Estás seguro que quieres retroceder el estado?')) return

    setRetrocediendoEstado(true)
    setErrorAdmin('')
    setMensajeAdmin('')

    const eventoId = parseInt(id, 10)
    const { data, error: updateError } = await supabase
      .from('eventos')
      .update({ estado: estadoAnterior })
      .eq('id', eventoId)
      .select('*')
      .single()

    setRetrocediendoEstado(false)

    if (updateError) {
      console.error('Error retrocediendo estado:', updateError)
      setErrorAdmin('No se pudo retroceder el estado del cumpleaños.')
      return
    }

    logActivity(supabase, { accion: 'retroceso_estado', tabla_afectada: 'eventos', registro_id: eventoId, rol: 'coordinador', nombre_usuario: '', curso_id: parseInt(cursoIdActivo, 10) || null, detalle: `de ${estadoEventoNormalizado} a ${estadoAnterior}` })
    setEvento(data)
    setMensajeAdmin(`Estado retrocedido a "${estadoAnterior}".`)
  }

  const guardarCuenta = async () => {
    setGuardandoCuenta(true)
    setErrorCuenta('')
    const eventoId = parseInt(id, 10)
    const { data, error: updateError } = await supabase
      .from('eventos')
      .update({
        nombre_coordinador: editCuenta.nombre_coordinador.trim(),
        rut_coordinador: editCuenta.rut_coordinador.trim(),
        banco: editCuenta.banco.trim(),
        tipo_cuenta: editCuenta.tipo_cuenta.trim(),
        numero_cuenta: editCuenta.numero_cuenta.trim(),
        email_pago: editCuenta.email_pago.trim()
      })
      .eq('id', eventoId)
      .select('*')
      .single()
    setGuardandoCuenta(false)
    if (updateError) {
      console.error('Error actualizando cuenta:', updateError)
      setErrorCuenta('No se pudo guardar los datos de la cuenta.')
      return
    }
    logActivity(supabase, { accion: 'edicion_cuenta', tabla_afectada: 'eventos', registro_id: eventoId, rol: 'coordinador', nombre_usuario: '', curso_id: parseInt(cursoIdActivo, 10) || null, detalle: null })
    setEvento(data)
    setModalCuentaAbierto(false)
  }

  const activarInvitacionesExternas = async () => {
    setActivandoToken(true)
    const nuevoToken = crypto.randomUUID()
    const eventoId = parseInt(id, 10)
    const { data, error: updateError } = await supabase
      .from('eventos')
      .update({ token_invitacion: nuevoToken })
      .eq('id', eventoId)
      .select('*')
      .single()
    setActivandoToken(false)
    if (updateError) {
      console.error('Error activando invitaciones externas:', updateError)
      setErrorAdmin('No se pudo activar las invitaciones externas.')
      return
    }
    setEvento(data)
  }

  const copiarLinkInvitacion = () => {
    const link = `https://micurso.netlify.app/invitacion/${evento.token_invitacion}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiadoLink(true)
      setTimeout(() => setCopiadoLink(false), 2000)
    })
  }

  const cambiarEstadoPagoExterno = async (invitadoId, nuevoEstado) => {
    setActualizandoPagoExternoId(invitadoId)
    const { data, error: updateError } = await supabase
      .from('invitados_externos')
      .update({ estado_pago: nuevoEstado })
      .eq('id', invitadoId)
      .select('*')
      .single()
    setActualizandoPagoExternoId(null)
    if (updateError) {
      console.error('Error actualizando estado de pago externo:', updateError)
      return
    }
    setInvitadosExternos((prev) => prev.map((inv) => (inv.id === invitadoId ? { ...inv, ...data } : inv)))
  }

  const desinscribirInvitadoExterno = async (invitadoId, nombreInvitado) => {
    setDesinscribiendoExternoId(invitadoId)
    const { error: deleteError } = await supabase
      .from('invitados_externos')
      .delete()
      .eq('id', invitadoId)
    setDesinscribiendoExternoId(null)
    if (deleteError) {
      console.error('Error desinscribiendo invitado externo:', deleteError)
      return
    }
    logActivity(supabase, { accion: 'desinscripcion_externo', tabla_afectada: 'invitados_externos', registro_id: invitadoId, rol: 'coordinador', nombre_usuario: '', curso_id: parseInt(cursoIdActivo, 10) || null, detalle: nombreInvitado || null })
    setInvitadosExternos((prev) => prev.filter((inv) => inv.id !== invitadoId))
  }

  const resetearParticipacionLocal = () => {
    setMiParticipacion(null)
    if (esApoderado && alumnoApoderadoId) {
      setSelectedParticipante(String(alumnoApoderadoId))
    } else {
      setSelectedParticipante('')
    }
    setNombreParticipante('')
    setComprobanteFile(null)
    setErrorFlujo('')
    setMensajeFlujo('Puedes registrar la participacion de otro apoderado.')
    window.localStorage.removeItem(localStorageKey)
  }

  const toggleDetalleParticipante = (participanteId) => {
    setDetalleParticipanteAbiertoId((prev) => (prev === participanteId ? null : participanteId))
  }

  const desinscribirParticipante = async (participanteId) => {
    setErrorAdmin('')
    setMensajeAdmin('')
    setErrorFlujo('')
    setMensajeFlujo('')
    setDesinscribiendoId(participanteId)

    const { error: deleteError } = await supabase
      .from('participantes')
      .delete()
      .eq('id', participanteId)

    setDesinscribiendoId(null)

    if (deleteError) {
      console.error('Error desinscribiendo participante:', deleteError)
      setErrorAdmin('No se pudo desinscribir al participante.')
      setErrorFlujo('No se pudo desinscribir al participante.')
      return
    }

    logActivity(supabase, { accion: 'desinscripcion', tabla_afectada: 'participantes', registro_id: participanteId, rol: rolIngreso || 'coordinador', nombre_usuario: '', curso_id: parseInt(cursoIdActivo, 10) || null, detalle: `evento_id:${id}` })
    setParticipantes((prev) => prev.filter((p) => p.id !== participanteId))
    if (detalleParticipanteAbiertoId === participanteId) {
      setDetalleParticipanteAbiertoId(null)
    }
    if (miParticipacion?.id === participanteId) {
      setMiParticipacion(null)
      window.localStorage.removeItem(localStorageKey)
    }
    setMensajeAdmin('Participante desinscrito correctamente.')
    setMensajeFlujo('Alumno desinscrito correctamente.')
  }

  const subirComprobanteSeleccionado = async (participante) => {
    setErrorFlujo('')
    setMensajeFlujo('')

    if (!participante?.id) {
      setErrorFlujo('No se pudo identificar al participante seleccionado.')
      return
    }

    if (String(estadoEvento).toLowerCase() !== 'en_pago') {
      setErrorFlujo('Solo puedes subir o cambiar comprobante cuando el cumpleaños está en pago.')
      return
    }

    if (!comprobanteFileSeleccionado) {
      setErrorFlujo('Selecciona una imagen para subir tu comprobante.')
      return
    }

    if (!comprobanteFileSeleccionado.type.startsWith('image/')) {
      setErrorFlujo('El archivo debe ser una imagen.')
      return
    }

    const extension = comprobanteFileSeleccionado.name.split('.').pop()?.toLowerCase() || 'jpg'
    const nombreArchivo = `${id}/participante_${participante.id}_${Date.now()}.${extension}`

    setSubiendoComprobanteDetalleId(participante.id)

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(nombreArchivo, comprobanteFileSeleccionado, { upsert: true })

    if (uploadError) {
      console.error('Error subiendo comprobante de participante seleccionado:', uploadError)
      setSubiendoComprobanteDetalleId(null)
      setErrorFlujo('No se pudo subir el comprobante. Intenta nuevamente.')
      return
    }

    const { data: publicUrlData } = supabase.storage.from(storageBucket).getPublicUrl(nombreArchivo)
    const urlComprobante = publicUrlData?.publicUrl || ''

    const { data: participanteActualizado, error: updateError } = await supabase
      .from('participantes')
      .update({ imagen_comprobante: urlComprobante, estado: 'comprobante_subido' })
      .eq('id', participante.id)
      .select('*')
      .single()

    setSubiendoComprobanteDetalleId(null)

    if (updateError) {
      console.error('Error actualizando comprobante del participante seleccionado:', updateError)
      setErrorFlujo('No se pudo guardar el comprobante en participantes.')
      return
    }

    const participanteConNombre = {
      ...participanteActualizado,
      alumnoNombre: participante.alumnoNombre || participante.nombre_participante || 'Sin nombre'
    }

    setParticipantes((prev) => prev.map((p) => (p.id === participante.id ? participanteConNombre : p)))
    if (miParticipacion?.id === participante.id) {
      setMiParticipacion(participanteConNombre)
    }
    setComprobanteFileSeleccionado(null)
    setMensajeFlujo('Comprobante actualizado correctamente para el alumno seleccionado.')
  }

  const subirFotoBoleta = async () => {
    setErrorAdmin('')
    setMensajeAdmin('')

    if (!boletaFile) {
      setErrorAdmin('Selecciona una imagen de la boleta para subir.')
      return
    }

    if (!boletaFile.type.startsWith('image/')) {
      setErrorAdmin('La boleta debe ser un archivo de imagen.')
      return
    }

    const extension = boletaFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const nombreArchivo = `${id}/boleta_${Date.now()}.${extension}`

    setSubiendoBoleta(true)

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(nombreArchivo, boletaFile, { upsert: true })

    setSubiendoBoleta(false)

    if (uploadError) {
      console.error('Error subiendo boleta:', uploadError)
      setErrorAdmin('No se pudo subir la boleta. Intenta nuevamente.')
      return
    }

    const { data: publicUrlData } = supabase.storage.from(storageBucket).getPublicUrl(nombreArchivo)
    const url = publicUrlData?.publicUrl || ''
    setBoletaUrl(url)
    window.localStorage.setItem(boletaStorageKey, url)
    setBoletaFile(null)
    setMensajeAdmin('Foto de boleta subida correctamente.')
  }

  const subirFotoRegalo = async () => {
    setErrorAdmin('')
    setMensajeAdmin('')

    if (!regaloFile) {
      setErrorAdmin('Selecciona una imagen del regalo para subir.')
      return
    }

    if (!regaloFile.type.startsWith('image/')) {
      setErrorAdmin('La foto del regalo debe ser un archivo de imagen.')
      return
    }

    const extension = regaloFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const nombreArchivo = `${id}/regalo_${Date.now()}.${extension}`

    setSubiendoRegalo(true)

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(nombreArchivo, regaloFile, { upsert: true })

    setSubiendoRegalo(false)

    if (uploadError) {
      console.error('Error subiendo foto de regalo:', uploadError)
      setErrorAdmin('No se pudo subir la foto del regalo. Intenta nuevamente.')
      return
    }

    const { data: publicUrlData } = supabase.storage.from(storageBucket).getPublicUrl(nombreArchivo)
    const url = publicUrlData?.publicUrl || ''
    setRegaloUrl(url)
    window.localStorage.setItem(regaloStorageKey, url)
    setRegaloFile(null)
    setMensajeAdmin('Foto del regalo subida correctamente.')
  }

  return (
    <div className="page-container">
      <PageTopBar />

      <h1 className="page-title">Detalle del Cumpleaños</h1>

      {loading && <p style={{ marginTop: '1.5rem' }}>Cargando detalle...</p>}

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

      {!loading && !error && evento && (
        <>
          <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
            <h3 className="upcoming-title">Informacion del Cumpleaños</h3>
            <div className="event-item">
              <div className="event-details">Fecha: {formatFecha(fechaEvento)}</div>
              <div className="event-details">
                Descripcion: {evento.descripcion_regalo || evento.descripcion || 'Sin descripcion'}
              </div>
              <div className="event-details">Cuota minima: {cuotaMin}</div>
              <div className="event-details">Cuota maxima: {cuotaMax}</div>
              {participantes.length > 0 && participantes[0]?.cuota > 0 && (
                <div className="event-details">Cuota por participante: <strong>${participantes[0].cuota.toLocaleString('es-CL')}</strong></div>
              )}
              <div className="event-details">Estado: {estadoEvento}</div>
            </div>
          </div>

          <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
            <h3 className="upcoming-title">Participacion de Apoderados</h3>
            <div className="event-item">
              {esAdmin && !miParticipacion && (
                <div className="participacion-form">
                  <>
                    <label htmlFor="alumnoParticipante" className="participacion-label">
                      Agregar alumno participante
                    </label>
                    <select
                      id="alumnoParticipante"
                      className="participacion-input"
                      value={selectedParticipante}
                      onChange={(e) => {
                        setSelectedParticipante(e.target.value)
                        if (e.target.value !== OTRO_INVITADO_VALUE) {
                          setNombreParticipante('')
                        }
                      }}
                    >
                      <option value="">Selecciona una opcion</option>
                      {alumnosDisponibles.map((alumno) => (
                        <option key={alumno.id} value={String(alumno.id)}>
                          {alumno.nombre}
                        </option>
                      ))}
                    </select>
                  </>

                  {esInvitadoExterno && (
                    <>
                      <label htmlFor="nombreParticipante" className="participacion-label">
                        Nombre invitado externo
                      </label>
                      <input
                        id="nombreParticipante"
                        type="text"
                        className="participacion-input"
                        placeholder="Ej: Maria Gonzalez"
                        value={nombreParticipante}
                        onChange={(e) => setNombreParticipante(e.target.value)}
                      />
                    </>
                  )}

                  {!esInvitadoExterno && participanteSeleccionado && (
                    <div className="participante-detalle-box">
                      <div className="event-details">Este alumno ya está inscrito en este cumpleaños.</div>
                      <div className="event-details">Estado actual: {formatEstadoPago(participanteSeleccionado)}</div>
                      <div className="event-details">
                        Tipo de participación: {participanteSeleccionado.participa_regalo === false ? 'Solo cumpleaños' : 'Cumpleaños + regalo'}
                      </div>

                      {String(estadoEvento).toLowerCase() === 'en_pago' && participanteSeleccionado.participa_regalo !== false && (
                        <>
                          <label htmlFor="comprobanteSeleccionado" className="participacion-label">
                            Subir o cambiar comprobante de este alumno
                          </label>
                          <input
                            id="comprobanteSeleccionado"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setComprobanteFileSeleccionado(e.target.files?.[0] || null)}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={subiendoComprobanteDetalleId === participanteSeleccionado.id}
                            onClick={() => subirComprobanteSeleccionado(participanteSeleccionado)}
                          >
                            {subiendoComprobanteDetalleId === participanteSeleccionado.id
                              ? 'Subiendo...'
                              : 'Subir / cambiar comprobante'}
                          </button>
                          {(participanteSeleccionado.imagen_comprobante || participanteSeleccionado.comprobante_url) && (
                            <a
                              href={participanteSeleccionado.imagen_comprobante || participanteSeleccionado.comprobante_url}
                              target="_blank"
                              rel="noreferrer"
                              className="comprobante-link"
                            >
                              Ver comprobante actual
                            </a>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        className="btn btn-rechazar btn-small"
                        disabled={desinscribiendoId === participanteSeleccionado.id}
                        onClick={() => desinscribirParticipante(participanteSeleccionado.id)}
                      >
                        {desinscribiendoId === participanteSeleccionado.id ? 'Desinscribiendo...' : 'Desinscribir'}
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={confirmarParticipacion}
                    disabled={confirmandoParticipacion || Boolean(participanteSeleccionado) || !puedeInscribirParticipantes}
                  >
                    {confirmandoParticipacion ? 'Confirmando...' : 'Agregar participante'}
                  </button>

                  {!puedeInscribirParticipantes && (
                    <p
                      className="mensaje-error"
                      style={{
                        marginTop: '0.75rem',
                        background: '#ffffff',
                        border: '1px solid #dc3545',
                        borderRadius: '999px',
                        padding: '0.65rem 1rem',
                        textAlign: 'center'
                      }}
                    >
                      Este cumpleaños ya no está abierto. Solo el administrador puede agregar participantes.
                    </p>
                  )}
                </div>
              )}

              {!esAdmin && (
                <div className="participacion-ok">
                  <div className="event-name">{cumpleanerosTitulo}</div>
                  <div className="event-details">Fecha: {formatFecha(fechaEvento)}</div>

                  {!miParticipacion && esEventoAbierto && (
                    <>
                      {!mostrarOpcionesInscripcion ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setMostrarOpcionesInscripcion(true)}
                        >
                          Inscribirse
                        </button>
                      ) : (
                        <div className="buttons-container" style={{ marginTop: '0.9rem', gap: '0.7rem' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={confirmandoParticipacion}
                            onClick={() => confirmarParticipacion(true)}
                          >
                            {confirmandoParticipacion ? 'Confirmando...' : 'Regalo y cumpleaños 🎁'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={confirmandoParticipacion}
                            onClick={() => confirmarParticipacion(false)}
                          >
                            {confirmandoParticipacion ? 'Confirmando...' : 'Solo cumpleaños 🎂'}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {!miParticipacion && !esEventoAbierto && (
                    <div className="event-details" style={{ marginTop: '0.7rem' }}>
                      Este cumpleaños no está disponible para nuevas inscripciones.
                    </div>
                  )}

                  {miParticipacion && esEventoAbierto && (
                    <div className="buttons-container" style={{ marginTop: '0.9rem', gap: '0.7rem' }}>
                      {miParticipaRegalo ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => cambiarParticipacionRegalo(false)}
                        >
                          Solo cumpleaños 🎂
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => cambiarParticipacionRegalo(true)}
                        >
                          Unirse al regalo 🎁
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-rechazar"
                        disabled={desinscribiendoId === miParticipacion.id}
                        onClick={() => desinscribirParticipante(miParticipacion.id)}
                      >
                        {desinscribiendoId === miParticipacion.id ? 'Desinscribiendo...' : 'Desinscribirse'}
                      </button>
                    </div>
                  )}

                  {miParticipacion && esEventoEnPago && miParticipaRegalo && estadoMiParticipacion === 'pendiente' && (
                    <div className="comprobante-box" style={{ marginTop: '0.85rem' }}>
                      {(evento.nombre_coordinador || evento.banco || evento.numero_cuenta) && (
                        <div style={{ marginBottom: '0.75rem', padding: '0.65rem 0.8rem', background: '#f0f4ff', borderRadius: '8px', fontSize: '0.83rem', lineHeight: 1.8, color: '#374151' }}>
                          <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Datos para transferencia</div>
                          {evento.nombre_coordinador && <div><strong>Nombre:</strong> {evento.nombre_coordinador}</div>}
                          {evento.rut_coordinador && <div><strong>RUT:</strong> {evento.rut_coordinador}</div>}
                          {evento.banco && <div><strong>Banco:</strong> {evento.banco}</div>}
                          {evento.tipo_cuenta && <div><strong>Tipo cuenta:</strong> {evento.tipo_cuenta}</div>}
                          {evento.numero_cuenta && <div><strong>N° cuenta:</strong> {evento.numero_cuenta}</div>}
                          {evento.email_pago && <div><strong>Email:</strong> {evento.email_pago}</div>}
                          {miParticipacion.cuota > 0 && <div style={{ marginTop: '0.3rem', fontWeight: 700 }}>Monto: ${miParticipacion.cuota.toLocaleString('es-CL')}</div>}
                        </div>
                      )}
                      <input
                        id="comprobanteFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={subirComprobante}
                        disabled={subiendoComprobante}
                      >
                        {subiendoComprobante ? 'Subiendo...' : 'Subir comprobante'}
                      </button>
                    </div>
                  )}

                  {miParticipacion && esEventoEnPago && miParticipaRegalo && estadoMiParticipacion === 'comprobante_subido' && (
                    <div className="event-details" style={{ marginTop: '0.7rem', fontWeight: 700 }}>
                      Esperando aprobación ⏳
                    </div>
                  )}

                  {miParticipacion && esEventoEnPago && miParticipaRegalo && estadoMiParticipacion === 'pagado' && (
                    <div className="event-details" style={{ marginTop: '0.7rem', fontWeight: 700 }}>
                      Pagado ✓
                    </div>
                  )}

                  {miParticipacion && esEventoEnPago && !miParticipaRegalo && (
                    <div className="event-details" style={{ marginTop: '0.7rem', fontWeight: 700 }}>
                      Anotado para el cumpleaños 🎂
                    </div>
                  )}

                  {miParticipacion && esEventoCompletado && estadoMiParticipacion === 'pagado' && (
                    <div className="event-details" style={{ marginTop: '0.7rem', fontWeight: 700 }}>
                      Pagado ✓
                    </div>
                  )}
                </div>
              )}

              {mensajeFlujo && <p className="mensaje-ok">{mensajeFlujo}</p>}
              {errorFlujo && <p className="mensaje-error">{errorFlujo}</p>}
            </div>
          </div>

          {esAdmin && (
            <div className="upcoming-events admin-panel" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <h3 className="upcoming-title" style={{ margin: 0 }}>Panel coordinador — Gestion del cumpleaños</h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPinCoordActual('')
                    setPinCoordNuevo('')
                    setConfirmarPinCoordNuevo('')
                    setErrorPinCoord('')
                    setMensajePinCoord('')
                    setModalPinCoordAbierto(true)
                  }}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  Cambiar PIN
                </button>
              </div>
              {mensajePinCoord && (
                <p className="mensaje-ok" style={{ margin: '0 0 0.5rem 0' }}>{mensajePinCoord}</p>
              )}

              <div className="admin-gestion-box">
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.9rem' }}>Invitaciones externas</p>
                  {evento.token_invitacion ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', color: '#374151', wordBreak: 'break-all' }}>
                        {`https://micurso.netlify.app/invitacion/${evento.token_invitacion}`}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={copiarLinkInvitacion}
                      >
                        {copiadoLink ? 'Copiado ✓' : 'Copiar link'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      disabled={activandoToken}
                      onClick={activarInvitacionesExternas}
                    >
                      {activandoToken ? 'Activando...' : 'Activar invitaciones externas'}
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Cuenta para transferencias</p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => {
                        setEditCuenta({
                          nombre_coordinador: evento.nombre_coordinador || '',
                          rut_coordinador: evento.rut_coordinador || '',
                          banco: evento.banco || '',
                          tipo_cuenta: evento.tipo_cuenta || '',
                          numero_cuenta: evento.numero_cuenta || '',
                          email_pago: evento.email_pago || ''
                        })
                        setErrorCuenta('')
                        setModalCuentaAbierto(true)
                      }}
                    >
                      Editar
                    </button>
                  </div>
                  <div style={{ fontSize: '0.83rem', color: '#374151', lineHeight: 1.7 }}>
                    <div><strong>Nombre:</strong> {evento.nombre_coordinador || <em style={{ color: '#9ca3af' }}>sin datos</em>}</div>
                    <div><strong>RUT:</strong> {evento.rut_coordinador || <em style={{ color: '#9ca3af' }}>sin datos</em>}</div>
                    <div><strong>Banco:</strong> {evento.banco || <em style={{ color: '#9ca3af' }}>sin datos</em>}</div>
                    <div><strong>Tipo cuenta:</strong> {evento.tipo_cuenta || <em style={{ color: '#9ca3af' }}>sin datos</em>}</div>
                    <div><strong>N° cuenta:</strong> {evento.numero_cuenta || <em style={{ color: '#9ca3af' }}>sin datos</em>}</div>
                    <div><strong>Email:</strong> {evento.email_pago || <em style={{ color: '#9ca3af' }}>sin datos</em>}</div>
                  </div>
                </div>

                {estadoEvento === 'abierto' && (
                  <button
                    type="button"
                    className="btn btn-cerrar-lista"
                    disabled={cerrandoLista}
                    onClick={cerrarLista}
                  >
                    {cerrandoLista ? 'Cerrando...' : 'Cerrar lista'}
                  </button>
                )}

                {estadoEvento === 'cerrado' && (
                  <div className="cuota-box">
                    <p className="admin-estado-badge">
                      Estado: <strong>{estadoEvento}</strong> — {participantes.length + invitadosExternos.length} participante{(participantes.length + invitadosExternos.length) !== 1 ? 's' : ''} registrado{(participantes.length + invitadosExternos.length) !== 1 ? 's' : ''} ({invitadosExternos.length} externo{invitadosExternos.length !== 1 ? 's' : ''})
                    </p>
                    <label htmlFor="montoTotal" className="participacion-label">
                      Monto total del regalo ($)
                    </label>
                    <input
                      id="montoTotal"
                      type="number"
                      min="1"
                      className="participacion-input"
                      placeholder="Ej: 50000"
                      value={montoTotal}
                      onChange={(e) => {
                        setMontoTotal(e.target.value)
                        setCuotaCalculada(null)
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={calcularCuota}
                    >
                      Calcular cuota
                    </button>

                    {cuotaCalculada !== null && (
                      <div className="cuota-resultado">
                        <span>Cuota por persona:</span>
                        <strong>${cuotaCalculada.toLocaleString('es-CL')}</strong>
                      </div>
                    )}

                    {cuotaCalculada !== null && (
                      <button
                        type="button"
                        className="btn btn-aprobar"
                        disabled={confirmandoCuota}
                        onClick={confirmarCuotaYPasarACobro}
                      >
                        {confirmandoCuota ? 'Guardando...' : 'Confirmar cuota y pasar a cobro'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn"
                      disabled={retrocediendoEstado}
                      onClick={retrocederEstado}
                      style={{ background: 'transparent', border: '1px solid #6b7280', color: '#6b7280', marginTop: '0.5rem' }}
                    >
                      {retrocediendoEstado ? 'Retrocediendo...' : 'Volver a abierto'}
                    </button>
                  </div>
                )}

                {estadoEvento === 'en_pago' && (
                  <div className="cuota-box">
                    <p className="admin-estado-badge">
                      Estado: <strong>{estadoEvento}</strong> — {participantes.length + invitadosExternos.length} participante{(participantes.length + invitadosExternos.length) !== 1 ? 's' : ''} registrado{(participantes.length + invitadosExternos.length) !== 1 ? 's' : ''} ({invitadosExternos.length} externo{invitadosExternos.length !== 1 ? 's' : ''})
                    </p>
                    {evento.monto_total && (
                      <div className="cuota-resultado">
                        <span>Cuota fijada:</span>
                        <strong>
                          ${Math.ceil(evento.monto_total / Math.max(participantesRegalo.length + invitadosExternos.filter((inv) => inv.participa_regalo).length, 1)).toLocaleString('es-CL')}
                        </strong>
                      </div>
                    )}
                    {evento.monto_total && (
                      <div className="cuota-resultado">
                        <span>Saldo por cobrar:</span>
                        <strong>
                          ${(
                            Math.ceil(evento.monto_total / Math.max(participantesRegalo.length + externosRegalo.length, 1)) *
                            (participantesRegalo.filter((p) => p.estado !== 'pagado').length +
                              externosRegalo.filter((inv) => inv.estado !== 'pagado').length)
                          ).toLocaleString('es-CL')}
                        </strong>
                      </div>
                    )}
                    <div className="completar-box">
                      {!todosHanPagado && (
                        <p className="completar-aviso">
                          Faltan {participantesRegalo.filter((p) => p.estado !== 'pagado').length + externosRegalo.filter((inv) => inv.estado !== 'pagado').length} pago{(participantesRegalo.filter((p) => p.estado !== 'pagado').length + externosRegalo.filter((inv) => inv.estado !== 'pagado').length) !== 1 ? 's' : ''} por aprobar.
                        </p>
                      )}
                      <button
                        type="button"
                        className="btn btn-completar"
                        disabled={!todosHanPagado || completandoEvento}
                        onClick={marcarComoCompletado}
                      >
                        {completandoEvento ? 'Guardando...' : 'Marcar como completado'}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      disabled={retrocediendoEstado}
                      onClick={retrocederEstado}
                      style={{ background: 'transparent', border: '1px solid #6b7280', color: '#6b7280', marginTop: '0.5rem' }}
                    >
                      {retrocediendoEstado ? 'Retrocediendo...' : 'Volver a cerrado'}
                    </button>
                  </div>
                )}

                {estadoEvento === 'completado' && (
                  <div className="cuota-box">
                    <div className="completado-celebracion">
                      🎉 ¡Cumpleaños completado! Todos los pagos fueron confirmados.
                    </div>

                    <button
                      type="button"
                      className="btn"
                      disabled={retrocediendoEstado}
                      onClick={retrocederEstado}
                      style={{ background: 'transparent', border: '1px solid #6b7280', color: '#6b7280', marginTop: '0.75rem' }}
                    >
                      {retrocediendoEstado ? 'Retrocediendo...' : 'Volver a en_pago'}
                    </button>

                    <div style={{ marginTop: '1rem' }}>
                      <label htmlFor="boletaFile" className="participacion-label">Foto de boleta</label>
                      <input
                        id="boletaFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBoletaFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        disabled={subiendoBoleta}
                        onClick={subirFotoBoleta}
                        style={{ marginTop: '0.5rem' }}
                      >
                        {subiendoBoleta ? 'Subiendo...' : 'Subir boleta'}
                      </button>
                      {boletaUrl && (
                        <a href={boletaUrl} target="_blank" rel="noreferrer" className="comprobante-link">
                          Ver foto de boleta
                        </a>
                      )}
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <label htmlFor="regaloFile" className="participacion-label">Foto del regalo</label>
                      <input
                        id="regaloFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setRegaloFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        disabled={subiendoRegalo}
                        onClick={subirFotoRegalo}
                        style={{ marginTop: '0.5rem' }}
                      >
                        {subiendoRegalo ? 'Subiendo...' : 'Subir foto regalo'}
                      </button>
                      {regaloUrl && (
                        <a href={regaloUrl} target="_blank" rel="noreferrer" className="comprobante-link">
                          Ver foto del regalo
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {mensajeAdmin && <p className="mensaje-ok" style={{ marginTop: '0.75rem' }}>{mensajeAdmin}</p>}
                {errorAdmin && <p className="mensaje-error" style={{ marginTop: '0.75rem' }}>{errorAdmin}</p>}
              </div>
            </div>
          )}

          <div className="upcoming-events" style={{ marginTop: '1.5rem' }}>
            <h3 className="upcoming-title">Participantes y Estado de Pago</h3>
            {participantes.length === 0 && invitadosExternos.length === 0 ? (
              <p style={{ margin: 0 }}>No hay participantes registrados todavia.</p>
            ) : (
              <>
                {esAdmin ? (
                  <>
                    <h4 className="upcoming-title" style={{ marginBottom: '0.4rem' }}>Regalo y cumpleaños 🎁</h4>
                    {participantesRegalo.length === 0 ? (
                      <p style={{ margin: '0 0 1rem 0' }}>No hay participantes en el regalo grupal.</p>
                    ) : (
                      <div style={{ marginBottom: '0.5rem' }}>
                        {[...participantesRegalo]
                          .sort((a, b) => {
                            const aPagado = getEstadoNormalizado(a) === 'pagado' ? 1 : 0
                            const bPagado = getEstadoNormalizado(b) === 'pagado' ? 1 : 0
                            return aPagado - bPagado
                          })
                          .map((participante, index) => {
                            const estadoNorm = getEstadoNormalizado(participante)
                            const esPagado = estadoNorm === 'pagado'
                            const esComprobanteSubido = estadoNorm === 'comprobante_subido'
                            return (
                              <div
                                key={participante.id ?? index}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.5rem',
                                  padding: '0.4rem 0',
                                  borderBottom: '1px solid #f0f0f0'
                                }}
                              >
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: esPagado ? '#2e7d32' : '#333', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {participante.nombre_participante || participante.alumnoNombre || 'Sin nombre'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                                  {(participante.imagen_comprobante || participante.comprobante_url) && (
                                    <a
                                      href={participante.imagen_comprobante || participante.comprobante_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ fontSize: '0.75rem', color: '#667eea' }}
                                    >
                                      Ver
                                    </a>
                                  )}
                                  {esComprobanteSubido && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-aprobar"
                                        disabled={actualizandoPagoId === participante.id}
                                        onClick={() => cambiarEstadoPago(participante.id, 'pagado')}
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                      >
                                        {actualizandoPagoId === participante.id ? '...' : 'Aprobar'}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-rechazar"
                                        disabled={actualizandoPagoId === participante.id}
                                        onClick={() => cambiarEstadoPago(participante.id, 'pendiente')}
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                      >
                                        {actualizandoPagoId === participante.id ? '...' : 'Rechazar'}
                                      </button>
                                    </>
                                  )}
                                  {!esComprobanteSubido && !esPagado && (
                                    <span style={{ fontSize: '0.75rem', color: '#999' }}>Pago pendiente</span>
                                  )}
                                  {esPagado && (
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2e7d32' }}>✓</span>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-rechazar btn-small"
                                    disabled={desinscribiendoId === participante.id}
                                    onClick={() => desinscribirParticipante(participante.id)}
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                                  >
                                    {desinscribiendoId === participante.id ? 'Desinscribiendo...' : 'Desinscribir'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}

                    <h4 className="upcoming-title" style={{ marginTop: '1.2rem', marginBottom: '0.4rem' }}>Solo cumpleaños 🎂</h4>
                    {participantesSoloCumple.length === 0 ? (
                      <p style={{ margin: 0 }}>No hay participantes de solo cumpleaños.</p>
                    ) : (
                      <div style={{ marginBottom: '0.5rem' }}>
                        {participantesSoloCumple.map((participante, index) => (
                          <div
                            key={participante.id ?? `solo-${index}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                              padding: '0.4rem 0',
                              borderBottom: '1px solid #f0f0f0'
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#333', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {participante.nombre_participante || participante.alumnoNombre || 'Sin nombre'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.72rem', color: '#664d03', background: '#fff3cd', border: '1px solid #ffe69c', borderRadius: '999px', padding: '0.15rem 0.45rem' }}>
                                Solo cumple
                              </span>
                              <button
                                type="button"
                                className="btn btn-rechazar btn-small"
                                disabled={desinscribiendoId === participante.id}
                                onClick={() => desinscribirParticipante(participante.id)}
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                              >
                                {desinscribiendoId === participante.id ? 'Desinscribiendo...' : 'Desinscribir'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <h4 className="upcoming-title" style={{ marginTop: '1.2rem', marginBottom: '0.4rem' }}>Invitados externos</h4>
                    {invitadosExternos.length === 0 ? (
                      <p style={{ margin: 0 }}>No hay invitados externos registrados.</p>
                    ) : (
                      <div>
                        {invitadosExternos.map((inv, index) => {
                          const esPagadoExt = inv.estado === 'pagado'
                          const esComprobanteSubidoExt = inv.estado === 'comprobante_subido'
                          return (
                            <div
                              key={inv.id ?? `ext-${index}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                padding: '0.4rem 0',
                                borderBottom: '1px solid #f0f0f0'
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: esPagadoExt ? '#2e7d32' : '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {inv.nombre_invitado || 'Sin nombre'}
                                </div>
                                {inv.nombre_apoderado && (
                                  <div style={{ fontSize: '0.73rem', color: '#888' }}>{inv.nombre_apoderado}</div>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.72rem', color: '#555' }}>
                                  {inv.participa_regalo ? '🎁' : '🎂'}
                                </span>
                                {(inv.imagen_comprobante || inv.comprobante_url) && (
                                  <a
                                    href={inv.imagen_comprobante || inv.comprobante_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '0.75rem', color: '#667eea' }}
                                  >
                                    Ver
                                  </a>
                                )}
                                {esComprobanteSubidoExt && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-aprobar"
                                      disabled={actualizandoPagoExternoId === inv.id}
                                      onClick={() => cambiarEstadoPagoExterno(inv.id, 'pagado')}
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                    >
                                      {actualizandoPagoExternoId === inv.id ? '...' : 'Aprobar'}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-rechazar"
                                      disabled={actualizandoPagoExternoId === inv.id}
                                      onClick={() => cambiarEstadoPagoExterno(inv.id, 'pendiente')}
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                    >
                                      {actualizandoPagoExternoId === inv.id ? '...' : 'Rechazar'}
                                    </button>
                                  </>
                                )}
                                {!esComprobanteSubidoExt && !esPagadoExt && (
                                  <span style={{ fontSize: '0.75rem', color: '#999' }}>Pago pendiente</span>
                                )}
                                {esPagadoExt && (
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2e7d32' }}>✓</span>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-rechazar"
                                  disabled={desinscribiendoExternoId === inv.id}
                                  onClick={() => desinscribirInvitadoExterno(inv.id, inv.nombre_invitado)}
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  {desinscribiendoExternoId === inv.id ? '...' : 'Desinscribir'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="events-list">
                    {participantes.map((participante, index) => (
                      <div key={participante.id ?? index} className="event-item admin-participante-row">
                        <div className="event-name">
                          {participante.nombre_participante || participante.alumnoNombre || 'Sin nombre'}
                        </div>
                        <div className="event-details">
                          Participación: {participante.participa_regalo === false ? 'Solo cumpleaños' : 'Cumpleaños + regalo'}
                        </div>
                        <div className="event-details">Estado: {formatEstadoPago(participante)}</div>

                        {(participante.imagen_comprobante || participante.comprobante_url) && (
                          <a
                            href={participante.imagen_comprobante || participante.comprobante_url}
                            target="_blank"
                            rel="noreferrer"
                            className="comprobante-link"
                          >
                            Ver comprobante
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {modalCuentaAbierto && (
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
              maxWidth: '380px',
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
              padding: '1.2rem',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#111827' }}>Editar cuenta</h3>

            <div className="form-group">
              <label htmlFor="editNombreCoord">Nombre</label>
              <input id="editNombreCoord" type="text" value={editCuenta.nombre_coordinador} onChange={(e) => setEditCuenta((prev) => ({ ...prev, nombre_coordinador: e.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="editRutCoord">RUT</label>
              <input id="editRutCoord" type="text" value={editCuenta.rut_coordinador} onChange={(e) => setEditCuenta((prev) => ({ ...prev, rut_coordinador: e.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="editBanco">Banco</label>
              <input id="editBanco" type="text" value={editCuenta.banco} onChange={(e) => setEditCuenta((prev) => ({ ...prev, banco: e.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="editTipoCuenta">Tipo de cuenta</label>
              <select id="editTipoCuenta" value={editCuenta.tipo_cuenta} onChange={(e) => setEditCuenta((prev) => ({ ...prev, tipo_cuenta: e.target.value }))}>
                <option value="">Selecciona</option>
                <option value="Cuenta Corriente">Cuenta Corriente</option>
                <option value="Cuenta Vista">Cuenta Vista</option>
                <option value="Cuenta de Ahorro">Cuenta de Ahorro</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="editNumeroCuenta">N° de cuenta</label>
              <input id="editNumeroCuenta" type="text" value={editCuenta.numero_cuenta} onChange={(e) => setEditCuenta((prev) => ({ ...prev, numero_cuenta: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="editEmailPago">Email</label>
              <input id="editEmailPago" type="email" value={editCuenta.email_pago} onChange={(e) => setEditCuenta((prev) => ({ ...prev, email_pago: e.target.value }))} />
            </div>

            {errorCuenta && (
              <p className="mensaje-error" style={{ marginTop: '0.3rem', marginBottom: '0.7rem' }}>{errorCuenta}</p>
            )}

            <div style={{ display: 'flex', gap: '0.55rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalCuentaAbierto(false)} style={{ flex: 1 }}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={guardarCuenta} disabled={guardandoCuenta} style={{ flex: 1 }}>
                {guardandoCuenta ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPinCoordAbierto && (
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
              padding: '1.2rem'
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#111827' }}>Cambiar mi PIN</h3>

            <div className="form-group">
              <label htmlFor="pinCoordActual">PIN actual</label>
              <input
                id="pinCoordActual"
                type="password"
                value={pinCoordActual}
                onChange={(e) => { setPinCoordActual(e.target.value); setErrorPinCoord('') }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="pinCoordNuevo">PIN nuevo</label>
              <input
                id="pinCoordNuevo"
                type="password"
                value={pinCoordNuevo}
                onChange={(e) => { setPinCoordNuevo(e.target.value); setErrorPinCoord('') }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="confirmarPinCoordNuevo">Confirmar PIN nuevo</label>
              <input
                id="confirmarPinCoordNuevo"
                type="password"
                value={confirmarPinCoordNuevo}
                onChange={(e) => { setConfirmarPinCoordNuevo(e.target.value); setErrorPinCoord('') }}
              />
            </div>

            {errorPinCoord && (
              <p className="mensaje-error" style={{ marginTop: '0.3rem', marginBottom: '0.7rem' }}>
                {errorPinCoord}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.55rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModalPinCoordAbierto(false)}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={cambiarPinCoordinador}
                disabled={cambiandoPinCoord}
                style={{ flex: 1 }}
              >
                {cambiandoPinCoord ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetalleEvento
