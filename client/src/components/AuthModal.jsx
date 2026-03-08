import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthProvider'
import GoogleSignInButton from './GoogleSignInButton'

export default function AuthModal({ open, onClose, mode = 'login' }) {
  const navigate = useNavigate()
  const { login, signup, googleLogin } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const title = mode === 'signup' ? 'Create your account' : 'Welcome back'
  const cta = mode === 'signup' ? 'Create account' : 'Login'

  useEffect(() => {
    if (!open) {
      setName('')
      setEmail('')
      setPassword('')
      setSubmitting(false)
      setError('')
    }
  }, [open])

  const onSubmit = async (e) => {
    e?.preventDefault?.()
    try {
      setSubmitting(true)
      setError('')
      if (mode === 'signup') {
        await signup({ name, email, password })
      } else {
        await login({ email, password })
      }
      onClose?.()
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
      onClose?.()
      navigate('/upload')
    } catch (err) {
      setError(err?.response?.data?.message || 'Google login failed')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl p-6 relative">
          <button onClick={onClose} className="absolute right-3 top-3 text-slate-500 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-semibold text-slate-900 mb-1">{title}</h2>
          <p className="text-sm text-slate-600 mb-4">Use email and password to continue.</p>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button type="submit" disabled={submitting} className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2 disabled:bg-slate-300">
              {submitting ? 'Please wait...' : cta}
            </button>
          </form>
          <div className="my-3 text-center text-sm text-slate-500">or</div>
          <GoogleSignInButton
            onSuccess={onGoogleSuccess}
            onError={() => setError('Google login failed')}
            text={mode === 'signup' ? 'signup_with' : 'signin_with'}
            width={360}
          />

          {error && <p className="mt-3 text-danger-700 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  )
}
