import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const works = await prisma.work.findMany({
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { category: true },
    })
    return NextResponse.json(works)
  } catch (error: any) {
    console.error('GET /api/works error:', error?.message || error)
    return NextResponse.json({ error: error?.message || String(error), stack: error?.stack?.slice(0, 500) || '' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { items, batch } = body

  // 批量创建
  if (batch && Array.isArray(items)) {
    const results = await prisma.work.createMany({
      data: items.map((item: { title?: string; description?: string; imageUrl: string; thumbnailUrl?: string; categoryId: string; tags?: string; featured?: boolean; sortOrder?: number }) => ({
        title: item.title || '',
        description: item.description || '',
        imageUrl: item.imageUrl,
        thumbnailUrl: item.thumbnailUrl || item.imageUrl,
        categoryId: item.categoryId,
        tags: item.tags || '',
        featured: !!item.featured,
        sortOrder: item.sortOrder || 0,
      })),
    })
    return NextResponse.json({ count: results.count })
  }

  // 单个创建
  const { title, description, imageUrl, thumbnailUrl, categoryId, tags, featured, sortOrder = 0 } = body
  if (!imageUrl || !categoryId) {
    return NextResponse.json({ error: 'imageUrl and categoryId required' }, { status: 400 })
  }
  const work = await prisma.work.create({
    data: {
      title: title || '',
      description: description || '',
      imageUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
      categoryId,
      tags: tags || '',
      featured: !!featured,
      sortOrder,
    },
  })
  return NextResponse.json(work, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const work = await prisma.work.update({ where: { id }, data })
  return NextResponse.json(work)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ids = searchParams.get('ids')
  const id = searchParams.get('id')

  // 批量删除: ids=id1,id2,id3
  if (ids) {
    const idList = ids.split(',').filter(Boolean)
    await prisma.work.deleteMany({ where: { id: { in: idList } } })
    return NextResponse.json({ success: true, deleted: idList.length })
  }

  // 单个删除
  if (id) {
    await prisma.work.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'id or ids required' }, { status: 400 })
}