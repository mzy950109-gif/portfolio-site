import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { createServerClient } = await import('@/lib/supabase')
    
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

    // Determine MIME type
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
    }
    const contentType = mimeMap[ext] || 'image/png'
    const originalFilename = `${baseName}.${ext}`

    const supabase = createServerClient()

    // Upload original directly (no image processing - skip jimp/sharp)
    const { error: uploadError } = await supabase.storage
      .from('works')
      .upload(originalFilename, buffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Supabase upload failed: ' + uploadError.message, step: 'supabase-upload' }, { status: 500 })
    }

    const { data } = supabase.storage.from('works').getPublicUrl(originalFilename)

    return NextResponse.json({
      url: data.publicUrl,
      thumbnailUrl: data.publicUrl, // use same URL as thumbnail (no processing)
    })
  } catch (e: any) {
    const errMsg = e?.message || String(e)
    console.error('Upload error:', errMsg)
    return NextResponse.json({ error: 'Upload failed: ' + errMsg, step: 'unknown' }, { status: 500 })
  }
}
