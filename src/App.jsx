import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Home from './pages/Home'
import History from './pages/History'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'
import MoodModal from './components/MoodModal'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('home')
  const [modalOpen, setModalOpen] = useState(false)
  const [onSavedCallback, setOnSavedCallback] = useState(null)
  const [editEntry, setEditEntry] = useState(null)
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
    </>
  )
}