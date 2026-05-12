import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { createServerClient } = await import('@/lib/supabase')
    const sharp = (await import('sharp')).default
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    // 处理原图：压缩到 1920px 宽，质量 85%
    const processedBuffer = await sharp(buffer)
      .resize(1920, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()

    // 生成缩略图：800px 宽，质量 80%
    const thumbnailBuffer = await sharp(buffer)
      .resize(800, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()

    const originalFilename = `${baseName}.webp`
    const thumbnailFilename = `${baseName}-thumb.webp`

    const supabase = createServerClient()

    // 上传原图
    const { error: originalError } = await supabase.storage
      .from('works')
      .upload(originalFilename, processedBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (originalError) {
      console.error('Original upload error:', originalError)
      return NextResponse.json({ error: 'Upload failed: ' + originalError.message }, { status: 500 })
    }

    // 上传缩略图
    const { error: thumbError } = await supabase.storage
      .from('works')
      .upload(thumbnailFilename, thumbnailBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (thumbError) {
      console.error('Thumbnail upload error:', thumbError)
      // 缩略图失败不影响原图，继续返回
    }

    const { data: originalUrlData } = supabase.storage.from('works').getPublicUrl(originalFilename)
    const { data: thumbUrlData } = supabase.storage.from('works').getPublicUrl(thumbnailFilename)

    return NextResponse.json({
      url: originalUrlData.publicUrl,
      thumbnailUrl: thumbUrlData.publicUrl,
    })
  } catch (e) {
    console.error('Upload error:', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
