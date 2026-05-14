import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Railway free tier: max 60s, set 30s safety limit

export async function POST(req: NextRequest) {
  console.log('[upload] POST received')
  
  try {
    // Check content length early
    const contentLength = req.headers.get('content-length')
    console.log('[upload] content-length:', contentLength)
    
    if (contentLength && parseInt(contentLength) > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 20MB)', step: 'size-check' }, { status: 413 })
    }

    const { createServerClient } = await import('@/lib/supabase')
    
    let formData: FormData
    try {
      formData = await req.formData()
      console.log('[upload] formData parsed')
    } catch (e: any) {
      return NextResponse.json({ error: 'Failed to parse form data: ' + e?.message, step: 'form-parse' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file', step: 'no-file' }, { status: 400 })

    console.log('[upload] file:', file.name, 'size:', file.size)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type', step: 'ext-check' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('[upload] buffer size:', buffer.length)

    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
    }
    const contentType = mimeMap[ext] || 'image/png'
    const originalFilename = `${baseName}.${ext}`

    const supabase = createServerClient()
    console.log('[upload] uploading to Supabase:', originalFilename)

    const { error: uploadError } = await supabase.storage
      .from('works')
      .upload(originalFilename, buffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[upload] Supabase error:', uploadError)
      return NextResponse.json({ error: 'Supabase upload failed: ' + uploadError.message, step: 'supabase-upload' }, { status: 500 })
    }

    const { data } = supabase.storage.from('works').getPublicUrl(originalFilename)
    console.log('[upload] success:', data.publicUrl)

    return NextResponse.json({
      url: data.publicUrl,
      thumbnailUrl: data.publicUrl,
    })
  } catch (e: any) {
    const errMsg = e?.message || String(e)
    const errStack = e?.stack?.slice(0, 500) || ''
    console.error('[upload] CATCH error:', errMsg, errStack)
    return NextResponse.json({ error: 'Upload failed: ' + errMsg, step: 'unknown', stack: errStack }, { status: 500 })
  }
}
