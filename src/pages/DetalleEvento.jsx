import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../supabase.js'
import PageTopBar from './PageTopBar.jsx'
import './pages.css'

function DetalleEvento() {
  const navigate = useNavigate()
  const { id } = useParams()
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

  const storageBucket = 'comprobantes'
  const localStorageKey = `participacion_evento_${id}`
  const boletaStorageKey = `evento_${id}_boleta_url`
  const regaloStorageKey = `evento_${id}_regalo_url`

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
        setError('ID de evento invalido.')
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
        setError('No se pudo cargar el detalle del evento.')
        setLoading(false)
        return
      }

      setEvento(eventoData)

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

  const confirmarParticipacion = async () => {
    setErrorFlujo('')
    setMensajeFlujo('')

    const eventoId = parseInt(id, 10)
    if (!eventoId) {
      setErrorFlujo('No se pudo identificar el evento.')
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
      participa_regalo: participaRegaloSeleccion === 'true'
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

    setMiParticipacion({ ...nuevoParticipante, id: participanteIdCreado })
    setParticipantes((prev) => [nuevoParticipante, ...prev])
    if (esInvitadoExterno) {
      setNombreParticipante(nombreManual)
    } else {
      setNombreParticipante('')
    }
    window.localStorage.setItem(localStorageKey, String(participanteIdCreado))
    setMensajeFlujo(
      payloadBase.participa_regalo
        ? 'Tu participacion fue confirmada con estado pendiente.'
        : 'Tu participación fue confirmada solo para el cumpleaños.'
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
    if (participantesRegalo.length === 0) {
      setErrorAdmin('No hay participantes que aporten al regalo para calcular la cuota.')
      return
    }
    setCuotaCalculada(Math.ceil(monto / participantesRegalo.length))
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
      setErrorAdmin('No se pudo guardar el monto total en el evento.')
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

    setConfirmandoCuota(false)

    if (participantesRegaloError || participantesSinRegaloError) {
      console.error('Error actualizando cuotas:', participantesRegaloError || participantesSinRegaloError)
      setErrorAdmin('Monto guardado, pero no se pudieron actualizar las cuotas en participantes.')
      return
    }

    setEvento(eventoActualizado)
    setParticipantes((prev) =>
      prev.map((p) => ({ ...p, cuota: p.participa_regalo === false ? 0 : cuotaCalculada }))
    )
    setMensajeAdmin(
      `Cuota de $${cuotaCalculada.toLocaleString('es-CL')} confirmada. El evento paso a estado "en_pago".`
    )
  }

  const participantesRegalo = participantes.filter((p) => p.participa_regalo !== false)
  const todosHanPagado =
    participantesRegalo.length > 0 && participantesRegalo.every((p) => p.estado === 'pagado')

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
      setErrorAdmin('No se pudo marcar el evento como completado.')
      return
    }

    setEvento(data)
    setMensajeAdmin('🎉 ¡Evento completado! Todos los pagos fueron confirmados.')
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
      setErrorFlujo('Solo puedes subir o cambiar comprobante cuando el evento está en pago.')
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
              {!miParticipacion && (
                <div className="participacion-form">
                  {esApoderado ? (
                    <>
                      <label className="participacion-label">Alumno seleccionado</label>
                      <div className="participacion-input" style={{ background: '#f8f9fa', cursor: 'not-allowed' }}>
                        {alumnoApoderadoNombre || 'Alumno seleccionado'}
                      </div>
                    </>
                  ) : (
                    <>
                      <label htmlFor="alumnoParticipante" className="participacion-label">
                        {esAdmin ? 'Agregar alumno participante' : 'Selecciona alumno participante'}
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
                        {!esAdmin && <option value={OTRO_INVITADO_VALUE}>Otro (invitado externo)</option>}
                      </select>
                    </>
                  )}

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
                      <div className="event-details">Este alumno ya está inscrito en este evento.</div>
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

                  {!esAdmin && (
                    <div className="participante-detalle-box" style={{ marginTop: '0.75rem' }}>
                      <div className="event-details" style={{ marginBottom: '0.35rem' }}>
                        ¿Cómo participarás?
                      </div>
                      <label className="event-details" style={{ display: 'block', marginBottom: '0.25rem' }}>
                        <input
                          type="radio"
                          name="participaRegalo"
                          value="true"
                          checked={participaRegaloSeleccion === 'true'}
                          onChange={(e) => setParticipaRegaloSeleccion(e.target.value)}
                        />{' '}
                        Participo en el cumpleaños y en el regalo 🎁
                      </label>
                      <label className="event-details" style={{ display: 'block' }}>
                        <input
                          type="radio"
                          name="participaRegalo"
                          value="false"
                          checked={participaRegaloSeleccion === 'false'}
                          onChange={(e) => setParticipaRegaloSeleccion(e.target.value)}
                        />{' '}
                        Solo voy al cumpleaños, sin regalo
                      </label>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={confirmarParticipacion}
                    disabled={confirmandoParticipacion || Boolean(participanteSeleccionado) || !puedeInscribirParticipantes}
                  >
                    {confirmandoParticipacion ? 'Confirmando...' : 'Confirmar mi participacion'}
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

              {!esAdmin && miParticipacion && (
                <div className="participacion-ok">
                  <div className="event-name">Participacion confirmada</div>
                  <div className="event-details">
                    Nombre: {miParticipacion.nombre_participante || miParticipacion.alumnoNombre || nombreParticipante}
                  </div>
                  <div className="event-details">Estado: {miParticipacion.estado || 'pendiente'}</div>
                  <div className="event-details">
                    Tipo de participación: {miParticipacion.participa_regalo === false ? 'Solo cumpleaños' : 'Cumpleaños + regalo'}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={resetearParticipacionLocal}
                  >
                    Soy otro apoderado
                  </button>

                  {miParticipacion.participa_regalo !== false ? (
                    <>
                      <div className="pago-datos-card">
                        <div className="pago-datos-title">Datos de pago del coordinador</div>
                        <div className="event-details">Banco: {evento.banco || 'No definido'}</div>
                        <div className="event-details">
                          Tipo de cuenta: {evento.tipo_cuenta || evento.tipoCuenta || 'No definido'}
                        </div>
                        <div className="event-details">
                          Numero de cuenta: {evento.numero_cuenta || evento.numeroCuenta || 'No definido'}
                        </div>
                        <div className="event-details">Email: {evento.email_pago || evento.email || 'No definido'}</div>
                      </div>

                      <div className="comprobante-box">
                        <label htmlFor="comprobanteFile" className="participacion-label">
                          Sube una imagen de tu comprobante
                        </label>
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
                        {(miParticipacion.imagen_comprobante || miParticipacion.comprobante_url) && (
                          <a
                            href={miParticipacion.imagen_comprobante || miParticipacion.comprobante_url}
                            target="_blank"
                            rel="noreferrer"
                            className="comprobante-link"
                          >
                            Ver comprobante subido
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="event-details" style={{ marginTop: '0.5rem' }}>
                      Estás anotado para el cumpleaños. No necesitas realizar pago ni subir comprobante.
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
              <h3 className="upcoming-title">Panel coordinador — Gestion del cumpleaños</h3>

              <div className="admin-gestion-box">
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
                      Estado: <strong>{estadoEvento}</strong> — {participantes.length} participante{participantes.length !== 1 ? 's' : ''} registrado{participantes.length !== 1 ? 's' : ''}
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
                  </div>
                )}

                {estadoEvento === 'en_pago' && (
                  <div className="cuota-box">
                    <p className="admin-estado-badge">
                      Estado: <strong>{estadoEvento}</strong> — {participantes.length} participante{participantes.length !== 1 ? 's' : ''} registrado{participantes.length !== 1 ? 's' : ''}
                    </p>
                    {evento.monto_total && (
                      <div className="cuota-resultado">
                        <span>Cuota fijada:</span>
                        <strong>
                          ${Math.ceil(evento.monto_total / Math.max(participantesRegalo.length, 1)).toLocaleString('es-CL')}
                        </strong>
                      </div>
                    )}
                    <div className="completar-box">
                      {!todosHanPagado && (
                        <p className="completar-aviso">
                          Faltan {participantesRegalo.filter((p) => p.estado !== 'pagado').length} pago{participantesRegalo.filter((p) => p.estado !== 'pagado').length !== 1 ? 's' : ''} por aprobar.
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
                  </div>
                )}

                {estadoEvento === 'completado' && (
                  <div className="cuota-box">
                    <div className="completado-celebracion">
                      🎉 ¡Cumpleaños completado! Todos los pagos fueron confirmados.
                    </div>

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
            {participantes.length === 0 ? (
              <p style={{ margin: 0 }}>No hay participantes registrados todavia.</p>
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

                    {getEstadoNormalizado(participante) === 'comprobante_subido' && (
                      <>
                        {!(participante.imagen_comprobante || participante.comprobante_url) && (
                          <div className="event-details">No hay URL de comprobante disponible.</div>
                        )}
                        {esAdmin && (
                          <div className="admin-acciones">
                            <button
                              type="button"
                              className="btn btn-aprobar"
                              disabled={actualizandoPagoId === participante.id}
                              onClick={() => cambiarEstadoPago(participante.id, 'pagado')}
                            >
                              {actualizandoPagoId === participante.id ? '...' : 'Aprobar'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-rechazar"
                              disabled={actualizandoPagoId === participante.id}
                              onClick={() => cambiarEstadoPago(participante.id, 'pendiente')}
                            >
                              {actualizandoPagoId === participante.id ? '...' : 'Rechazar'}
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {esAdmin && (
                      <button
                        type="button"
                        className="btn btn-rechazar btn-small"
                        disabled={desinscribiendoId === participante.id}
                        onClick={() => desinscribirParticipante(participante.id)}
                      >
                        {desinscribiendoId === participante.id ? 'Desinscribiendo...' : 'Desinscribir'}
                      </button>
                    )}

                    {esAdmin && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => toggleDetalleParticipante(participante.id)}
                      >
                        {detalleParticipanteAbiertoId === participante.id ? 'Ocultar detalle' : 'Ver detalle'}
                      </button>
                    )}

                    {esAdmin && detalleParticipanteAbiertoId === participante.id && (
                      <div className="participante-detalle-box">
                        <div className="event-details">
                          ID participante: {participante.id}
                        </div>
                        <div className="event-details">
                          Estado actual: {formatEstadoPago(participante)}
                        </div>

                        <div className="event-details">Revisa el comprobante y gestiona el estado directamente en la tarjeta principal.</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default DetalleEvento
