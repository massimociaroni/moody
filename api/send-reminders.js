import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:support@moody.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const MESSAGES_IT = [
  (name) => `Come stai, ${name}? 🌿`,
  (name) => `${name}, hai un minuto per te?`,
  (name) => `Pausa riflessione, ${name}. Come ti senti?`,
  (name) => `È ora del check-in, ${name} ✨`,
  (name) => `${name}, com'è il tuo umore adesso?`,
  (name) => `Fermati un secondo, ${name}. Come va?`,
  (name) => `${name}, come stai in questo momento?`,
]

const MESSAGES_EN = [
  (name) => `How are you feeling, ${name}? 🌿`,
  (name) => `${name}, take a moment for yourself.`,
  (name) => `Time for your check-in, ${name} ✨`,
  (name) => `Hey ${name}, how's your mood right now?`,
  (name) => `${name}, a quick check-in?`,
  (name) => `Pause for a second, ${name}. How are you?`,
  (name) => `${name}, how are you doing right now?`,
]

function pickMessage(messages, name) {
  const day = new Date().getDay()
  return messages[day % messages.length](name)
}

function localTimeForZone(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())
    const h = parts.find(p => p.type === 'hour')?.value
    const m = parts.find(p => p.type === 'minute')?.value
    return `${h}:${m}`
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, display_name, reminder_times, language, timezone')
    .eq('reminder_enabled', true)

  if (profilesErr) return res.status(500).json({ error: profilesErr.message })
  if (!profiles?.length) return res.json({ sent: 0, checked: 0 })

  const dueUsers = profiles.filter(p => {
    const tz = p.timezone || 'Europe/Rome'
    const localNow = localTimeForZone(tz)
    return localNow && p.reminder_times?.some(t => t === localNow)
  })

  if (!dueUsers.length) return res.json({ sent: 0, checked: profiles.length })

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', dueUsers.map(p => p.id))

  if (!subscriptions?.length) return res.json({ sent: 0, checked: profiles.length })

  const results = await Promise.allSettled(
    subscriptions.map(({ subscription, user_id }) => {
      const profile = dueUsers.find(p => p.id === user_id)
      const isIT = !profile?.language || profile.language === 'it'
      const name = profile?.display_name?.split(' ')[0] || (isIT ? 'tu' : 'you')
      const messages = isIT ? MESSAGES_IT : MESSAGES_EN
      const body = pickMessage(messages, name)

      return webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: '🧠 Moody',
          body,
          actions: [{ action: 'log', title: isIT ? '📝 Registra ora' : '📝 Log now' }],
        })
      )
    })
  )

  // Remove stale subscriptions (410 Gone = user revoked permission)
  const staleEndpoints = []
  results.forEach((r, i) => {
    if (r.status === 'rejected' && r.reason?.statusCode === 410) {
      staleEndpoints.push(subscriptions[i].subscription?.endpoint)
    }
  })
  if (staleEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
  }

  const sent = results.filter(r => r.status === 'fulfilled').length
  return res.json({ sent, checked: profiles.length, due: dueUsers.length })
}
