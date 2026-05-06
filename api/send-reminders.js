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

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mm = String(now.getUTCMinutes()).padStart(2, '0')
  const currentTime = `${hh}:${mm}`

  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, reminder_times, language')
    .eq('reminder_enabled', true)

  if (profilesErr) return res.status(500).json({ error: profilesErr.message })
  if (!profiles?.length) return res.json({ sent: 0, checked: 0 })

  // Match users whose reminder time matches current UTC minute
  const dueUsers = profiles.filter(p =>
    p.reminder_times?.some(t => t === currentTime)
  )

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
      return webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: '🧠 Moody',
          body: isIT ? 'Come stai adesso?' : 'How are you feeling?',
        })
      )
    })
  )

  // Remove stale subscriptions (410 Gone = user uninstalled app/revoked)
  const staleIds = []
  results.forEach((r, i) => {
    if (r.status === 'rejected' && r.reason?.statusCode === 410) {
      staleIds.push(subscriptions[i].user_id)
    }
  })
  if (staleIds.length) {
    await supabase.from('push_subscriptions').delete().in('user_id', staleIds)
    await supabase.from('profiles').update({ reminder_enabled: false }).in('id', staleIds)
  }

  const sent = results.filter(r => r.status === 'fulfilled').length
  return res.json({ sent, checked: profiles.length, due: dueUsers.length })
}
