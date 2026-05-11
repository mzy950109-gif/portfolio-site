import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    const correct = process.env.ADMIN_PASSWORD
    if (!correct) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    if (password !== correct) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
