/**
 * Deterministic label color mapping.
 *
 * Assigns a consistent, visually distinct color pair (background + text)
 * to each label based on a hash of its name. Labels like 'VixxoLink',
 * 'Siebel', 'Infrastructure' etc. each get a unique color identity
 * that remains stable across renders and page loads.
 *
 * Uses brand-adjacent colors that complement the Vixxo palette while
 * maintaining WCAG AA contrast ratios for readability.
 */

/** Color pair for label pills. */
export interface LabelColor {
  /** Background color for the pill. */
  bg: string
  /** Text color for the pill. */
  color: string
  /** Small accent dot color (darker shade for visual punch). */
  dot: string
}

/**
 * Curated palette of 8 distinct label color pairs.
 * Each ensures ≥4.5:1 contrast ratio between text and background.
 */
const LABEL_PALETTE: LabelColor[] = [
  // Teal — brand.teal family
  { bg: '#E6F6F7', color: '#1F5E62', dot: '#2C7B80' },
  // Olive — brand.green family
  { bg: '#F0F2E0', color: '#556020', dot: '#6F7B24' },
  // Indigo — brand.blue family
  { bg: '#E8ECF4', color: '#2D3F6B', dot: '#395389' },
  // Amber — brand.copper family
  { bg: '#FBF0E0', color: '#6B4518', dot: '#956125' },
  // Rose — warm pink accent
  { bg: '#FBE8EC', color: '#8B2340', dot: '#C2375A' },
  // Violet — purple accent
  { bg: '#EEEAF8', color: '#4A3578', dot: '#6B4FA0' },
  // Cyan — cool blue-green
  { bg: '#E0F4F6', color: '#1A5C66', dot: '#1890A0' },
  // Slate — neutral warmth
  { bg: '#EDEEF0', color: '#3D4550', dot: '#5A6370' },
]

/**
 * Simple string hash (djb2 algorithm).
 * Produces a stable positive integer for any input string.
 */
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Get a deterministic color pair for a label name.
 *
 * The same label name always returns the same color.
 * Different label names distribute evenly across the palette.
 */
export function getLabelColor(labelName: string): LabelColor {
  const index = hashString(labelName) % LABEL_PALETTE.length
  return LABEL_PALETTE[index]
}
