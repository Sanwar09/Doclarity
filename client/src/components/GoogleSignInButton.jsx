import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function GoogleSignInButton({ onSuccess, onError, text = 'continue_with', size = 'large', width = 320 }) {
  const btnRef = useRef(null)
  const [initErr, setInitErr] = useState('')

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setInitErr('VITE_GOOGLE_CLIENT_ID missing'); 
      return
    }
    const google = window.google
    if (!google?.accounts?.id) {
      setInitErr('Google Identity Services failed to load')
      return
    }

    // Optional: use a nonce for extra security (must match hashed nonce inside the id_token)
    const nonce = undefined // or generate one and pass to initialize + verify server-side

    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp) => {
        try {
          const idToken = resp.credential
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken, // Supabase v2 accepts `token` (id_token)
            // nonce, // only if you used a nonce above
          })
          if (error) throw error
          onSuccess?.(data)
        } catch (e) {
          onError?.(e)
        }
      },
      // nonce, // if used
      ux_mode: 'popup', // no page navigation
      auto_select: false,
      itp_support: true,
    })

    // Render a Google button (no redirects)
    if (btnRef.current) {
      google.accounts.id.renderButton(btnRef.current, {
        type: 'standard',
        theme: 'outline',
        size,
        text,          // 'signin_with' | 'signup_with' | 'continue_with'
        width,         // px
        shape: 'rectangular',
        logo_alignment: 'left',
      })
    }

    // Optional: also show One Tap (non-intrusive)
    // google.accounts.id.prompt()

    return () => {
      try { google.accounts.id.cancel(); } catch {}
    }
  }, [onSuccess, onError])

  if (initErr) {
    return <button disabled className="w-full border rounded-lg py-2 text-slate-500">Google unavailable: {initErr}</button>
  }

  return <div ref={btnRef} className="flex justify-center" />
}