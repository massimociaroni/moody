import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export default function Profile({ user }) {
  const { t, i18n } = useTranslation()
  const [reminderOn, setReminderOn] = useState(false)
  const [reminderTime, setReminderTime] = useState('09:00')
  const [profile, setProfile] = useState(null)

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
    fetchProfile()
  }, [user.id])

  async function toggleReminder() {
    const newVal = !reminderOn
    setReminderOn(newVal)
    await supabase
      .from('profiles')
      .update({ reminder_enabled: newVal })
      .eq('id', user.id)
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

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const initial = (profile?.display_name || user.email || '?')
    .slice(0, 1)
    .toUpperCase()

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
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text)' }}>{t('reminder')}</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{t('reminder_sub')}</div>
          </div>
          <button
            onClick={toggleReminder}
            style={{ width: 44, height: 26, borderRadius: 13, background: reminderOn ? 'var(--accent)' : 'var(--border-med)', border: 'none', position: 'relative', flexShrink: 0, transition: 'background 0.2s', cursor: 'pointer' }}
          >
            <span style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: 'white', top: 3, left: reminderOn ? 21 : 3, transition: 'left 0.2s' }} />
          </button>
        </div>

        {reminderOn && (
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

        <button onClick={() => alert('Disponibile nella prossima versione.')} style={outlineBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 11V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 13h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          {t('share_therapist')}
        </button>

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