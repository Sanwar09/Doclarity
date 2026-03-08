import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthProvider'
import GoogleSignInButton from './GoogleSignInButton'

export default function AuthBox() {
  const navigate = useNavigate()
  const { login, signup, googleLogin } = useAuth()

  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError('')
      if (mode === 'signup') {
        await signup({ name, email, password })
      } else {
        await login({ email, password })
      }
      navigate('/upload')
    } catch (err) {
      setError(err?.response?.data?.message || 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  const onGoogleSuccess = async (resp) => {
    try {
      setError('')
      await googleLogin({ credential: resp?.credential })
      navigate('/upload')
    } catch (err) {
      setError(err?.response?.data?.message || 'Google login failed')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setMode('login')}
          className={`px-3 py-1.5 rounded-lg text-sm ${mode === 'login' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Login
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`px-3 py-1.5 rounded-lg text-sm ${mode === 'signup' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Sign Up
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-3">{mode === 'signup' ? 'Create account' : 'Sign in'}</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        )}
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
        <button disabled={submitting} className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2 disabled:bg-slate-300">
          {submitting ? 'Please wait...' : (mode === 'signup' ? 'Create account' : 'Login')}
        </button>
      </form>
      <div className="text-center text-sm text-slate-500 my-3">or</div>
      <GoogleSignInButton
        onSuccess={onGoogleSuccess}
        onError={() => setError('Google login failed')}
        text={mode === 'signup' ? 'signup_with' : 'signin_with'}
        width={360}
      />

      {error && <p className="mt-3 text-danger-700 text-sm">{error}</p>}
    </div>
  )
}
