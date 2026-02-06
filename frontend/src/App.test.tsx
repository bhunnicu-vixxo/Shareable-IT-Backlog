import { render, screen } from '@/utils/test-utils'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // The backlog page is the default route — check for the heading specifically
    expect(screen.getByRole('heading', { name: /backlog/i })).toBeInTheDocument()
  })
})
