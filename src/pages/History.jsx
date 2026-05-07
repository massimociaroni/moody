import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

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

const DAY_NAMES_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const DAY_NAMES_EN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function StatCard({ value, sub, label, color }) {
  const hasValue = value !== null && value !== undefined
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      padding: '14px 12px',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: '80px',
    }}>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 500, color: hasValue ? color : 'var(--text3)', lineHeight: 1 }}>
          {hasValue ? value : '—'}
        </div>
        {sub && (
          <div style={{ fontSize: '12px', fontWeight: 500, color, marginTop: '3px' }}>
            {sub}
          </div>
        )}
        {!sub && (
          <div style={{ fontSize: '12px', marginTop: '3px', visibility: 'hidden' }}>·</div>
        )}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '6px' }}>
        {label}
      </div>
    </div>
  )
}

export default function History() {
  const { t, i18n } = useTranslation()
  const [entries, setEntries] = useState([])
  const [range, setRange] = useState(7)
  const dayNames = i18n.language === 'en' ? DAY_NAMES_EN : DAY_NAMES_IT

  async function fetchEntries() {
    let query = supabase
      .from('mood_entries')
      .select('*')
      .order('created_at', { ascending: true })

    if (range > 0) {
      const cutoff = new Date(Date.now() - range * 86400000)
      query = query.gte('created_at', cutoff.toISOString())
    }

    const { data } = await query
    setEntries(data || [])
  }

  useEffect(() => { fetchEntries() }, [range])

  const avg = entries.length
    ? (entries.reduce((s, e) => s + e.value, 0) / entries.length).toFixed(1)
    : null
  const avgColor = avg ? scoreColor(Math.round(parseFloat(avg))) : null

  // Stats still use daily averages
  const byDay = {}
  entries.forEach(e => {
    const d = e.created_at.slice(0, 10)
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(e.value)
  })
  const dayAvgs = Object.entries(byDay).map(([d, vals]) => ({
    date: d,
    avg: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)),
  }))
  const bestDay = dayAvgs.length > 1 ? dayAvgs.reduce((a, b) => a.avg > b.avg ? a : b) : null
  const worstDay = dayAvgs.length > 1 ? dayAvgs.reduce((a, b) => a.avg < b.avg ? a : b) : null

  // Chart uses individual points
  const showTime = range <= 7
  const labels = entries.map(e => {
    const d = new Date(e.created_at)
    const day = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
    if (showTime) return `${day} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    return day
  })
  const pointColors = entries.map(e => scoreColor(e.value).text)
  const pointRadius = entries.length > 60 ? 2 : entries.length > 20 ? 3 : 5

  function exportCSV() {
    if (!entries.length) return
    const rows = [['data', 'ora', 'valore', 'nota']]
    entries.forEach(e => {
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
    a.download = `moody_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const chartData = {
    labels,
    datasets: [{
      data: entries.map(e => e.value),
      borderColor: 'rgba(45,95,63,0.3)',
      backgroundColor: 'rgba(45,95,63,0.05)',
      pointBackgroundColor: pointColors,
      pointBorderColor: pointColors,
      pointRadius,
      pointHoverRadius: pointRadius + 2,
      tension: 0.3,
      fill: true,
      borderWidth: 1.2,
    }],
  }

  const chartOptions = {
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const e = entries[ctx.dataIndex]
            const d = new Date(e.created_at)
            const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
            return `${e.value} · ${t(`mood_${e.value}`)}  ${time}`
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 11,
        ticks: {
          stepSize: 1,
          color: '#A8A7A2',
          callback: v => (v >= 1 && v <= 10) ? v : '',
        },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      x: {
        ticks: { color: '#A8A7A2', maxRotation: 0, maxTicksLimit: 7 },
        grid: { display: false },
      },
    },
  }

  const ranges = [
    { label: t('days_7'), value: 7 },
    { label: t('days_30'), value: 30 },
    { label: t('months_6'), value: 180 },
    { label: t('year_1'), value: 365 },
    { label: t('all'), value: 0 },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--nav-h)' }}>
      <div style={{ padding: '48px 24px 16px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontStyle: 'italic', fontWeight: 'normal', marginBottom: '16px' }}>
          {t('history')}
        </h1>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ranges.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              style={{
                padding: '6px 14px',
                borderRadius: '99px',
                border: `1px solid ${range === r.value ? 'var(--accent)' : 'var(--border-med)'}`,
                background: range === r.value ? 'var(--accent)' : 'none',
                color: range === r.value ? 'white' : 'var(--text2)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text3)', fontSize: '14px' }}>
          Nessun dato nel periodo selezionato.
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '16px', margin: '0 24px 16px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '0 24px 16px' }}>
            <StatCard
              value={avg}
              sub={null}
              label={t('avg_period')}
              color={avgColor ? avgColor.text : 'var(--text3)'}
            />
            <StatCard
              value={bestDay ? dayNames[new Date(bestDay.date + 'T12:00:00').getDay()] : null}
              sub={bestDay ? String(bestDay.avg) : null}
              label={t('best_day')}
              color='var(--good)'
            />
            <StatCard
              value={worstDay ? dayNames[new Date(worstDay.date + 'T12:00:00').getDay()] : null}
              sub={worstDay ? String(worstDay.avg) : null}
              label={t('worst_day')}
              color='var(--danger)'
            />
          </div>
        </>
      )}

      <button
        onClick={exportCSV}
        style={{ margin: '0 24px', width: 'calc(100% - 48px)', padding: '13px', border: '1px solid var(--border-med)', borderRadius: 'var(--radius)', background: 'none', fontSize: '13px', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t('export_csv')}
      </button>
      <div style={{ height: '16px' }} />
    </div>
  )
}