export async function logActivity(supabase, {
  accion,
  tabla_afectada,
  registro_id,
  rol,
  nombre_usuario,
  curso_id,
  detalle
}) {
  await supabase.from('activity_log').insert({
    accion,
    tabla_afectada,
    registro_id,
    rol,
    nombre_usuario,
    curso_id,
    detalle
  })
}
