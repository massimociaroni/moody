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

const STEPS = [
  {
    emoji: '🧠',
    title: (name) => `Ciao${name ? `, ${name}` : ''}`,
    body: 'Moody ti aiuta a tenere traccia del tuo umore ogni giorno. Pochi secondi, una volta al giorno.',
    cta: 'Avanti',
  },
  {
    emoji: null,
    title: () => 'Come funziona',
    body: null,
    cta: 'Registra il primo umore',
  },
]

function Onboarding({ name, onDone }) {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(20,19,15,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: '420px',
        padding: '32px 28px calc(40px + env(safe-area-inset-bottom))',
        animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '32px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? 'var(--accent)' : 'var(--border-med)',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>

        {step === 0 && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center' }}>{s.emoji}</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontStyle: 'italic', fontWeight: 'normal', marginBottom: '12px', textAlign: 'center' }}>
              {s.title(name)}
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text2)', lineHeight: 1.6, textAlign: 'center', marginBottom: '32px' }}>
              {s.body}
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontStyle: 'italic', fontWeight: 'normal', marginBottom: '24px', textAlign: 'center' }}>
              {s.title()}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
              {[
                { icon: '＋', text: 'Tocca + per registrare il tuo umore' },
                { icon: '📊', text: 'Vedi il tuo andamento nello Storico' },
                { icon: '🔔', text: 'Attiva i promemoria nel Profilo' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {icon}
                  </div>
                  <span style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => step < STEPS.length - 1 ? setStep(step + 1) : onDone()}
          style={{
            width: '100%', padding: '15px',
            background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 'var(--radius)',
            fontSize: '15px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          {s.cta}
        </button>

        {step === 0 && (
          <button
            onClick={onDone}
            style={{ width: '100%', padding: '12px', background: 'none', border: 'none', fontSize: '13px', color: 'var(--text3)', marginTop: '4px', cursor: 'pointer' }}
          >
            Salta
          </button>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('home')
  const [modalOpen, setModalOpen] = useState(false)
  const [onSavedCallback, setOnSavedCallback] = useState(null)
  const [editEntry, setEditEntry] = useState(null)
  const [installDismissed, setInstallDismissed] = useState(() => !!localStorage.getItem('install_dismissed'))
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [profileName, setProfileName] = useState('')
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
    if (!session) return
    supabase
      .from('profiles')
      .select('language, display_name')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.language) i18n.changeLanguage(data.language)
        if (data?.display_name) setProfileName(data.display_name)
        const key = `onboarding_done_${session.user.id}`
        if (!localStorage.getItem(key)) setShowOnboarding(true)
      })
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

  function finishOnboarding() {
    localStorage.setItem(`onboarding_done_${session.user.id}`, '1')
    setShowOnboarding(false)
    setModalOpen(true)
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

      {showOnboarding && (
        <Onboarding name={profileName} onDone={finishOnboarding} />
      )}

      {showInstallHint && !installDismissed && session && !showOnboarding && (
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
