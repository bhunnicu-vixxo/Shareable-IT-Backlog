import pino from 'pino'

import '../config/env.js'

const level = process.env.LOG_LEVEL ?? 'info'
const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level,
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
})
