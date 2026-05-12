import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

function generateSlug(): string {
  // Always use full cuid2 to guarantee uniqueness
  return `cat-${createId()}`
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

    // Generate unique slug with retry on collision
    let slug = generateSlug()
    for (let i = 0; i < 3; i++) {
      try {
        const category = await prisma.category.create({ data: { name, slug, sortOrder } })
        return NextResponse.json(category, { status: 201 })
      } catch (e: any) {
        if (e.code === 'P2002' && i < 2) {
          // Unique constraint conflict, retry with new slug
          slug = generateSlug()
          continue
        }
        throw e
      }
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  } catch (error: any) {
    console.error('POST /api/categories error:', error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name } = body
    if (!id || !name) return NextResponse.json({ error: 'ID and name required' }, { status: 400 })
    // On rename, keep existing slug to avoid conflicts
    const category = await prisma.category.update({
      where: { id },
      data: { name }
    })
    return NextResponse.json(category)
  } catch (error: any) {
    console.error('PATCH /api/categories error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
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
