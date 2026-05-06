import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const hasUrl = !!process.env.SUPABASE_URL
  const hasKey = !!process.env.SUPABASE_SERVICE_KEY

  const { token } = req.query
  if (!token) {
    const { count } = await supabase.from('share_tokens').select('*', { count: 'exact', head: true })
    return res.status(400).json({ error: 'Token mancante', env: { hasUrl, hasKey }, tokenCount: count })
  }

  const { data: shareToken, error: tokenErr } = await supabase
    .from('share_tokens')
    .select('user_id, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenErr) {
    console.error('share_tokens query error:', tokenErr)
    return res.status(500).json({ error: 'Errore server', detail: tokenErr.message })
  }
  if (!shareToken) return res.status(404).json({ error: 'Link non valido', env: { hasUrl, hasKey }, tokenLen: token.length })
  if (new Date(shareToken.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Link scaduto' })
  }

  const [{ data: profile }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('display_name, language').eq('id', shareToken.user_id).single(),
    supabase.from('mood_entries').select('value, note, created_at').eq('user_id', shareToken.user_id).order('created_at', { ascending: true }),
  ])

  return res.json({
    name: profile?.display_name || '',
    language: profile?.language || 'it',
    entries: entries || [],
    expiresAt: shareToken.expires_at,
  })
}
