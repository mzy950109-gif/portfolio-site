import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

function generateSlug(name: string): string {
  // Try to create a slug from ASCII chars
  const asciiSlug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  // If slug is empty (e.g. Chinese name), generate a random one
  return asciiSlug || `cat-${createId().slice(0, 8)}`
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { works: { orderBy: { sortOrder: 'asc' } } },
    })
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('GET /api/categories error:', error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, sortOrder = 0 } = body
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const slug = generateSlug(name)
    console.log('Creating category:', { name, slug, sortOrder })
    const category = await prisma.category.create({ data: { name, slug, sortOrder } })
    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/categories error:', error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/categories error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}