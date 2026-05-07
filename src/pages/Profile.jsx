import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function getSwRegistration() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  return navigator.serviceWorker.ready
}

export default function Profile({ user }) {
  const { t, i18n } = useTranslation()
  const [reminderOn, setReminderOn] = useState(false)
  const [reminderTime, setReminderTime] = useState('09:00')
  const [profile, setProfile] = useState(null)
  const [pushSupported, setPushSupported] = useState(false)
  const [togglingReminder, setTogglingReminder] = useState(false)
  const [shareToken, setShareToken] = useState(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY)
  }, [])

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setReminderOn(data.reminder_enabled)
        if (data.reminder_times?.length) setReminderTime(data.reminder_times[0])
      }
    }
    async function fetchShareToken() {
      const { data } = await supabase
        .from('share_tokens')
        .select('token, expires_at')
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setShareToken(data || null)
    }
    fetchProfile()
    fetchShareToken()
  }, [user.id])

  async function generateShareToken() {
    setShareLoading(true)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    const expires_at = new Date(Date.now() + 7 * 86400000).toISOString()
    await supabase.from('share_tokens').upsert(
      { user_id: user.id, token, expires_at },
      { onConflict: 'user_id' }
    )
    setShareToken({ token, expires_at })
    setShareLoading(false)
  }

  async function revokeShareToken() {
    setShareLoading(true)
    await supabase.from('share_tokens').delete().eq('user_id', user.id)
    setShareToken(null)
    setShareLoading(false)
  }

  function copyShareLink() {
    const url = `${window.location.origin}/share/${shareToken.token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function toggleReminder() {
    if (togglingReminder) return
    setTogglingReminder(true)
    try {
      const newVal = !reminderOn

      if (newVal) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          alert(t('push_denied'))
          setTogglingReminder(false)
          return
        }

        const reg = await getSwRegistration()
        if (!reg) {
          alert('Errore: service worker non disponibile')
          setTogglingReminder(false)
          return
        }

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const subJson = subscription.toJSON()

        await Promise.all([
          supabase.from('push_subscriptions').upsert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            subscription: subJson,
          }, { onConflict: 'user_id,endpoint' }),
          supabase.from('profiles').update({ timezone }).eq('id', user.id),
        ])

      } else {
        const reg = await getSwRegistration()
        if (reg) {
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            await supabase.from('push_subscriptions')
              .delete()
              .eq('user_id', user.id)
              .eq('endpoint', sub.endpoint)
            await sub.unsubscribe()
          }
        }
        const { count } = await supabase
          .from('push_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
        if (!count) {
          await supabase.from('profiles').update({ reminder_enabled: false }).eq('id', user.id)
          setReminderOn(false)
          setTogglingReminder(false)
          return
        }
      }

      setReminderOn(newVal)
      await supabase
        .from('profiles')
        .update({ reminder_enabled: newVal })
        .eq('id', user.id)

    } catch (err) {
      console.error('Push subscription error:', err)
      alert(t('push_denied'))
    }
    setTogglingReminder(false)
  }

  async function updateReminderTime(val) {
    setReminderTime(val)
    await supabase
      .from('profiles')
      .update({ reminder_times: [val] })
      .eq('id', user.id)
  }

  async function changeLanguage(lang) {
    i18n.changeLanguage(lang)
    localStorage.setItem('moody_lang', lang)
    await supabase
      .from('profiles')
      .update({ language: lang })
      .eq('id', user.id)
  }

  async function exportCSV() {
    const { data } = await supabase
      .from('mood_entries')
      .select('*')
      .order('created_at', { ascending: true })

    if (!data?.length) return

    const rows = [['data', 'ora', 'valore', 'nota']]
    data.forEach(e => {
      const d = new Date(e.created_at)
      rows.push([
        d.toLocaleDateString('it-IT'),
        d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        e.value,
        (e.note || '').replace(/,/g, ';'),
      ])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `moody_completo_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportPDF() {
    const { data } = await supabase
      .from('mood_entries')
      .select('*')
      .order('created_at', { ascending: true })

    if (!data?.length) return

    const isIT = i18n.language !== 'en'
    const locale = isIT ? 'it-IT' : 'en-GB'
    const moodLabels = isIT
      ? ['','pessimo','molto difficile','difficile','giù','nella media','abbastanza ok','abbastanza bene','bene','molto bene','ottimo']
      : ['','terrible','very hard','hard','low','average','okay','pretty good','good','very good','great']

    const name = profile?.display_name || user.email
    const today = new Date().toLocaleDateString(locale)
    const avg = (data.reduce((s, e) => s + e.value, 0) / data.length).toFixed(1)

    const rows = data.map(e => {
      const d = new Date(e.created_at)
      return `<tr>
        <td>${d.toLocaleDateString(locale)}</td>
        <td>${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="text-align:center;font-weight:500;color:${e.value >= 7 ? '#1A5C38' : e.value >= 4 ? '#7A3F05' : '#8B2018'}">${e.value}</td>
        <td style="color:#555">${moodLabels[e.value] || ''}</td>
        <td style="color:#666">${e.note || ''}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Moody — ${name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #2A2927; padding: 40px; font-size: 13px; }
        h1 { font-size: 26px; font-style: italic; font-weight: normal; margin-bottom: 4px; font-family: Georgia, serif; }
        .meta { color: #888; font-size: 12px; margin-bottom: 28px; }
        .stats { display: flex; gap: 16px; margin-bottom: 28px; }
        .stat { border: 1px solid #E0DFD9; border-radius: 10px; padding: 14px 18px; flex: 1; }
        .stat-val { font-size: 22px; font-weight: 500; color: #2D5F3F; }
        .stat-lbl { font-size: 11px; color: #999; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; color: #999; font-weight: 500; padding: 6px 8px; border-bottom: 2px solid #E0DFD9; }
        td { padding: 7px 8px; border-bottom: 1px solid #F0EFE9; vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #BBB; }
        @media print { body { padding: 24px; } }
      </style>
    </head><body>
      <h1>${isIT ? `Umore di ${name}` : `${name}'s Mood Journal`}</h1>
      <div class="meta">${isIT ? `Esportato il ${today} · ${data.length} registrazioni` : `Exported on ${today} · ${data.length} entries`}</div>
      <div class="stats">
        <div class="stat"><div class="stat-val">${avg}</div><div class="stat-lbl">${isIT ? 'media complessiva' : 'overall average'}</div></div>
        <div class="stat"><div class="stat-val">${data.length}</div><div class="stat-lbl">${isIT ? 'registrazioni totali' : 'total entries'}</div></div>
        <div class="stat"><div class="stat-val">${new Date(data[0].created_at).toLocaleDateString(locale)}</div><div class="stat-lbl">${isIT ? 'prima registrazione' : 'first entry'}</div></div>
      </div>
      <table>
        <thead><tr>
          <th>${isIT ? 'Data' : 'Date'}</th>
          <th>${isIT ? 'Ora' : 'Time'}</th>
          <th>${isIT ? 'Valore' : 'Score'}</th>
          <th>${isIT ? 'Umore' : 'Mood'}</th>
          <th>${isIT ? 'Nota' : 'Note'}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Moody · moody-nine-gamma.vercel.app</div>
      <script>window.onload = () => { window.print() }<\/script>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const initial = (profile?.display_name || user.email || '?')
    .slice(0, 1)
    .toUpperCase()

  const reminderDisabledReason = !pushSupported ? t('push_not_supported') : null

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--nav-h)' }}>
      <div style={{ padding: '48px 24px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontStyle: 'italic', fontWeight: 'normal', marginBottom: '20px' }}>
          {t('profile')}
        </h1>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 500, color: 'var(--accent)', marginBottom: '12px' }}>
          {initial}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 400, color: 'var(--text)' }}>
          {profile?.display_name || ''}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>
          {user.email}
        </div>
      </div>

      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text3)', padding: '0 24px', marginBottom: '0' }}>
        Impostazioni
      </div>

      <div style={{ padding: '0 24px' }}>
        <div style={settingsRow}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ fontSize: '14px', color: reminderDisabledReason ? 'var(--text3)' : 'var(--text)' }}>
              {t('reminder')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
              {reminderDisabledReason || t('reminder_sub')}
            </div>
          </div>
          <button
            onClick={pushSupported ? toggleReminder : undefined}
            disabled={!pushSupported || togglingReminder}
            style={{
              width: 44, height: 26, borderRadius: 13,
              background: reminderOn && pushSupported ? 'var(--accent)' : 'var(--border-med)',
              border: 'none', position: 'relative', flexShrink: 0,
              transition: 'background 0.2s',
              cursor: pushSupported && !togglingReminder ? 'pointer' : 'default',
              opacity: pushSupported ? 1 : 0.4,
            }}
          >
            <span style={{
              position: 'absolute', width: 20, height: 20, borderRadius: '50%',
              background: 'white', top: 3,
              left: reminderOn && pushSupported ? 21 : 3,
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {reminderOn && pushSupported && (
          <div style={settingsRow}>
            <div style={{ fontSize: '14px', color: 'var(--text)' }}>{t('reminder_time')}</div>
            <input
              type="time"
              value={reminderTime}
              onChange={e => updateReminderTime(e.target.value)}
              style={{ border: '1px solid var(--border-med)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
            />
          </div>
        )}

        <div style={settingsRow}>
          <div style={{ fontSize: '14px', color: 'var(--text)' }}>{t('language')}</div>
          <select
            value={i18n.language}
            onChange={e => changeLanguage(e.target.value)}
            style={{ border: '1px solid var(--border-med)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text3)', padding: '16px 24px 12px' }}>
        Dati
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={exportCSV} style={outlineBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t('export_all')}
        </button>

        <button onClick={exportPDF} style={outlineBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 5h5M5 8h5M5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          {t('export_pdf')}
        </button>

        {!shareToken ? (
          <button onClick={generateShareToken} disabled={shareLoading} style={outlineBtn}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 11V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 13h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            {shareLoading ? '…' : t('share_therapist')}
          </button>
        ) : (
          <div style={{ border: '1px solid var(--border-med)', borderRadius: 'var(--radius)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent)' }}>
              {t('share_active')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', wordBreak: 'break-all', background: 'var(--bg)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              {`${window.location.origin}/share/${shareToken.token}`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
              {t('share_expires')} {new Date(shareToken.expires_at).toLocaleDateString(i18n.language === 'it' ? 'it-IT' : 'en-GB')}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={copyShareLink} style={{ ...outlineBtn, flex: 1, color: copied ? 'var(--accent)' : 'var(--text2)', borderColor: copied ? 'var(--accent)' : 'var(--border-med)' }}>
                {copied ? t('share_copied') : t('share_copy')}
              </button>
              <button onClick={revokeShareToken} disabled={shareLoading} style={{ ...outlineBtn, flex: 1, color: 'var(--danger)', borderColor: 'var(--border-med)' }}>
                {t('share_revoke')}
              </button>
            </div>
          </div>
        )}

        <button onClick={handleLogout} style={{ ...outlineBtn, color: 'var(--danger)', marginTop: '8px' }}>
          {t('logout')}
        </button>
      </div>

      <div style={{ height: '24px' }} />
    </div>
  )
}

const settingsRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 0',
  borderBottom: '1px solid var(--border)',
}

const outlineBtn = {
  padding: '13px',
  border: '1px solid var(--border-med)',
  borderRadius: 'var(--radius)',
  background: 'none',
  fontSize: '13px',
  color: 'var(--text2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  cursor: 'pointer',
  width: '100%',
  fontFamily: 'var(--font)',
}
