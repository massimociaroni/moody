import { useState, useEffect } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const SCORE_COLORS = {
  low:  { text: '#8B2018' },
  mid:  { text: '#7A3F05' },
  high: { text: '#1A5C38' },
}
function scoreColor(v) {
  if (v <= 3) return SCORE_COLORS.low
  if (v <= 6) return SCORE_COLORS.mid
  return SCORE_COLORS.high
}

const MOOD_IT = ['','pessimo','molto difficile','difficile','giù','nella media','abbastanza ok','abbastanza bene','bene','molto bene','ottimo']
const MOOD_EN = ['','terrible','very hard','hard','low','average','okay','pretty good','good','very good','great']

function StatCard({ value, sub, label, color }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '14px 12px', border: '1px solid #E8E7E2', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '80px' }}>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 500, color: value ? color : '#C0BFB9', lineHeight: 1 }}>{value || '—'}</div>
        {sub && <div style={{ fontSize: '12px', fontWeight: 500, color, marginTop: '3px' }}>{sub}</div>}
      </div>
      <div style={{ fontSize: '11px', color: '#A8A7A2', marginTop: '6px' }}>{label}</div>
    </div>
  )
}

export default function ShareView({ token }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [range, setRange] = useState(30)

  useEffect(() => {
    fetch(`/api/share?token=${token}`)
      .then(r => r.json())
      .then(d => d.error ? setError(d.error) : setData(d))
      .catch(() => setError('Errore di rete'))
  }, [token])

  if (error) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: '#6B6A66', fontSize: '15px', textAlign: 'center', padding: '24px' }}>
      <div>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔗</div>
        <div style={{ fontWeight: 500, marginBottom: '6px' }}>{error}</div>
        <div style={{ fontSize: '13px' }}>Chiedi a chi ti ha condiviso il link di generarne uno nuovo.</div>
      </div>
    </div>
  )

  if (!data) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: '#A8A7A2' }}>
      Caricamento…
    </div>
  )

  const isIT = data.language !== 'en'
  const moodLabels = isIT ? MOOD_IT : MOOD_EN

  const cutoff = range > 0 ? new Date(Date.now() - range * 86400000) : null
  const filtered = cutoff
    ? data.entries.filter(e => new Date(e.created_at) >= cutoff)
    : data.entries

  const byDay = {}
  filtered.forEach(e => {
    const d = e.created_at.slice(0, 10)
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(e.value)
  })
  const dayAvgs = Object.entries(byDay).map(([d, vals]) => ({
    date: d,
    avg: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)),
  }))

  const labels = dayAvgs.map(d => { const p = d.date.split('-'); return `${p[2]}/${p[1]}` })
  const chartValues = dayAvgs.map(d => d.avg)
  const avg = filtered.length ? (filtered.reduce((s, e) => s + e.value, 0) / filtered.length).toFixed(1) : null
  const avgColor = avg ? scoreColor(Math.round(parseFloat(avg))).text : '#A8A7A2'
  const bestDay = dayAvgs.length > 1 ? dayAvgs.reduce((a, b) => a.avg > b.avg ? a : b) : null
  const worstDay = dayAvgs.length > 1 ? dayAvgs.reduce((a, b) => a.avg < b.avg ? a : b) : null

  const DAY_NAMES = isIT
    ? ['dom','lun','mar','mer','gio','ven','sab']
    : ['sun','mon','tue','wed','thu','fri','sat']

  const chartData = {
    labels,
    datasets: [{ data: chartValues, borderColor: '#2D5F3F', backgroundColor: 'rgba(45,95,63,0.07)', pointBackgroundColor: '#2D5F3F', pointRadius: chartValues.length > 30 ? 2 : 4, tension: 0.35, fill: true, borderWidth: 1.5 }],
  }
  const chartOptions = {
    animation: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} · ${moodLabels[Math.round(ctx.parsed.y)] || ''}` } } },
    scales: {
      y: { min: 0, max: 11, ticks: { stepSize: 1, color: '#A8A7A2', callback: v => (v >= 1 && v <= 10) ? v : '' }, grid: { color: 'rgba(0,0,0,0.06)' } },
      x: { ticks: { color: '#A8A7A2', maxRotation: 0, maxTicksLimit: 7 }, grid: { color: 'rgba(0,0,0,0.06)' } },
    },
  }

  const expires = new Date(data.expiresAt)
  const daysLeft = Math.ceil((expires - Date.now()) / 86400000)

  const ranges = isIT
    ? [{ l: '30 giorni', v: 30 }, { l: '6 mesi', v: 180 }, { l: '1 anno', v: 365 }, { l: 'tutto', v: 0 }]
    : [{ l: '30 days', v: 30 }, { l: '6 months', v: 180 }, { l: '1 year', v: 365 }, { l: 'all', v: 0 }]

  return (
    <div style={{ minHeight: '100svh', background: '#F7F6F2', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 0 40px' }}>

        {/* Header */}
        <div style={{ padding: '32px 24px 20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#E5F4EC', color: '#1A5C38', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', marginBottom: '16px', letterSpacing: '0.03em' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3v2.5L6.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {isIT ? 'Sola lettura' : 'Read only'} · {isIT ? `scade tra ${daysLeft} giorni` : `expires in ${daysLeft} days`}
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, Georgia, serif', fontSize: '26px', fontStyle: 'italic', fontWeight: 'normal', color: '#2A2927', margin: 0 }}>
            {data.name ? (isIT ? `Umore di ${data.name}` : `${data.name}'s Mood`) : (isIT ? 'Storico umore' : 'Mood history')}
          </h1>
        </div>

        {/* Range toggle */}
        <div style={{ padding: '0 24px 16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ranges.map(r => (
            <button key={r.v} onClick={() => setRange(r.v)} style={{ padding: '6px 14px', borderRadius: '99px', border: `1px solid ${range === r.v ? '#2D5F3F' : '#D4D3CE'}`, background: range === r.v ? '#2D5F3F' : 'none', color: range === r.v ? 'white' : '#6B6A66', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
              {r.l}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: '#A8A7A2', fontSize: '14px' }}>
            {isIT ? 'Nessun dato nel periodo.' : 'No data for this period.'}
          </div>
        ) : (
          <>
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E8E7E2', padding: '16px', margin: '0 24px 16px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '0 24px 16px' }}>
              <StatCard value={avg} label={isIT ? 'media periodo' : 'period avg'} color={avgColor} />
              <StatCard
                value={bestDay ? DAY_NAMES[new Date(bestDay.date + 'T12:00:00').getDay()] : null}
                sub={bestDay ? String(bestDay.avg) : null}
                label={isIT ? 'giorno migliore' : 'best day'}
                color="#1A5C38"
              />
              <StatCard
                value={worstDay ? DAY_NAMES[new Date(worstDay.date + 'T12:00:00').getDay()] : null}
                sub={worstDay ? String(worstDay.avg) : null}
                label={isIT ? 'giorno peggiore' : 'worst day'}
                color="#8B2018"
              />
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '16px 24px 0', fontSize: '12px', color: '#C0BFB9' }}>
          {isIT ? 'Generato con' : 'Generated with'} <span style={{ color: '#2D5F3F', fontWeight: 600 }}>Moody</span>
        </div>
      </div>
    </div>
  )
}
