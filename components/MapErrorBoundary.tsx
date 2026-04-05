'use client'
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; message: string }
interface State { hasError: boolean }

export default class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400 text-sm">
          {this.props.message}
        </div>
      )
    }
    return this.props.children
  }
}
