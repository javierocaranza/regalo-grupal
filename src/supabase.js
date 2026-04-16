import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mxnthzpwtdoefergbgsk.supabase.co'
const supabaseKey = 'sb_publishable_YWXp_0mTasRJKOrpeqLDvA_bjR7I7Lm'

export const supabase = createClient(supabaseUrl, supabaseKey)

export function getCursoToken() {
  return window.localStorage.getItem('cursoToken')
}