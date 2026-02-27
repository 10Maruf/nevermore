import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Keep console logging for debugging
    console.error('App crashed:', error)
    console.error('Component stack:', errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Something went wrong</h2>
        <p style={{ margin: '0 0 12px 0' }}>
          A page error occurred. Please go back to Home.
        </p>
        <button
          onClick={() => {
            window.location.href = '/'
          }}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
        >
          Go Home
        </button>
      </div>
    )
  }
}
