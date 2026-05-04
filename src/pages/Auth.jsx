import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const { t } = useTranslation()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } }
      })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', color: 'var(--text)', lineHeight: 1.1 }}>
          Moody
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text3)', marginTop: '8px' }}>
          {isLogin ? t('login') : t('register')}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!isLogin && (
          <input
            type="text"
            placeholder={t('name')}
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={inputStyle}
          />
        )}
        <input
          type="email"
          placeholder={t('email')}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {error && (
          <p style={{ fontSize: '13px', color: 'var(--danger)', padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? '...' : isLogin ? t('login') : t('register')}
        </button>
      </form>

      <button
        onClick={() => { setIsLogin(!isLogin); setError('') }}
        style={{ marginTop: '20px', background: 'none', border: 'none', fontSize: '14px', color: 'var(--accent)', textAlign: 'center' }}
      >
        {isLogin ? t('no_account') : t('have_account')} <strong>{isLogin ? t('register') : t('login')}</strong>
      </button>
    </div>
  )
}

const inputStyle = {
  padding: '14px',
  border: '1px solid var(--border-med)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '15px',
  background: 'var(--surface)',
  color: 'var(--text)',
  outline: 'none',
  width: '100%',
}

const btnStyle = {
  padding: '15px',
  background: 'var(--accent)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius)',
  fontSize: '15px',
  fontWeight: '500',
  marginTop: '4px',
}