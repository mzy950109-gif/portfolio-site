import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } })
    return NextResponse.json(settings)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { siteTitle, siteName, tagline, avatarUrl, bio } = body
    const data: Record<string, string> = {}
    if (siteTitle !== undefined) data.siteTitle = siteTitle.trim()
    if (siteName !== undefined) data.siteName = siteName.trim()
    if (tagline !== undefined) data.tagline = tagline?.trim() || null
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl?.trim() || null
    if (bio !== undefined) data.bio = bio?.trim() || null

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: data,
    })
    return NextResponse.json(settings)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
