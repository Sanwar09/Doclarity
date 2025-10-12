import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'
import GoogleSignInButton from './GoogleSignInButton'

export default function AuthModal({ open, onClose, mode = 'login' }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const title = mode === 'signup' ? 'Create your account' : 'Welcome back'
  const cta = mode === 'signup' ? 'Send sign-up link' : 'Send login link'

  useEffect(() => {
    if (!open) {
      setEmail('')
      setSending(false)
      setError('')
    }
  }, [open])

  const sendMagicLink = async (e) => {
    e?.preventDefault?.()
    try {
      setSending(true)
      setError('')
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) throw error
      alert('Check your email for the magic link.')
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Failed to send link')
    } finally {
      setSending(false)
    }
  }

  const signInGoogle = async () => {
    try {
      setError('')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
			redirectTo: `${window.location.origin}/auth/callback`, // optional but recommended
			scopes: 'email profile',
			queryParams: { prompt: 'select_account' } // always show account chooser
		},
      })
      if (error) throw error
    } catch (err) {
      setError(err?.message || 'Google sign-in failed')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-0 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-semibold text-slate-900 mb-1">{title}</h2>
          <p className="text-sm text-slate-600 mb-4">
            {mode === 'signup'
              ? 'Use a magic link to get started, or continue with Google.'
              : 'Use a magic link to log in, or continue with Google.'}
          </p>

          <form onSubmit={sendMagicLink} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2 disabled:bg-slate-300"
            >
              {sending ? 'Sending…' : cta}
            </button>
          </form>

          <div className="my-3 text-center text-sm text-slate-500">or</div>

			<GoogleSignInButton
			onSuccess={() => {
				// Session is set in supabase-js; close modal
				onClose?.()
			}}
			onError={(e) => {
				setError(e?.message || 'Google sign-in failed')
			}}
			text={mode === 'signup' ? 'signup_with' : 'signin_with'}
			size="large"
			width={360}
			/>

          {error && <p className="mt-3 text-danger-700 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  )
}