import type { Request, Response, NextFunction } from 'express'

/**
 * Middleware that redirects HTTP requests to HTTPS in production.
 *
 * Relies on `trust proxy` being enabled so Express reads the
 * `X-Forwarded-Proto` header set by the reverse proxy (nginx, ALB, etc.).
 *
 * Health-check paths are excluded to allow plain-HTTP probes from
 * load balancers that sit in front of the TLS terminator.
 */
export function httpsRedirectMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Only enforce in production
  if (process.env.NODE_ENV !== 'production') {
    next()
    return
  }

  // req.secure is true when X-Forwarded-Proto is 'https' (with trust proxy)
  if (req.secure) {
    next()
    return
  }

  // Allow health-check endpoints over plain HTTP for load-balancer probes
  if (req.path.startsWith('/api/health')) {
    next()
    return
  }

  const host = req.headers.host ?? 'localhost'
  res.redirect(301, `https://${host}${req.originalUrl}`)
}
