import { useTranslation } from 'react-i18next'

export default function BottomNav({ screen, setScreen }) {
  const { t } = useTranslation()

  const items = [
    {
      id: 'home',
      label: 'Oggi',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="3" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M3 9h16" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 2v4M14 2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M8 13h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: 'history',
      label: t('history'),
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <polyline points="2,16 7,9 12,13 17,6 21,9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'profile',
      label: t('profile'),
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M3 20c0-4.42 3.58-8 8-8s8 3.58 8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      )
    },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '420px',
      height: 'var(--nav-h)',
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 100,
    }}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setScreen(item.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 20px',
            border: 'none',
            background: 'none',
            color: screen === item.id ? 'var(--accent)' : 'var(--text3)',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'color 0.15s',
          }}
        >
          {item.icon(screen === item.id)}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}