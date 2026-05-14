import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper: get Jimp instance safely (handles ESM/CJS interop issues)
async function getJimp() {
  // Try ESM import first, fallback to CJS require
  try {
    const mod = await import('jimp')
    const Jimp = mod.default || mod
    if (typeof Jimp.read === 'function') return Jimp
    // Some bundlers wrap differently
    // @ts-ignore - ESM interop
    if (typeof (Jimp as any).default?.read === 'function') return (Jimp as any).default
  } catch {}
  // CJS fallback
  try {
    // @ts-ignore
    const Jimp = require('jimp')
    if (typeof Jimp.read === 'function') return Jimp
  } catch {}
  throw new Error('Jimp module could not be loaded')
}

export async function POST(req: NextRequest) {
  try {
    const { createServerClient } = await import('@/lib/supabase')
    const Jimp = await getJimp()
    
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

    // Process original: resize to 1920px, quality 85
    let processedBuffer: Buffer
    try {
      const img = await Jimp.read(buffer)
      img.resize(1920, Jimp.AUTO)
      img.quality(85)
      processedBuffer = await img.getBufferAsync(Jimp.MIME_PNG)
    } catch (e: any) {
      return NextResponse.json({ error: 'Image processing failed: ' + (e?.message || e), step: 'jimp-original' }, { status: 500 })
    }

    // Generate thumbnail: 800px, quality 80
    let thumbnailBuffer: Buffer
    try {
      const thumbImg = await Jimp.read(buffer)
      thumbImg.resize(800, Jimp.AUTO)
      thumbImg.quality(80)
      thumbnailBuffer = await thumbImg.getBufferAsync(Jimp.MIME_PNG)
    } catch (e: any) {
      return NextResponse.json({ error: 'Thumbnail processing failed: ' + (e?.message || e), step: 'jimp-thumbnail' }, { status: 500 })
    }

    const originalFilename = `${baseName}.png`
    const thumbnailFilename = `${baseName}-thumb.png`

    const supabase = createServerClient()

    // Upload original
    const { error: originalError } = await supabase.storage
      .from('works')
      .upload(originalFilename, processedBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (originalError) {
      console.error('Original upload error:', originalError)
      return NextResponse.json({ error: 'Supabase upload failed: ' + originalError.message, step: 'supabase-upload' }, { status: 500 })
    }

    // Upload thumbnail
    const { error: thumbError } = await supabase.storage
      .from('works')
      .upload(thumbnailFilename, thumbnailBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (thumbError) {
      console.error('Thumbnail upload error:', thumbError)
      // Thumbnail failure does not block the original
    }

    const { data: originalUrlData } = supabase.storage.from('works').getPublicUrl(originalFilename)
    const { data: thumbUrlData } = supabase.storage.from('works').getPublicUrl(thumbnailFilename)

    return NextResponse.json({
      url: originalUrlData.publicUrl,
      thumbnailUrl: thumbUrlData.publicUrl,
    })
  } catch (e: any) {
    const errMsg = e?.message || String(e)
    const errStack = e?.stack?.slice(0, 1000) || ''
    console.error('Upload error:', errMsg, errStack)
    return NextResponse.json({ error: 'Upload failed: ' + errMsg, step: 'unknown', stack: errStack }, { status: 500 })
  }
}
