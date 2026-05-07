import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Home from './pages/Home'
import History from './pages/History'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'
import MoodModal from './components/MoodModal'

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
const showInstallHint = isIOS && !isStandalone

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('home')
  const [modalOpen, setModalOpen] = useState(false)
  const [onSavedCallback, setOnSavedCallback] = useState(null)
  const [editEntry, setEditEntry] = useState(null)
  const [installDismissed, setInstallDismissed] = useState(() => !!localStorage.getItem('install_dismissed'))
  const { i18n } = useTranslation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      supabase
        .from('profiles')
        .select('language')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.language) i18n.changeLanguage(data.language)
        })
    }
  }, [session])

  function openModal(callback, entry = null) {
    setEditEntry(entry)
    setOnSavedCallback(() => callback)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditEntry(null)
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text3)' }}>
          Moody
        </div>
      </div>
    )
  }

  if (!session) return <Auth />

  return (
    <>
      {screen === 'home' && <Home onOpenModal={openModal} />}
      {screen === 'history' && <History />}
      {screen === 'profile' && <Profile user={session.user} />}

      <BottomNav screen={screen} setScreen={setScreen} />

      <MoodModal
        open={modalOpen}
        onClose={closeModal}
        onSaved={() => { if (onSavedCallback) onSavedCallback() }}
        editEntry={editEntry}
      />

      {showInstallHint && !installDismissed && session && (
        <div style={{
          position: 'fixed', bottom: 'calc(var(--nav-h) + 12px)', left: '12px', right: '12px',
          background: '#2A2927', color: 'white', borderRadius: '14px',
          padding: '14px 16px', zIndex: 150,
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '3px' }}>
              Installa Moody per le notifiche
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
              Tocca <svg style={{ verticalAlign: 'middle', margin: '0 2px' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> poi <strong>"Aggiungi a schermata Home"</strong>
            </div>
          </div>
          <button
            onClick={() => { setInstallDismissed(true); localStorage.setItem('install_dismissed', '1') }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '20px', lineHeight: 1, cursor: 'pointer', padding: '0', flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}