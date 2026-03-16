import { createClient } from './supabase'
import { Track } from '@/types'

export interface HistoryEntry {
  id: string
  user_id: string
  date: string
  emotion: string
  summary: string
  keywords: string[]
  playlist_name: string
  tracks: Track[]
  country: string
  created_at: string
}

export async function saveEntry(entry: Omit<HistoryEntry, 'id' | 'user_id' | 'created_at'>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { error } = await supabase
    .from('mood_history')
    .insert({ ...entry, user_id: session.user.id })

  if (error) throw error
}

export async function getEntries() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('mood_history')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return data as HistoryEntry[]
}

export async function getEntryByDate(date: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('mood_history')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (error) throw error
  return data as HistoryEntry | null
}

export async function deleteEntry(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('mood_history')
    .delete()
    .eq('id', id)

  if (error) throw error
}