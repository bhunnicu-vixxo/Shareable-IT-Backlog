import { Router } from 'express'
import { getUserUnseenCount, postMarkSeen } from '../controllers/user.controller.js'

const userRoutes = Router()

// Preferred REST naming (plural): /api/users/*
userRoutes.get('/users/unseen-count', getUserUnseenCount)
userRoutes.post('/users/mark-seen', postMarkSeen)

// Backwards-compatible aliases (singular): /api/user/*
userRoutes.get('/user/unseen-count', getUserUnseenCount)
userRoutes.post('/user/mark-seen', postMarkSeen)

export default userRoutes
