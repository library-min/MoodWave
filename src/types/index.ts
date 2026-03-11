export interface MoodAnalysis {
  emotion: string
  intensity: number
  keywords: string[]
  genre: string[]
  tempo: 'slow' | 'medium' | 'fast'
  energy: 'low' | 'medium' | 'high'
  summary: string
}

export interface Track {
  id: string
  name: string
  artist: string
  album: string
  albumImage: string
  previewUrl: string | null
  spotifyUrl: string
}

export interface PlaylistResult {
  mood: MoodAnalysis
  tracks: Track[]
  playlistName: string
}

export interface DiaryEntry {
  id: string
  text: string
  date: string
  mood: MoodAnalysis
  tracks: Track[]
}

// 추가
export interface SpotifyTrackItem {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string }[]
  }
  preview_url: string | null
  external_urls: { spotify: string }
}