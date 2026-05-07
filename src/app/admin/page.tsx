'use client'
import { useState, useEffect, useRef } from 'react'
import type { Category, Work } from '@/lib/types'

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [works, setWorks] = useState<Work[]>([])
  const [activeTab, setActiveTab] = useState<'works' | 'categories'>('works')
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [defaultCategoryId, setDefaultCategoryId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = async () => {
    const [c, w] = await Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/works').then(r => r.json())
    ])
    setCategories(c)
    setWorks(w)
    if (c.length > 0 && !defaultCategoryId) {
      setDefaultCategoryId(c[0].id)
    }
  }

  useEffect(() => { loadData() }, [])

  // 批量上传
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (!defaultCategoryId) {
      alert('请先创建分类')
      return
    }

    setUploading(true)
    const items: { imageUrl: string; categoryId: string; title?: string }[] = []

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.url) {
          items.push({
            imageUrl: data.url,
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
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim() })
    })
    setNewCatName('')
    loadData()
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('删除此分类？该分类下所有作品也会被删除！')) return
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    loadData()
  }

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
          <h1 className="text-lg font-semibold">管理后台</h1>
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

            <label className="btn-primary cursor-pointer text-sm py-2 px-4">
              {uploading ? '上传中...' : '+ 批量上传'}
              <input
                ref={fileInputRef}
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
                className={`relative rounded-xl overflow-hidden bg-gray-50 border-2 transition-all ${
                  selectedIds.has(work.id) ? 'border-gray-900' : 'border-transparent'
                }`}
              >
                {/* 选择框 */}
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

                {/* 删除按钮 */}
                <button
                  onClick={() => handleDeleteWork(work.id)}
                  className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded bg-white/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#e55" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>

                <img
                  src={work.imageUrl}
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
            <button onClick={handleAddCategory} className="btn-primary px-5">添加</button>
          </div>

          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                <div>
                  <h3 className="font-medium text-sm">{cat.name}</h3>
                  <p className="text-xs text-gray-400">{cat.works?.length || 0} 个作品</p>
                </div>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-xs text-red-500 px-3 py-1.5 rounded-full hover:bg-red-50 transition"
                >
                  删除
                </button>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <p className="text-center text-gray-400 py-12 text-sm">暂无分类</p>
          )}
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
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </div>
  )
}
