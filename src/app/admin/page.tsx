'use client'
import React from 'react'
import dynamic from 'next/dynamic'

// 完全禁用 SSR — 用 next/dynamic 跳过服务端渲染，彻底避免 hydration mismatch
// Cache bust: v2-20250512-1724
const AdminPageInner = dynamic(() => import('./AdminPageInner'), { ssr: false })

// 全局错误捕获
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
          <h2>⚠️ Admin 页面出错</h2>
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
      <AdminPageInner />
    </AdminErrorBoundary>
  )
}
