import { MoodAnalysis, Track } from '@/types'

export async function getTracksByMood(mood: MoodAnalysis): Promise<Track[]> {
  const query = `${mood.genre[0]} ${mood.emotion}`

  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=10&country=KR`
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