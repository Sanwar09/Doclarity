import { createRemoteJWKSet, jwtVerify } from 'jose'

const jwks = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL))
const ISS = `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/auth/v1`

export async function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' })
    const token = auth.slice(7)
    const { payload } = await jwtVerify(token, jwks, { issuer: ISS })
    req.user = { id: payload.sub, email: payload.email, role: payload.role }
    next()
  } catch (e) {
    console.error('[auth] verify failed:', e?.message)
    res.status(401).json({ message: 'Unauthorized' })
  }
}