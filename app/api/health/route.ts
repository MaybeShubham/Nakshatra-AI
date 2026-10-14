import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const startTime = Date.now()

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)

  return NextResponse.json(
    {
      status: 'healthy',
      app: 'Nakshatra AI',
      timestamp: new Date().toISOString(),
      uptime_seconds: uptimeSeconds,
      environment: process.env.NODE_ENV || 'production',
      services: {
        gemini_api: !!process.env.GEMINI_API_KEY ? 'connected' : 'unconfigured',
        supabase_db: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'connected' : 'unconfigured',
      },
    },
    { status: 200 }
  )
}
