'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { Category, Work } from '@/lib/types'

// 单指手势模式
type GestureMode = 'none' | 'swipe' | 'pan' | 'zoom'

interface TouchState {
  mode: GestureMode
  // 单指
  startX: number
  startY: number
  lastX: number
  lastY: number
  deltaX: number
  deltaY: number
  // 双指缩放
  initialDistance: number
  initialScale: number
  // 当前缩放
  scale: number
  panX: number
  panY: number
  originX: number
  originY: number
}

const initialTouch: TouchState = {
  mode: 'none',
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  deltaX: 0,
  deltaY: 0,
  initialDistance: 0,
  initialScale: 1,
  scale: 1,
  panX: 0,
  panY: 0,
  originX: 0,
  originY: 0,
}

function getDistance(t1: React.Touch | Touch, t2: React.Touch | Touch) {
  const dx = t2.clientX - t1.clientX
  const dy = t2.clientY - t1.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getMidpoint(t1: React.Touch | Touch, t2: React.Touch | Touch) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  }
}

export default function GallerySection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeSlug, setActiveSlug] = useState<string>('all')
  const [works, setWorks] = useState<Work[]>([])
  const [lightbox, setLightbox] = useState<Work | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const touch = useRef<TouchState>({ ...initialTouch })
  const activePointerCount = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 双击状态（用于重置缩放）
  const lastTap = useRef<number>(0)

  const PER_PAGE = 20

  const loadData = useCallback(async () => {
    const [c, w] = await Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/works').then(r => r.json())
    ])
    setCategories(c)
    setWorks(w)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredWorks = activeSlug === 'all'
    ? works
    : works.filter(w => w.category?.slug === activeSlug)

  const displayedWorks = filteredWorks.slice(0, page * PER_PAGE)

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    if (displayedWorks.length >= filteredWorks.length) {
      setHasMore(false)
      return
    }
    setLoading(true)
    setTimeout(() => {
      setPage(p => p + 1)
      setLoading(false)
    }, 300)
  }, [loading, hasMore, displayedWorks.length, filteredWorks.length])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { threshold: 0.1 }
    )
    const sentinel = document.getElementById('scroll-sentinel')
    if (sentinel) observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => {
    setPage(1)
    setHasMore(true)
  }, [activeSlug])

  // 打开灯箱时重置缩放和滚动
  const openLightbox = (work: Work) => {
    touch.current = { ...initialTouch }
    const idx = filteredWorks.findIndex(w => w.id === work.id)
    setLightboxIndex(idx)
    setLightbox(work)
  }

  const goTo = useCallback((index: number) => {
    if (index < 0) index = filteredWorks.length - 1
    if (index >= filteredWorks.length) index = 0
    touch.current = { ...initialTouch }
    setLightboxIndex(index)
    setLightbox(filteredWorks[index])
  }, [filteredWorks])

  const goNext = useCallback(() => goTo(lightboxIndex + 1), [lightboxIndex, goTo])
  const goPrev = useCallback(() => goTo(lightboxIndex - 1), [lightboxIndex, goTo])

  // ============================================================
  // 指针事件处理（统一处理鼠标/触摸/触控笔）
  // ============================================================
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.isPrimary) {
      touch.current.startX = e.clientX
      touch.current.startY = e.clientY
      touch.current.lastX = e.clientX
      touch.current.lastY = e.clientY
      touch.current.deltaX = 0
      touch.current.deltaY = 0
    }
    activePointerCount.current += 1
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const t = touch.current
    t.lastX = e.clientX
    t.lastY = e.clientY
    t.deltaX = e.clientX - t.startX
    t.deltaY = e.clientY - t.startY
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    activePointerCount.current = Math.max(0, activePointerCount.current - 1)
    if (activePointerCount.current === 0) {
      const t = touch.current
      // 如果是滑动模式，判断是否切换图片
      if (t.mode === 'swipe') {
        const threshold = 50
        if (t.deltaX < -threshold) goNext()
        else if (t.deltaX > threshold) goPrev()
      }
      t.mode = 'none'
    }
  }, [goNext, goPrev])

  // ============================================================
  // Wheel 事件（PC 端滚轮缩放）
  // ============================================================
  // ============================================================
  // Wheel 事件（PC 端滚轮缩放）+ 移动端双指捏合缩放
  // ============================================================
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const t = touch.current
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    t.scale = Math.min(Math.max(t.scale + delta, 0.5), 5)
    if (t.scale <= 1) { t.panX = 0; t.panY = 0 }
  }, [])

  // ============================================================
  // 移动端触摸手势（单指滑动 + 双指缩放）
  // ============================================================
  const lastTouchDist = useRef(0)
  const lastTouchMid = useRef({ x: 0, y: 0 })
  // 单指滑动起点
  const touchStart = useRef<{ x: number; y: number; mode: 'none' | 'swipe' | 'pan' }>({ x: 0, y: 0, mode: 'none' })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 单指：记录起点，用于滑动判断
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        mode: 'none',
      }
    } else if (e.touches.length === 2) {
      // 双指：进入缩放模式
      e.preventDefault()
      const t = touch.current
      t.mode = 'zoom'
      lastTouchDist.current = getDistance(e.touches[0], e.touches[1])
      const mid = getMidpoint(e.touches[0], e.touches[1])
      lastTouchMid.current = { x: mid.x, y: mid.y }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const t = touch.current
      const dist = getDistance(e.touches[0], e.touches[1])
      if (lastTouchDist.current > 0) {
        const ratio = dist / lastTouchDist.current
        t.scale = Math.min(Math.max(t.scale * ratio, 0.5), 5)
      }
      lastTouchDist.current = dist
      const mid = getMidpoint(e.touches[0], e.touches[1])
      t.panX += mid.x - lastTouchMid.current.x
      t.panY += mid.y - lastTouchMid.current.y
      lastTouchMid.current = { x: mid.x, y: mid.y }
    } else if (e.touches.length === 1) {
      // 单指：滑动检测
      const start = touchStart.current
      const dx = e.touches[0].clientX - start.x
      const dy = e.touches[0].clientY - start.y
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)

      if (start.mode === 'none' && (absX > 8 || absY > 8)) {
        // 第一次移动超过阈值，判断是 swipe 还是 pan
        if (absX > absY * 1.5) {
          start.mode = 'swipe'
        } else {
          start.mode = 'pan'
        }
        touch.current.mode = start.mode
      }

      if (start.mode === 'swipe') {
        // 直接更新 deltaX 用于滑动动画
        touch.current.deltaX = dx
        touch.current.deltaY = dy
      } else if (start.mode === 'pan') {
        // 垂直滚动模式
        touch.current.panX = 0
        touch.current.panY = dy
      }
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastTouchDist.current = 0
    }
    if (e.touches.length === 0) {
      // 所有手指离开
      const t = touch.current
      if (t.mode === 'swipe') {
        const threshold = 50
        if (t.deltaX < -threshold) goNext()
        else if (t.deltaX > threshold) goPrev()
        t.deltaX = 0
        t.deltaY = 0
      }
      if (t.scale <= 1) { t.scale = 1; t.panX = 0; t.panY = 0 }
      t.mode = 'none'
    }
  }, [goNext, goPrev])

  // 双击切换 1x / 2x 缩放
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const t = touch.current
    const now = Date.now()
    if (now - lastTap.current < 300) {
      t.scale = t.scale > 1.5 ? 1 : 2
      t.panX = 0
      t.panY = 0
    }
    lastTap.current = now
  }, [])

  // ============================================================
  // 双击重置缩放
  // ============================================================
  // 手势识别：onPointerDown 触发时判断模式
  // 双击在 pointer 层面处理

  // ============================================================
  // 手势判定：根据 delta 判断 pan / swipe
  // ============================================================
  const determineGestureMode = useCallback((): GestureMode => {
    const t = touch.current
    const absX = Math.abs(t.deltaX)
    const absY = Math.abs(t.deltaY)

    if (t.scale !== 1) return 'pan' // 已经缩放过，只能 pan
    if (absX < 8 && absY < 8) return 'none' // 移动距离太小

    if (absX > absY * 1.5) return 'swipe'    // 水平移动为主 → 滑动换图
    return 'pan'                               // 垂直移动为主 → 平移/滚动
  }, [])

  const handlePointerMoveWrapper = useCallback((e: React.PointerEvent) => {
    handlePointerMove(e)
    const t = touch.current

    if (t.mode === 'none') {
      // 移动超过阈值才确定模式
      const absX = Math.abs(t.deltaX)
      const absY = Math.abs(t.deltaY)
      if (absX > 8 || absY > 8) {
        t.mode = determineGestureMode()
      }
    }

    // 在 pan 模式下累加平移
    if (t.mode === 'pan') {
      const dx = e.clientX - t.lastX
      const dy = e.clientY - t.lastY
      t.panX += dx
      t.panY += dy
    }
  }, [handlePointerMove, determineGestureMode])

  // ============================================================
  // 键盘导航
  // ============================================================
  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, goNext, goPrev])

  // ============================================================
  // 渲染变量
  // ============================================================
  const canSwipe = filteredWorks.length > 1
  const t = touch.current

  // 滑动模式下：prev/next 图片的偏移
  const swipeOffset = t.mode === 'swipe' ? t.deltaX : 0

  // 当前图片的 transform
  const getImageStyle = () => {
    if (t.scale === 1 && swipeOffset === 0) {
      return {}
    }
    if (t.scale === 1) {
      // 滑动切换模式：translateX
      return { transform: `translateX(${swipeOffset}px) scale(1)` }
    }
    // 缩放模式：scale + translate(基于缩放中心)
    return {
      transform: `translate(${t.panX}px, ${t.panY}px) scale(${t.scale})`,
      transformOrigin: '0 0',
    }
  }

  // 将作品分成两列
  const leftColumn: Work[] = []
  const rightColumn: Work[] = []
  displayedWorks.forEach((work, i) => {
    if (i % 2 === 0) leftColumn.push(work)
    else rightColumn.push(work)
  })

  return (
    <div className="min-h-screen bg-white max-w-[430px] mx-auto">
      {/* 顶部标题 */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-lg font-semibold text-gray-900">设计作品集</h1>
        </div>
        {/* 分类标签 */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSlug('all')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeSlug === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              全部
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveSlug(cat.slug)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeSlug === cat.slug ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 瀑布流 */}
      <div className="px-2 pt-3 pb-6">
        {filteredWorks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 opacity-30">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
            <p className="text-sm">暂无作品</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-2">
              {leftColumn.map(work => (
                <WorkCard key={work.id} work={work} onClick={() => openLightbox(work)} />
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {rightColumn.map(work => (
                <WorkCard key={work.id} work={work} onClick={() => openLightbox(work)} />
              ))}
            </div>
          </div>
        )}
        <div id="scroll-sentinel" className="h-4" />
        {loading && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* ========== 灯箱 ========== */}
      {lightbox && (
        <div
          ref={containerRef}
          className="fixed inset-0 z-50 bg-black select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMoveWrapper}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightbox(null)
          }}
        >
          {/* 关闭按钮 */}
          <div className="absolute top-0 left-0 right-0 z-30 flex justify-end p-4" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
            <button
              onClick={() => setLightbox(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm active:scale-95 transition-transform"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* 上一张（滑动时露出） */}
          {canSwipe && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-[600ms]"
              style={{
                opacity: swipeOffset > 0 ? Math.min(swipeOffset / 100, 1) : 0,
              }}
            >
              <img
                src={filteredWorks[(lightboxIndex - 1 + filteredWorks.length) % filteredWorks.length].imageUrl}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* 下一张（滑动时露出） */}
          {canSwipe && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-[600ms]"
              style={{
                opacity: swipeOffset < 0 ? Math.min(-swipeOffset / 100, 1) : 0,
              }}
            >
              <img
                src={filteredWorks[(lightboxIndex + 1) % filteredWorks.length].imageUrl}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* 主图片区域：可滚动（长图）/ 可缩放 */}
          <div
            ref={scrollRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              // 当 scale > 1 时不允许容器滚动，交给 pan 处理
              overflow: t.scale === 1 && swipeOffset === 0 ? 'auto' : 'hidden',
              cursor: t.scale !== 1 ? 'grab' : 'default',
            }}
            onClick={(e) => {
              if (t.scale !== 1) {
                // 缩放状态下点击缩小
                t.scale = 1
                t.panX = 0
                t.panY = 0
                return
              }
              if (swipeOffset === 0) setLightbox(null)
            }}
          >
            <img
              key={lightbox.id}
              src={lightbox.imageUrl}
              alt={lightbox.title || ''}
              style={{
                ...getImageStyle(),
                maxWidth: '100%',
                maxHeight: '100%',
                width: '100%',
                objectFit: 'contain',
                transition: t.mode === 'none' ? 'transform 600ms ease-out' : 'none',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
              draggable={false}
            />
          </div>

          {/* 操作提示 */}
          {canSwipe && swipeOffset === 0 && t.scale === 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/25 text-xs text-center pointer-events-none">
              <div className="mb-1">← 左右滑动 →</div>
              <div>双指捏合缩放</div>
            </div>
          )}

          {/* 底部指示器 */}
          {filteredWorks.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                {filteredWorks.slice(
                  Math.max(0, lightboxIndex - 2),
                  Math.min(filteredWorks.length, lightboxIndex + 3)
                ).map((_, i) => {
                  const idx = Math.max(0, lightboxIndex - 2) + i
                  return (
                    <div
                      key={idx}
                      className="h-1 rounded-full transition-all duration-[600ms] bg-white"
                      style={{
                        width: idx === lightboxIndex ? '16px' : '4px',
                        opacity: idx === lightboxIndex ? 1 : 0.4,
                      }}
                    />
                  )
                })}
              </div>
              <span className="text-white/50 text-xs">{lightboxIndex + 1} / {filteredWorks.length}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WorkCard({ work, onClick }: { work: Work; onClick: () => void }) {
  return (
    <div
      className="break-inside-avoid rounded-xl overflow-hidden bg-gray-50 cursor-pointer active:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <img
        src={work.imageUrl}
        alt={work.title || ''}
        className="w-full h-auto object-contain"
        loading="lazy"
      />
    </div>
  )
}
