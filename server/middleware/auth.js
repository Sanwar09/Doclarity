import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev-change-this-secret'
const encoder = new TextEncoder()

export async function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' })

    const token = auth.slice(7)
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET), {
      issuer: 'doclarity-local-auth',
      audience: 'doclarity-client'
    })
    req.user = { id: payload.sub, email: payload.email, name: payload.name || '' }
    next()
  } catch (e) {
    console.error('[auth] verify failed:', e?.message)
    res.status(401).json({ message: 'Unauthorized' })
  }
}
