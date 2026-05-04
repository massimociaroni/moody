import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

const SCORE_COLORS = {
  low:  { bg: '#FDEEEC', text: '#8B2018' },
  mid:  { bg: '#FEF3E7', text: '#7A3F05' },
  high: { bg: '#E5F4EC', text: '#1A5C38' },
}

function scoreColor(v) {
  if (v <= 3) return SCORE_COLORS.low
  if (v <= 6) return SCORE_COLORS.mid
  return SCORE_COLORS.high
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(lang) {
  return new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

export default function Home({ onOpenModal }) {
  const { t, i18n } = useTranslation()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState('')

  const lang = i18n.language

  function greeting() {
    const h = new Date().getHours()
    if (h < 12) return t('greeting_morning')
    if (h < 18) return t('greeting_afternoon')
    return t('greeting_evening')
  }

  async function fetchToday() {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const [{ data: entriesData }, { data: prof }] = await Promise.all([
      supabase
        .from('mood_entries')
        .select('*')
        .gte('created_at', start.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('display_name')
        .single()
    ])
    setEntries(entriesData || [])
    setProfile(prof?.display_name || '')
    setLoading(false)
  }

  useEffect(() => {
    fetchToday()
  }, [])

  const avg = entries.length
    ? (entries.reduce((s, e) => s + e.value, 0) / entries.length).toFixed(1)
    : null

  const avgColor = avg ? scoreColor(Math.round(parseFloat(avg))) : null

  const navHeight = 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px))'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: navHeight, overflowY: 'auto' }}>
      <div style={{ padding: '52px 24px 16px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', lineHeight: 1.2 }}>
          {greeting()}{profile ? `, ${profile}` : ''}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px', fontWeight: 300 }}>
          {formatDate(lang)}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '0 24px 16px' }}>
        <div style={statCard}>
          <div style={{ fontSize: '24px', fontWeight: 500, color: avgColor ? avgColor.text : 'var(--text3)' }}>
            {avg ?? '—'}
          </div>
          <div style={statLabel}>{t('average_today')}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '24px', fontWeight: 500, color: entries.length > 0 ? 'var(--accent)' : 'var(--text3)' }}>
            {entries.length}
          </div>
          <div style={statLabel}>{t('entries')}</div>
        </div>
      </div>

      <div style={sectionTitle}>Log di oggi</div>

      <div style={{ padding: '0 24px', flex: 1 }}>
        {loading ? null : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text3)', lineHeight: 1.6 }}>
            <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text2)', marginBottom: '6px', fontWeight: 500 }}>
              {t('no_entries')}
            </strong>
            <span style={{ fontSize: '13px' }}>{t('no_entries_sub')}</span>
          </div>
        ) : entries.map(e => {
          const c = scoreColor(e.value)
          return (
            <div
              key={e.id}
              onClick={() => onOpenModal(fetchToday, e)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)', animation: 'fadeIn 0.2s ease', cursor: 'pointer' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 500, flexShrink: 0 }}>
                {e.value}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{t(`mood_${e.value}`)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{formatTime(e.created_at)}</div>
                {e.note && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.note}</div>}
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => onOpenModal(fetchToday)}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 16px)',
          right: '16px',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(45,95,63,0.35)',
          zIndex: 99,
        }}
      >
        +
      </button>
    </div>
  )
}

const statCard = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius)',
  padding: '14px 16px',
  border: '1px solid var(--border)',
}

const statLabel = {
  fontSize: '12px',
  color: 'var(--text3)',
  marginTop: '4px',
}

const sectionTitle = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--text3)',
  padding: '0 24px',
  marginBottom: '10px',
}