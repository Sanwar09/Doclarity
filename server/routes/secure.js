import express from 'express'
import { authRequired } from '../middleware/auth.js'
const router = express.Router()

router.get('/', authRequired, (req, res) => {
  res.json({ user: req.user })
})

export default router