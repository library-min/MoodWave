import { NextRequest, NextResponse } from 'next/server'
import { getTracksByMood } from '@/lib/spotify'

export async function POST(request: NextRequest) {
  try {
    const { mood, country } = await request.json()

    if (!mood) {
      return NextResponse.json(
        { error: '감정 데이터가 필요합니다' },
        { status: 400 }
      )
    }

    const tracks = await getTracksByMood(mood, country)

    return NextResponse.json({ tracks })
  } catch (error) {
    console.error('Playlist update error:', error)
    return NextResponse.json(
      { error: '음악 목록을 가져오는 데 실패했습니다' },
      { status: 500 }
    )
  }
}
