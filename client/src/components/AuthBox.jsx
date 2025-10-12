import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthBox() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const sendMagicLink = async (e) => {
    e.preventDefault()
    setSending(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin } // Adjust if using a callback route
    })
    setSending(false)
    if (error) setError(error.message)
    else alert('Check your email for the login link.')
  }

  const signInGoogle = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) setError(error.message)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
      <h2 className="text-xl font-semibold mb-3">Sign in</h2>
      <form onSubmit={sendMagicLink} className="space-y-3">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
        <button disabled={sending} className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2">
          {sending ? 'Sending…' : 'Send magic link'}
        </button>
      </form>
      <div className="text-center text-sm text-slate-500 my-3">or</div>
      <button onClick={signInGoogle} className="w-full border border-slate-300 rounded-lg py-2 hover:bg-slate-50">
        Continue with Google
      </button>
      {error && <p className="mt-3 text-danger-700 text-sm">{error}</p>}
    </div>
  )
}