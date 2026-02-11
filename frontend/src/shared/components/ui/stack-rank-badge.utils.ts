export interface BadgeDimensions {
  /** CSS size string for width and height */
  size: string
  /** Chakra UI fontSize token (project scale): lg (20px), xl (24px), etc. */
  fontSize: string
}

/** Explicit size options for the StackRankBadge */
export type StackRankBadgeSize = 'sm' | 'md' | 'lg'

/** Visual variant options for the StackRankBadge */
export type StackRankBadgeVariant = 'solid' | 'outline' | 'subtle'

/** Style properties returned by getVariantStyles */
export interface VariantStyleProps {
  bg: string
  color: string
  borderWidth: string
  borderColor?: string
}

/**
 * Returns badge dimensions (size and font size) based on priority level.
 *
 * Higher priorities get larger badges to create visual hierarchy:
 * - Priority 1 (Urgent): 40px, font xl
 * - Priority 2 (High):   36px, font xl
 * - Priority 3 (Normal): 32px, font lg
 * - Priority 4 (Low):    28px, font lg
 * - Priority 0 (None):   32px, font lg (base size, gray styling)
 *
 * @param priority - Linear priority: 0 (None), 1 (Urgent), 2 (High), 3 (Normal), 4 (Low)
 * @returns Badge dimensions; unknown values default to 32px/lg
 */
export function getBadgeDimensions(priority: number): BadgeDimensions {
  switch (priority) {
    case 1:
      return { size: '40px', fontSize: 'xl' }
    case 2:
      return { size: '36px', fontSize: 'xl' }
    case 3:
      return { size: '32px', fontSize: 'lg' }
    case 4:
      return { size: '28px', fontSize: 'lg' }
    case 0:
      return { size: '32px', fontSize: 'lg' }
    default:
      return { size: '32px', fontSize: 'lg' }
  }
}

/**
 * Returns badge dimensions for an explicit size prop.
 *
 * Overrides priority-based auto-sizing when a size prop is provided:
 * - sm: 24px badge, lg (20px) font — compact headers, dense lists
 * - md: 32px badge, lg (20px) font — standard list views
 * - lg: 40px badge, xl (24px) font — detail views, hero placements
 *
 * @param size - Explicit size: "sm" | "md" | "lg"
 * @returns Badge dimensions for the explicit size
 */
export function getExplicitSizeDimensions(size: StackRankBadgeSize): BadgeDimensions {
  switch (size) {
    case 'sm':
      return { size: '24px', fontSize: 'lg' }
    case 'md':
      return { size: '32px', fontSize: 'lg' }
    case 'lg':
      return { size: '40px', fontSize: 'xl' }
    default:
      // Runtime safety (should be unreachable with correct typing)
      return { size: '32px', fontSize: 'lg' }
  }
}

/**
 * Returns visual style properties for a variant + priority combination.
 *
 * Variant styles use theme tokens (never hardcoded hex):
 * - **solid** (default): Filled background with white text
 * - **outline**: Transparent bg with colored border and text
 * - **subtle**: Light tint background with accessible colored text
 *
 * Priority 0 (None) uses gray styling for all variants.
 *
 * **WCAG Contrast Notes:**
 * - `brand.green` (#8E992E) with white text is ~3.11:1, so it only meets WCAG AA when the badge text
 *   qualifies as "large text". This component uses large font sizes to satisfy that requirement.
 * - Non-text contrast (borders) should be ≥3:1 as well; "None" outline uses `gray.600` for visibility.
 *
 * @param variant - Visual variant: "solid" | "outline" | "subtle"
 * @param isNone - Whether priority is 0 (None), triggering gray styling
 * @returns Style props to spread on the badge Box
 */
export function getVariantStyles(variant: StackRankBadgeVariant, isNone: boolean): VariantStyleProps {
  if (isNone) {
    switch (variant) {
      case 'solid':
        return { bg: 'gray.600', color: 'white', borderWidth: '0' }
      case 'outline':
        return { bg: 'transparent', color: 'gray.600', borderWidth: '2px', borderColor: 'gray.600' }
      case 'subtle':
        return { bg: 'gray.100', color: 'gray.600', borderWidth: '0' }
      default:
        // Runtime safety (should be unreachable with correct typing)
        return { bg: 'gray.600', color: 'white', borderWidth: '0' }
    }
  }

  switch (variant) {
    case 'solid':
      return { bg: 'brand.green', color: 'white', borderWidth: '0' }
    case 'outline':
      return { bg: 'transparent', color: 'brand.greenAccessible', borderWidth: '2px', borderColor: 'brand.greenAccessible' }
    case 'subtle':
      return { bg: 'brand.greenLight', color: 'brand.greenAccessible', borderWidth: '0' }
    default:
      // Runtime safety (should be unreachable with correct typing)
      return { bg: 'brand.green', color: 'white', borderWidth: '0' }
  }
}
