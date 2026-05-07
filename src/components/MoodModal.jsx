import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

const LEVEL_COLORS = [
  null,
  { bg: '#FDECEA', text: '#8B2018' },
  { bg: '#FDE8E5', text: '#8B2018' },
  { bg: '#FEEEE4', text: '#7A3F05' },
  { bg: '#FEF2E0', text: '#7A3F05' },
  { bg: '#FEF6DC', text: '#7A3F05' },
  { bg: '#EEF8E8', text: '#3D7030' },
  { bg: '#E6F5EC', text: '#2D6840' },
  { bg: '#DCF0E6', text: '#1F6038' },
  { bg: '#D2EBE0', text: '#1A5C38' },
  { bg: '#C6E5D8', text: '#1A5C38' },
]

export default function MoodModal({ open, onClose, onSaved, editEntry }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(7)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editEntry) {
      setValue(editEntry.value)
      setNote(editEntry.note || '')
    } else {
      setValue(7)
      setNote('')
    }
  }, [editEntry, open])

  const c = LEVEL_COLORS[value]
  const isEdit = !!editEntry

  async function handleSave() {
    setSaving(true)
    if (isEdit) {
      await supabase.from('mood_entries').update({ value, note }).eq('id', editEntry.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('mood_entries').insert({ value, note, user_id: user.id })
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!editEntry) return
    setSaving(true)
    await supabase.from('mood_entries').delete().eq('id', editEntry.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,19,15,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '0 24px 36px', width: '100%', maxWidth: '420px', animation: 'slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)' }}>
        <div style={{ width: 36, height: 4, background: 'var(--border-med)', borderRadius: 2, margin: '12px auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontStyle: 'italic', fontWeight: 'normal' }}>
            {isEdit ? 'Modifica registrazione' : t('how_are_you')}
          </div>
          {isEdit && (
            <button onClick={handleDelete} disabled={saving} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '13px', padding: '4px 0', cursor: 'pointer' }}>
              Elimina
            </button>
          )}
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '20px' }}>
          {new Date(isEdit ? editEntry.created_at : undefined).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Mood label */}
        <div style={{ textAlign: 'center', marginBottom: '16px', minHeight: '28px' }}>
          <span style={{ fontSize: '15px', color: c.text, fontStyle: 'italic', fontFamily: 'var(--font-display)', transition: 'color 0.15s' }}>
            {value} · {t(`mood_${value}`)}
          </span>
        </div>

        {/* 10 tap targets in 2 rows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[1,2,3,4,5,6,7,8,9,10].map(v => {
            const lc = LEVEL_COLORS[v]
            const selected = v === value
            return (
              <button
                key={v}
                onClick={() => setValue(v)}
                style={{
                  height: '52px',
                  borderRadius: '12px',
                  border: selected ? `2px solid ${lc.text}` : '2px solid transparent',
                  background: selected ? lc.bg : 'var(--border)',
                  color: selected ? lc.text : 'var(--text3)',
                  fontSize: selected ? '20px' : '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  transform: selected ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                {v}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '8px' }}>
          {t('note_label')}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('note_placeholder')}
          rows="3"
          style={{ width: '100%', border: '1px solid var(--border-med)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '14px', color: 'var(--text)', background: 'var(--bg)', resize: 'none', outline: 'none', marginBottom: '20px', fontFamily: 'var(--font)' }}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', padding: '15px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}
        >
          {saving ? '...' : t('save')}
        </button>

        <button
          onClick={onClose}
          style={{ width: '100%', padding: '12px', background: 'none', border: 'none', fontSize: '14px', color: 'var(--text3)', marginTop: '4px', cursor: 'pointer' }}
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}
