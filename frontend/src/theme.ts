import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          green: { value: '#8E992E' },
          gray: { value: '#3E4543' },
          teal: { value: '#2C7B80' },
          yellow: { value: '#EDA200' },
          blue: { value: '#395389' },
          copper: { value: '#956125' },
        },
        error: {
          red: { value: '#E53E3E' },
        },
      },
      fonts: {
        heading: { value: 'Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
        body: { value: 'Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
      },
      spacing: {
        '1': { value: '4px' },
        '2': { value: '8px' },
        '3': { value: '12px' },
        '4': { value: '16px' },
        '6': { value: '24px' },
        '8': { value: '32px' },
        '12': { value: '48px' },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
