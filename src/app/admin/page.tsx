'use client'
import React from 'react'
import dynamic from 'next/dynamic'

// 瀹屽叏绂佺敤 SSR 鈥?鐢?next/dynamic 璺宠繃鏈嶅姟绔覆鏌擄紝褰诲簳閬垮厤 hydration mismatch
// Cache bust: v2-20250512-1724
const AdminPageContent = dynamic(() => import('./AdminPageContent'), { ssr: false })

// 鍏ㄥ眬閿欒鎹曡幏
class AdminErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: '#e55' }}>
          <h2>鈿狅笍 Admin 椤甸潰鍑洪敊</h2>
          <pre style={{ color: '#666', marginTop: 16, whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

export default function AdminPageWrapper() {
  return (
    <AdminErrorBoundary>
      <AdminPageContent />
    </AdminErrorBoundary>
  )
}

