import { NextRequest, NextResponse } from 'next/server'
import { analyzeMood } from '@/lib/anthropic'
import { getTracksByMood } from '@/lib/spotify'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: '텍스트를 입력해주세요' },
        { status: 400 }
      )
    }

    // 1. Claude로 감정 분석
    const mood = await analyzeMood(text)

    // 2. Spotify로 트랙 추천
    const tracks = await getTracksByMood(mood)

    // 3. 플레이리스트 이름 생성
    const playlistName = `${mood.emotion}의 순간 🎵`

    return NextResponse.json({ mood, tracks, playlistName })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: '분석 중 오류가 발생했어요' },
      { status: 500 }
    )
  }
}