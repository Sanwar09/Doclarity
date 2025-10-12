import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    // Just touching supabase ensures session resolution; then redirect
    supabase.auth.getSession().finally(() => {
      navigate('/', { replace: true })
    })
  }, [navigate])
  return <div className="min-h-[50vh] grid place-items-center">Signing you in…</div>
}