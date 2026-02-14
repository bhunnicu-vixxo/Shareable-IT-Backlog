import type { Request, Response, NextFunction } from 'express'
import { getVisibleLabels } from '../services/labels/label-visibility.service.js'

/**
 * GET /api/labels/visible
 *
 * Public (authenticated) endpoint used by the backlog to determine which
 * labels should be displayed on cards/modals and in the label filter.
 *
 * Always returns only admin-approved visible labels, regardless of role.
 * Admin/IT users manage visibility from the Admin Settings panel (separate endpoint).
 */
export async function getVisibleLabelsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const labels = await getVisibleLabels()
    res.json(labels)
  } catch (err) {
    next(err)
  }
}

