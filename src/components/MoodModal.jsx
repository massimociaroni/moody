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

  const c = scoreColor(value)
  const pct = ((value - 1) / 9) * 100
  const isEdit = !!editEntry

  async function handleSave() {
    setSaving(true)
    if (isEdit) {
      await supabase
        .from('mood_entries')
        .update({ value, note })
        .eq('id', editEntry.id)
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,19,15,0.5)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        padding: '0 24px 36px',
        width: '100%',
        maxWidth: '420px',
        animation: 'slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        <div style={{ width: 36, height: 4, background: 'var(--border-med)', borderRadius: 2, margin: '12px auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontStyle: 'italic', fontWeight: 'normal' }}>
            {isEdit ? 'Modifica registrazione' : t('how_are_you')}
          </div>
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={saving}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '13px', padding: '4px 0', cursor: 'pointer' }}
            >
              Elimina
            </button>
          )}
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '24px' }}>
          {isEdit
            ? new Date(editEntry.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
          }
        </div>

        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '56px',
            fontWeight: 300,
            color: c.text,
            lineHeight: 1,
            transition: 'color 0.2s',
          }}>
            {value}
          </div>
          <div style={{
            fontSize: '15px',
            color: c.text,
            marginTop: '4px',
            fontStyle: 'italic',
            fontFamily: 'var(--font-display)',
            transition: 'color 0.2s',
          }}>
            {t(`mood_${value}`)}
          </div>
        </div>

        <style>{`
          .moody-slider {
            width: 100%;
            -webkit-appearance: none;
            appearance: none;
            height: 3px;
            border-radius: 2px;
            outline: none;
            cursor: pointer;
          }
          .moody-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${c.text};
            border: 3px solid white;
            box-shadow: 0 0 0 1px ${c.text};
            cursor: pointer;
            transition: transform 0.1s;
          }
          .moody-slider::-webkit-slider-thumb:active {
            transform: scale(1.2);
          }
          .moody-slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${c.text};
            border: 3px solid white;
            box-shadow: 0 0 0 1px ${c.text};
            cursor: pointer;
          }
        `}</style>

        <div style={{ padding: '4px 0', marginBottom: '6px' }}>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={value}
            onChange={e => setValue(parseInt(e.target.value))}
            className="moody-slider"
            style={{
              background: `linear-gradient(to right, ${c.text} ${pct}%, var(--border-med) ${pct}%)`,
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text3)', marginBottom: '20px', padding: '0 2px' }}>
          <span>1 · {t('mood_1')}</span>
          <span>5 · {t('mood_5')}</span>
          <span>10 · {t('mood_10')}</span>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: '8px' }}>
          Nota (opzionale)
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('note_placeholder')}
          rows="3"
          style={{
            width: '100%',
            border: '1px solid var(--border-med)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            fontSize: '14px',
            color: 'var(--text)',
            background: 'var(--bg)',
            resize: 'none',
            outline: 'none',
            marginBottom: '20px',
            fontFamily: 'var(--font)',
          }}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '15px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {saving ? '...' : t('save')}
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            background: 'none',
            border: 'none',
            fontSize: '14px',
            color: 'var(--text3)',
            marginTop: '4px',
            cursor: 'pointer',
          }}
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}