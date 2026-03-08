import { useEffect, useRef, useState } from 'react'

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

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp) => {
        try {
          onSuccess?.(resp)
        } catch (e) {
          onError?.(e)
        }
      },
      ux_mode: 'popup',
      auto_select: false,
      itp_support: true,
    })

    if (btnRef.current) {
      google.accounts.id.renderButton(btnRef.current, {
        type: 'standard',
        theme: 'outline',
        size,
        text,
        width,
        shape: 'rectangular',
        logo_alignment: 'left',
      })
    }

    return () => {
      try { google.accounts.id.cancel(); } catch {}
    }
  }, [onSuccess, onError])

  if (initErr) {
    return <button disabled className="w-full border rounded-lg py-2 text-slate-500">Google unavailable: {initErr}</button>
  }

  return <div ref={btnRef} className="flex justify-center" />
}
