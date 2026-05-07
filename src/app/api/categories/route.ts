import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { works: { orderBy: { sortOrder: 'asc' } } },
  })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, sortOrder = 0 } = body
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const category = await prisma.category.create({ data: { name, slug, sortOrder } })
  return NextResponse.json(category, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.category.delete({ where: { id } })
  return NextResponse.json({ success: true })
}