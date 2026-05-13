import { NextResponse } from 'next/server'

export async function GET() {
  const isSet = !!process.env.ADMIN_PASSWORD
  return NextResponse.json({ 
    adminPasswordSet: isSet,
    nodeEnv: process.env.NODE_ENV
  })
}