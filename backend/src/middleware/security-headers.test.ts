import { describe, it, expect, afterAll } from 'vitest'
import express from 'express'
import helmet from 'helmet'
import http from 'node:http'

/**
 * Helmet security-headers integration test.
 *
 * Replicates the Helmet configuration from app.ts so we can verify the
 * resulting HTTP response headers without booting the full application
 * (which requires a database, session store, etc.).
 *
 * If the Helmet options in app.ts change, these tests should be updated
 * to match.
 */

function createTestApp(): express.Application {
  const app = express()
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Chakra UI runtime styles
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      strictTransportSecurity: {
        maxAge: 31_536_000, // 1 year
        includeSubDomains: true,
      },
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    }),
  )
  app.get('/test', (_req, res) => res.json({ ok: true }))
  return app
}

/**
 * Make a single GET /test request through the app and return the response.
 * Uses an ephemeral server on a random port.
 */
function getResponseHeaders(
  app: express.Application,
): Promise<http.IncomingHttpHeaders> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app)
    server.listen(0, () => {
      const addr = server.address() as { port: number }
      const req = http.request(
        { port: addr.port, path: '/test', method: 'GET' },
        (res) => {
          // Drain response body
          res.resume()
          res.on('end', () => {
            server.close()
            resolve(res.headers)
          })
        },
      )
      req.on('error', (err) => {
        server.close()
        reject(err)
      })
      req.end()
    })
  })
}

describe('Helmet security headers', () => {
  let headers: http.IncomingHttpHeaders

  // Fetch headers once for all assertions (performance)
  const headersPromise = getResponseHeaders(createTestApp())

  afterAll(async () => {
    // Ensure the promise is settled (server closed)
    await headersPromise.catch(() => {})
  })

  it('should set Content-Security-Policy with correct directives', async () => {
    headers = await headersPromise
    const csp = headers['content-security-policy'] as string
    expect(csp).toBeDefined()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("img-src 'self' data:")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("font-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('should set Strict-Transport-Security header with 1-year max-age', async () => {
    headers = await headersPromise
    const hsts = headers['strict-transport-security'] as string
    expect(hsts).toBeDefined()
    expect(hsts).toContain('max-age=31536000')
    expect(hsts).toContain('includeSubDomains')
  })

  it('should set X-Content-Type-Options to nosniff', async () => {
    headers = await headersPromise
    expect(headers['x-content-type-options']).toBe('nosniff')
  })

  it('should set Referrer-Policy to strict-origin-when-cross-origin', async () => {
    headers = await headersPromise
    expect(headers['referrer-policy']).toBe(
      'strict-origin-when-cross-origin',
    )
  })

  it('should set X-DNS-Prefetch-Control header', async () => {
    headers = await headersPromise
    expect(headers['x-dns-prefetch-control']).toBe('off')
  })

  it('should remove X-Powered-By header', async () => {
    headers = await headersPromise
    expect(headers['x-powered-by']).toBeUndefined()
  })
})
