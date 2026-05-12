'use client'
import React, { useState, useEffect } from 'react'
import type { Category, Work, SiteSettings } from '@/lib/types'

// 完全禁用 SSR，避免 hydration 不匹配
// 使用动态 import + no-ssr 模式
function AdminNoSSR() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ color: '#999' }}>加载中...</div>
      </div>
    )
  }

  return <AdminPageInner />
}

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

// 密码登录界面
function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!pwd.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      })
      if (res.ok) {
        onSuccess()
      } else {
        setError('密码错误')
      }
    } catch {
      setError('网络错误')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-semibold text-center mb-8">管理后台</h1>
        <div className="flex flex-col gap-4">
          <input
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="请输入管理员密码"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
            autoFocus
          />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading || !pwd.trim()}
            className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition"
          >
            {loading ? '验证中...' : '进入后台'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPageWrapper() {
  return (
    <AdminErrorBoundary>
      <AdminNoSSR />
    </AdminErrorBoundary>
  )
}

function AdminPageInner() {
  const [categories, setCategories] = useState<Category[]>([])
  const [works, setWorks] = useState<Work[]>([])
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)
  const [activeTab, setActiveTab] = useState<'works' | 'categories' | 'settings'>('works')
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [defaultCategoryId, setDefaultCategoryId] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // 客户端检查登录状态（避免 SSR/客户端不一致导致 hydration 错误）
  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === '1') {
      setAuthenticated(true)
    }
    setAuthChecked(true)
  }, [])
  const [dataLoaded, setDataLoaded] = useState(false)
  const fileInputRef = { current: null as HTMLInputElement | null }

  const loadData = async () => {
    try {
      console.log('[admin] loadData start')
      const [c, w] = await Promise.all([
        fetch('/api/categories').then(r => { console.log('[admin] categories status:', r.status); return r.json(); }),
        fetch('/api/works').then(r => { console.log('[admin] works status:', r.status); return r.json(); })
      ])
      console.log('[admin] categories:', c.length, 'works:', w.length)
      setCategories(c)
      setWorks(w)
      if (c.length > 0 && !defaultCategoryId) {
        setDefaultCategoryId(c[0].id)
      }
    } catch (err) {
      console.error('[admin] Failed to load data:', err)
    } finally {
      setDataLoaded(true)
    }
  }

  const loadSettings = async () => {
    try {
      console.log('[admin] loadSettings start')
      const s = await fetch('/api/settings').then(r => { console.log('[admin] settings status:', r.status); return r.json(); })
      console.log('[admin] settings:', s)
      setSiteSettings(s)
    } catch (err) {
      console.error('[admin] Failed to load settings:', err)
    }
  }

  // 客户端还没检查完 → 避免 hydration 不匹配
  if (!authChecked) {
    return null
  }

  // 未登录 → 显示密码框
  if (!authenticated) {
    return (
      <PasswordGate onSuccess={() => {
        sessionStorage.setItem('admin_auth', '1')
        setAuthenticated(true)
      }} />
    )
  }

  // 批量上传
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (!defaultCategoryId) {
      alert('请先创建分类')
      return
    }

    setUploading(true)
    const items: { imageUrl: string; thumbnailUrl: string; categoryId: string; title?: string }[] = []

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.url) {
          items.push({
            imageUrl: data.url,
            thumbnailUrl: data.thumbnailUrl || data.url,
            categoryId: defaultCategoryId,
            title: file.name.replace(/\.[^/.]+$/, '').slice(0, 50)
          })
        }
      } catch (err) {
        console.error('Upload failed:', file.name, err)
      }
    }

    if (items.length > 0) {
      await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true, items })
      })
      loadData()
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定删除 ${selectedIds.size} 个作品？`)) return

    const ids = Array.from(selectedIds).join(',')
    await fetch(`/api/works?ids=${ids}`, { method: 'DELETE' })
    setSelectedIds(new Set())
    loadData()
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === works.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(works.map(w => w.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const handleDeleteWork = async (id: string) => {
    if (!confirm('删除此作品？')) return
    await fetch(`/api/works?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  // 分类
  const [newCatName, setNewCatName] = useState('')
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`添加失败: ${data.error || res.status}`)
        return
      }
      setNewCatName('')
      loadData()
    } catch (err) {
      alert('网络错误，请稍后重试')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('删除此分类？该分类下所有作品也会被删除！')) return
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  // 分类重命名
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null)
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null)

  const startEditCat = (cat: Category) => {
    setEditingCatId(cat.id)
    setEditingCatName(cat.name)
  }

  const saveEditCat = async () => {
    if (!editingCatId || !editingCatName.trim()) return
    await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingCatId, name: editingCatName.trim() })
    })
    setEditingCatId(null)
    setEditingCatName('')
    loadData()
  }

  const cancelEditCat = () => {
    setEditingCatId(null)
    setEditingCatName('')
  }

  // 分类拖拽排序
  const handleCatDragStart = (catId: string) => {
    setDraggedCatId(catId)
  }

  const handleCatDragOver = (e: React.DragEvent, catId: string) => {
    e.preventDefault()
    if (catId !== draggedCatId) {
      setDragOverCatId(catId)
    }
  }

  const handleCatDragLeave = () => {
    setDragOverCatId(null)
  }

  const handleCatDrop = async (e: React.DragEvent, targetCatId: string) => {
    e.preventDefault()
    setDragOverCatId(null)
    
    if (!draggedCatId || draggedCatId === targetCatId) {
      setDraggedCatId(null)
      return
    }

    // 重新排序
    const draggedIndex = categories.findIndex(c => c.id === draggedCatId)
    const targetIndex = categories.findIndex(c => c.id === targetCatId)
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedCatId(null)
      return
    }

    const newCategories = [...categories]
    const [draggedItem] = newCategories.splice(draggedIndex, 1)
    newCategories.splice(targetIndex, 0, draggedItem)

    // 更新本地状态
    setCategories(newCategories)
    setDraggedCatId(null)

    // 保存到服务器
    const updates = newCategories.map((cat, index) => ({
      id: cat.id,
      sortOrder: index,
    }))

    try {
      await fetch('/api/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
    } catch (err) {
      console.error('Failed to save category order:', err)
    }
  }

  // 设置
  const [siteTitle, setSiteTitle] = useState('')
  const [siteName, setSiteName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const openSettings = async () => {
    setActiveTab('settings')
    await loadSettings()
    if (siteSettings) {
      setSiteTitle(siteSettings.siteTitle || '')
      setSiteName(siteSettings.siteName || '')
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteTitle: siteTitle.trim(), siteName: siteName.trim() }),
      })
      if (res.ok) {
        setSaveMsg('保存成功')
        setTimeout(() => setSaveMsg(''), 2000)
        loadSettings()
      } else {
        setSaveMsg('保存失败')
      }
    } catch {
      setSaveMsg('保存失败')
    }
    setSaving(false)
  }

  // 加载初始数据
  useEffect(() => {
    loadData()
    loadSettings()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 顶部 */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </a>
          <h1 className="text-lg font-semibold flex-1">管理后台</h1>
          <button
            onClick={openSettings}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            设置
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_auth')
              setAuthenticated(false)
            }}
            className="text-xs text-gray-400 hover:text-gray-500 px-2 py-1"
          >
            退出
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-2 gap-1">
          <button
            onClick={() => { setActiveTab('works'); setSelectedIds(new Set()) }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'works' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            作品
          </button>
          <button
            onClick={() => { setActiveTab('categories'); setSelectedIds(new Set()) }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'categories' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            分类
          </button>
          <button
            onClick={() => { setActiveTab('settings'); loadSettings() }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'settings' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            设置
          </button>
        </div>
      </div>

      {/* Works Tab */}
      {activeTab === 'works' && (
        <div className="px-4 pt-4">
          {/* 批量操作栏 */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={defaultCategoryId}
              onChange={e => setDefaultCategoryId(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-auto"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label className="cursor-pointer text-sm py-2 px-4 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition disabled:opacity-50">
              {uploading ? '上传中...' : '+ 批量上传'}
              <input
                ref={el => { fileInputRef.current = el }}
                type="file"
                accept="image/*"
                multiple
                onChange={handleBatchUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>

            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-full hover:bg-red-100 transition"
              >
                删除 ({selectedIds.size})
              </button>
            )}
          </div>

          {/* 全选 */}
          {works.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === works.length && works.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300"
                />
                全选
              </label>
              <span className="text-xs text-gray-400">{works.length} 个作品</span>
            </div>
          )}

          {/* 作品网格 */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {works.map(work => (
              <div
                key={work.id}
                className={`relative rounded-xl overflow-hidden bg-gray-50 border-2 transition-all group ${
                  selectedIds.has(work.id) ? 'border-gray-900' : 'border-transparent'
                }`}
              >
                <div
                  className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded bg-white/80 backdrop-blur flex items-center justify-center cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleSelect(work.id); }}
                >
                  {selectedIds.has(work.id) && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteWork(work.id)}
                  className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded bg-white/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#e55" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>

                <img
                  src={work.thumbnailUrl || work.imageUrl}
                  alt={work.title || ''}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {works.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">暂无作品</p>
              <p className="text-xs mt-1">点击上方按钮上传</p>
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="px-4 pt-4">
          <div className="flex gap-2 mb-4">
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              placeholder="输入分类名称"
              className="flex-1"
            />
            <button onClick={handleAddCategory} className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm">添加</button>
          </div>

          <div className="space-y-2">
            {categories.map(cat => (
              <div
                key={cat.id}
                draggable
                onDragStart={() => handleCatDragStart(cat.id)}
                onDragOver={(e) => handleCatDragOver(e, cat.id)}
                onDragLeave={handleCatDragLeave}
                onDrop={(e) => handleCatDrop(e, cat.id)}
                className={`flex items-center gap-3 bg-gray-50 p-4 rounded-xl cursor-move transition ${
                  draggedCatId === cat.id ? 'opacity-50' : ''
                } ${dragOverCatId === cat.id ? 'border-2 border-dashed border-gray-400' : ''}`}
              >
                {editingCatId === cat.id ? (
                  <>
                    <input
                      value={editingCatName}
                      onChange={e => setEditingCatName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEditCat()
                        if (e.key === 'Escape') cancelEditCat()
                      }}
                      autoFocus
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                    />
                    <button onClick={saveEditCat} className="text-xs text-green-600 px-2 py-1.5 rounded-full hover:bg-green-50 transition">保存</button>
                    <button onClick={cancelEditCat} className="text-xs text-gray-400 px-2 py-1.5 rounded-full hover:bg-gray-100 transition">取消</button>
                  </>
                ) : (
                  <>
                    {/* 拖拽手柄 */}
                    <div className="text-gray-300 cursor-grab active:cursor-grabbing">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
                        <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
                        <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
                        <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-medium text-sm truncate cursor-pointer hover:text-gray-600"
                        onClick={() => startEditCat(cat)}
                      >{cat.name}</h3>
                      <p className="text-xs text-gray-400">{cat.works?.length || 0} 个作品</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditCat(cat)}
                        className="text-xs text-gray-400 px-2 py-1.5 rounded-full hover:bg-gray-100 transition"
                      >重命名</button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-xs text-red-500 px-2 py-1.5 rounded-full hover:bg-red-50 transition"
                      >删除</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <p className="text-center text-gray-400 py-12 text-sm">暂无分类</p>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="px-4 pt-4">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">首页标题</label>
              <p className="text-xs text-gray-400 mb-2">显示在首页顶部的标题文字</p>
              <input
                value={siteTitle}
                onChange={e => setSiteTitle(e.target.value)}
                placeholder="设计作品集"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">站点名称</label>
              <p className="text-xs text-gray-400 mb-2">浏览器标签页显示的名称</p>
              <input
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                placeholder="Portfolio"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>

            {saveMsg && (
              <p className={`text-xs text-center ${saveMsg === '保存成功' ? 'text-green-600' : 'text-red-500'}`}>
                {saveMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
          <a href="/" className="flex flex-col items-center gap-0.5 px-4 py-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="text-[10px] text-gray-400">首页</span>
          </a>
          <div className="flex flex-col items-center gap-0.5 px-4 py-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-900">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <span className="text-[10px] text-gray-900 font-medium">管理</span>
          </div>
        </div>
      </nav>
    </div>
  )
}
