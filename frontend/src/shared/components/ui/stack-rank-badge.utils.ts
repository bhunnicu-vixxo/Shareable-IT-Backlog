export interface BadgeDimensions {
  /** CSS size string for width and height */
  size: string
  /** Chakra UI fontSize token: md (16px), sm (14px), xs (12px) */
  fontSize: string
}

/**
 * Returns badge dimensions (size and font size) based on priority level.
 *
 * Higher priorities get larger badges to create visual hierarchy:
 * - Priority 1 (Urgent): 40px, font md
 * - Priority 2 (High):   36px, font md
 * - Priority 3 (Normal): 32px, font sm
 * - Priority 4 (Low):    28px, font xs
 * - Priority 0 (None):   32px, font sm (base size, gray styling)
 *
 * @param priority - Linear priority: 0 (None), 1 (Urgent), 2 (High), 3 (Normal), 4 (Low)
 * @returns Badge dimensions; unknown values default to 32px/sm
 */
export function getBadgeDimensions(priority: number): BadgeDimensions {
  switch (priority) {
    case 1:
      return { size: '40px', fontSize: 'md' }
    case 2:
      return { size: '36px', fontSize: 'md' }
    case 3:
      return { size: '32px', fontSize: 'sm' }
    case 4:
      return { size: '28px', fontSize: 'xs' }
    case 0:
      return { size: '32px', fontSize: 'sm' }
    default:
      return { size: '32px', fontSize: 'sm' }
  }
}
