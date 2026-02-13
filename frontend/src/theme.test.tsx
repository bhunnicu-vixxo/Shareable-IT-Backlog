import { describe, it, expect } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import { system } from './theme'
import { Button, Badge } from '@chakra-ui/react'

describe('Theme Configuration', () => {
  describe('system creation', () => {
    it('creates a valid Chakra system', () => {
      expect(system).toBeDefined()
      expect(system).toHaveProperty('token')
    })
  })

  describe('brand color tokens', () => {
    it('defines brand.green token', () => {
      const value = system.token('colors.brand.green')
      expect(value).toBe('#8E992E')
    })

    it('defines brand.gray token', () => {
      const value = system.token('colors.brand.gray')
      expect(value).toBe('#3E4543')
    })

    it('defines brand.teal token', () => {
      const value = system.token('colors.brand.teal')
      expect(value).toBe('#2C7B80')
    })

    it('defines brand.yellow token', () => {
      const value = system.token('colors.brand.yellow')
      expect(value).toBe('#EDA200')
    })

    it('defines brand.blue token', () => {
      const value = system.token('colors.brand.blue')
      expect(value).toBe('#395389')
    })

    it('defines brand.copper token', () => {
      const value = system.token('colors.brand.copper')
      expect(value).toBe('#956125')
    })

    it('defines error.red token', () => {
      const value = system.token('colors.error.red')
      expect(value).toBe('#E53E3E')
    })
  })

  describe('brand palettes (50–950)', () => {
    it('defines a full green palette scale under brandPalette.green', () => {
      expect(system.token('colors.brandPalette.green.50')).toMatch(/^#[0-9A-F]{6}$/)
      expect(system.token('colors.brandPalette.green.100')).toMatch(/^#[0-9A-F]{6}$/)
      expect(system.token('colors.brandPalette.green.200')).toMatch(/^#[0-9A-F]{6}$/)
      expect(system.token('colors.brandPalette.green.300')).toMatch(/^#[0-9A-F]{6}$/)
      expect(system.token('colors.brandPalette.green.400')).toMatch(/^#[0-9A-F]{6}$/)
      expect(system.token('colors.brandPalette.green.500')).toBe('#8E992E')
      expect(system.token('colors.brandPalette.green.600')).toMatch(/^#[0-9A-F]{6}$/)
      expect(system.token('colors.brandPalette.green.700')).toMatch(/^#[0-9A-F]{6}$/)
      expect(system.token('colors.brandPalette.green.800')).toMatch(/^#[0-9A-F]{6}$/)
      expect(system.token('colors.brandPalette.green.900')).toMatch(/^#[0-9A-F]{6}$/)
      expect(system.token('colors.brandPalette.green.950')).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('defines palettes for all required brand colors', () => {
      expect(system.token('colors.brandPalette.gray.500')).toBe('#3E4543')
      expect(system.token('colors.brandPalette.teal.500')).toBe('#2C7B80')
      expect(system.token('colors.brandPalette.yellow.500')).toBe('#EDA200')
      expect(system.token('colors.brandPalette.blue.500')).toBe('#395389')
      expect(system.token('colors.brandPalette.copper.500')).toBe('#956125')
    })
  })

  describe('hover/active color variants', () => {
    it('defines brand.greenHover token', () => {
      expect(system.token('colors.brand.greenHover')).toBe('#7A8528')
    })

    it('defines brand.greenActive token', () => {
      expect(system.token('colors.brand.greenActive')).toBe('#6B7322')
    })

    it('defines brand.greenAccessible token (≥4.5:1 contrast)', () => {
      expect(system.token('colors.brand.greenAccessible')).toBe('#6F7B24')
    })

    it('defines brand.greenLight token', () => {
      expect(system.token('colors.brand.greenLight')).toBe('#F4F5E9')
    })

    it('defines error.redHover token', () => {
      expect(system.token('colors.error.redHover')).toBe('#C53030')
    })

    it('defines error.redLight token', () => {
      expect(system.token('colors.error.redLight')).toBe('#FFF5F5')
    })

    it('defines error.redAccessible token (≥4.5:1 contrast)', () => {
      expect(system.token('colors.error.redAccessible')).toBe('#C53030')
    })
  })

  describe('font tokens', () => {
    it('uses Arial as primary heading font', () => {
      const value = system.token('fonts.heading')
      expect(value).toContain('Arial')
    })

    it('uses Arial as primary body font', () => {
      const value = system.token('fonts.body')
      expect(value).toContain('Arial')
    })
  })

  describe('font size tokens', () => {
    it('defines xs (12px) for Tiny text', () => {
      expect(system.token('fontSizes.xs')).toBe('12px')
    })

    it('defines sm (14px) for Small text', () => {
      expect(system.token('fontSizes.sm')).toBe('14px')
    })

    it('defines md (16px) for Body text', () => {
      expect(system.token('fontSizes.md')).toBe('16px')
    })

    it('defines lg (20px) for H3', () => {
      expect(system.token('fontSizes.lg')).toBe('20px')
    })

    it('defines xl (24px) for H2', () => {
      expect(system.token('fontSizes.xl')).toBe('24px')
    })

    it('defines 2xl (32px) for H1', () => {
      expect(system.token('fontSizes.2xl')).toBe('32px')
    })
  })

  describe('line height tokens', () => {
    it('defines tight (1.2) for H1', () => {
      expect(system.token('lineHeights.tight')).toBe('1.2')
    })

    it('defines snug (1.3) for H2/H3', () => {
      expect(system.token('lineHeights.snug')).toBe('1.3')
    })

    it('defines normal (1.5) for body/small text', () => {
      expect(system.token('lineHeights.normal')).toBe('1.5')
    })
  })

  describe('spacing tokens', () => {
    it('defines 4px spacing unit (1)', () => {
      expect(system.token('spacing.1')).toBe('4px')
    })

    it('defines 8px spacing unit (2)', () => {
      expect(system.token('spacing.2')).toBe('8px')
    })

    it('defines 12px spacing unit (3)', () => {
      expect(system.token('spacing.3')).toBe('12px')
    })

    it('defines 16px spacing unit (4)', () => {
      expect(system.token('spacing.4')).toBe('16px')
    })

    it('defines 24px spacing unit (6)', () => {
      expect(system.token('spacing.6')).toBe('24px')
    })

    it('defines 32px spacing unit (8)', () => {
      expect(system.token('spacing.8')).toBe('32px')
    })

    it('defines 48px spacing unit (12)', () => {
      expect(system.token('spacing.12')).toBe('48px')
    })
  })
})

describe('Component Recipe Rendering', () => {
  describe('Button', () => {
    // Custom variants ("brand", "danger") are added via theme recipes.
    // Chakra's generated types don't reflect custom recipe variants,
    // so we use spread props to bypass strict prop type checking.

    it('renders a Button with brand variant inside ChakraProvider', () => {
      render(<Button {...({ variant: 'brand' } as Record<string, string>)}>Primary Action</Button>)
      expect(screen.getByText('Primary Action')).toBeInTheDocument()
    })

    it('renders a Button with outline variant', () => {
      render(<Button variant="outline">Secondary</Button>)
      expect(screen.getByText('Secondary')).toBeInTheDocument()
    })

    it('renders a Button with ghost variant', () => {
      render(<Button variant="ghost">Tertiary</Button>)
      expect(screen.getByText('Tertiary')).toBeInTheDocument()
    })

    it('renders a Button with danger variant', () => {
      render(<Button {...({ variant: 'danger' } as Record<string, string>)}>Delete</Button>)
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  describe('Badge', () => {
    // Custom status variants ("success", "error", "warning", "info", "neutral")
    // are added via theme recipes. Chakra's types don't reflect them.

    it('renders a Badge with success variant', () => {
      render(<Badge {...({ variant: 'success' } as Record<string, string>)}>Synced</Badge>)
      expect(screen.getByText('Synced')).toBeInTheDocument()
    })

    it('renders a Badge with error variant', () => {
      render(<Badge {...({ variant: 'error' } as Record<string, string>)}>Failed</Badge>)
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('renders a Badge with warning variant', () => {
      render(<Badge {...({ variant: 'warning' } as Record<string, string>)}>Partial</Badge>)
      expect(screen.getByText('Partial')).toBeInTheDocument()
    })

    it('renders a Badge with info variant', () => {
      render(<Badge {...({ variant: 'info' } as Record<string, string>)}>Syncing</Badge>)
      expect(screen.getByText('Syncing')).toBeInTheDocument()
    })

    it('renders a Badge with neutral variant', () => {
      render(<Badge {...({ variant: 'neutral' } as Record<string, string>)}>Unknown</Badge>)
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
  })
})

describe('Component Recipe Definitions', () => {
  type SystemConfig = {
    theme?: {
      recipes?: {
        button?: {
          variants?: {
            variant?: {
              brand?: {
                bg?: string
                fontSize?: string
                fontWeight?: string
                _hover?: { bg?: string }
                _active?: { bg?: string }
              }
              danger?: {
                bg?: string
                fontSize?: string
                fontWeight?: string
              }
            }
          }
        }
        badge?: {
          variants?: {
            variant?: {
              warning?: { bg?: string; color?: string }
              error?: { bg?: string; color?: string }
            }
          }
        }
      }
      slotRecipes?: {
        alert?: {
          variants?: {
            status?: {
              success?: {
                root?: { borderLeftWidth?: string; borderLeftColor?: string }
              }
            }
          }
        }
      }
    }
  }

  it('defines brand button styles that reference expected tokens', () => {
    const themeRecipes = (system as unknown as { _config?: SystemConfig })._config
    const button = themeRecipes?.theme?.recipes?.button
    expect(button).toBeDefined()
    expect(button?.variants?.variant?.brand?.bg).toBe('brand.green')
    expect(button?.variants?.variant?.brand?._hover?.bg).toBe('brand.greenHover')
    expect(button?.variants?.variant?.brand?._active?.bg).toBe('brand.greenActive')
  })

  it('defines badge status variants with WCAG-safe pairings', () => {
    const themeRecipes = (system as unknown as { _config?: SystemConfig })._config
    const badge = themeRecipes?.theme?.recipes?.badge
    expect(badge).toBeDefined()
    expect(badge?.variants?.variant?.warning?.bg).toBe('brand.yellowLight')
    expect(badge?.variants?.variant?.warning?.color).toBe('brand.gray')
  })

  it('badge error variant uses accessible red for text (≥4.5:1 contrast on redLight)', () => {
    const themeRecipes = (system as unknown as { _config?: SystemConfig })._config
    const badge = themeRecipes?.theme?.recipes?.badge
    expect(badge?.variants?.variant?.error?.color).toBe('error.redAccessible')
  })

  it('button brand variant has bold font weight for large text compliance', () => {
    const themeRecipes = (system as unknown as { _config?: SystemConfig })._config
    const button = themeRecipes?.theme?.recipes?.button
    expect(button?.variants?.variant?.brand?.fontWeight).toBe('bold')
  })

  it('button brand variant enforces sm font size (≥14px) for large text compliance', () => {
    const themeRecipes = (system as unknown as { _config?: SystemConfig })._config
    const button = themeRecipes?.theme?.recipes?.button
    expect(button?.variants?.variant?.brand?.fontSize).toBe('sm')
  })

  it('button danger variant has bold font weight for large text compliance', () => {
    const themeRecipes = (system as unknown as { _config?: SystemConfig })._config
    const button = themeRecipes?.theme?.recipes?.button
    expect(button?.variants?.variant?.danger?.fontWeight).toBe('bold')
  })

  it('button danger variant enforces sm font size (≥14px) for large text compliance', () => {
    const themeRecipes = (system as unknown as { _config?: SystemConfig })._config
    const button = themeRecipes?.theme?.recipes?.button
    expect(button?.variants?.variant?.danger?.fontSize).toBe('sm')
  })

  it('defines alert slot recipe with left border accents', () => {
    const themeRecipes = (system as unknown as { _config?: SystemConfig })._config
    const alert = themeRecipes?.theme?.slotRecipes?.alert
    expect(alert).toBeDefined()
    expect(alert?.variants?.status?.success?.root?.borderLeftWidth).toBe('4px')
    expect(alert?.variants?.status?.success?.root?.borderLeftColor).toBe('brand.green')
  })
})
