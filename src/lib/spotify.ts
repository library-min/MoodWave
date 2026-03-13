import { MoodAnalysis, Track } from '@/types'

const emotionCountryQuery: Record<string, Record<string, string>> = {
  KR: {
    기쁨: '최신 신나는 kpop',
    슬픔: '최신 이별 발라드',
    분노: '록 발라드',
    불안: '최신 감성 kpop',
    평온: '최신 어쿠스틱',
    설렘: '최신 설레는 kpop',
    피곤: '최신 잔잔한 발라드',
  },
  JP: {
    기쁨: 'jpop 元気 楽しい',
    슬픔: 'jpop バラード 切ない',
    분노: 'jrock 激しい',
    불안: 'jpop 暗い 不安',
    평온: 'jpop 穏やか ゆっくり',
    설렘: 'jpop ときめき 恋愛',
    피곤: 'japanese lo-fi 癒し',
  },
  US: {
    기쁨: 'happy upbeat pop cheerful',
    슬픔: 'sad ballad emotional slow',
    분노: 'intense rock aggressive',
    불안: 'dark atmospheric indie',
    평온: 'calm ambient peaceful',
    설렘: 'romantic love sweet pop',
    피곤: 'lo-fi chill sleepy',
  },
}

export async function getTracksByMood(
  mood: MoodAnalysis,
  country: 'KR' | 'JP' | 'US' = 'KR'
): Promise<Track[]> {
  const searchQuery = emotionCountryQuery[country][mood.emotion]
    ?? emotionCountryQuery[country]['평온']

  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=10&country=${country}`
  )

  if (!response.ok) {
    throw new Error(`iTunes API 오류: ${response.status}`)
  }

  const data = await response.json()
  const items = data.results ?? []

  return items.map((item: {
    trackId: number
    trackName: string
    artistName: string
    collectionName: string
    artworkUrl100: string
    previewUrl: string | null
    trackViewUrl: string
  }) => ({
    id: String(item.trackId),
    name: item.trackName,
    artist: item.artistName,
    album: item.collectionName,
    albumImage: item.artworkUrl100.replace('100x100', '300x300'),
    previewUrl: item.previewUrl,
    spotifyUrl: item.trackViewUrl,
  }))
}