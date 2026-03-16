import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Track } from '@/types'

interface SharedPlaylist {
  id: string
  emotion: string
  summary: string
  keywords: string[]
  playlist_name: string
  tracks: Track[]
  created_at: string
}

interface Props {
  params: Promise<{ id: string }>
}

async function getSharedData(id: string): Promise<SharedPlaylist | null> {
  // ✅ 함수 안에서 클라이언트 생성 (빌드 타임 환경변수 오류 방지)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('shared_playlists')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as SharedPlaylist
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await getSharedData(id)

  if (!data) return { title: 'MoodWave' }

  return {
    title: `MoodWave - ${data.emotion}의 플레이리스트`,
    description: data.summary,
    openGraph: {
      title: `MoodWave - ${data.emotion}의 플레이리스트`,
      description: data.summary,
    },
  }
}

export default async function SharePage({ params }: Props) {
  const { id } = await params
  const result = await getSharedData(id)

  if (!result) {
    return (
      <div className="mw-share-container error">
        <style>{`
          .mw-share-container { min-height: 100vh; background: #0d0d14; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; }
          .error-msg { font-size: 18px; margin-bottom: 20px; opacity: 0.6; }
          .home-link { color: #c4a8ff; text-decoration: none; border: 1px solid #c4a8ff; padding: 10px 20px; border-radius: 100px; }
        `}</style>
        <p className="error-msg">유효하지 않거나 만료된 링크예요</p>
        <Link href="/" className="home-link">홈으로 가기</Link>
      </div>
    )
  }

  return (
    <main className="mw-share-view">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@200;400;700&family=DM+Serif+Display&display=swap');
        .mw-share-view { min-height: 100vh; background: #0d0d14; color: #f0eee8; font-family: 'Noto Serif KR', serif; padding: 40px 20px 120px; }
        .mw-inner { max-width: 800px; margin: 0 auto; }
        .mw-banner { background: rgba(196, 168, 255, 0.1); border: 1px solid rgba(196, 168, 255, 0.2); padding: 14px; border-radius: 16px; text-align: center; font-size: 14px; margin-bottom: 40px; color: #c4a8ff; }
        .mw-emotion-card { background: rgba(255, 255, 255, 0.04); backdrop-filter: blur(30px); border-radius: 32px; padding: min(48px, 8vw); border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 56px; }
        .mw-emotion-name { font-size: 32px; font-weight: 700; margin-right: 16px; }
        .mw-emotion-tag { font-size: 15px; color: #c4a8ff; }
        .mw-emotion-desc { font-size: 18px; line-height: 1.8; color: rgba(240, 238, 232, 0.85); margin-top: 24px; font-weight: 300; }
        .mw-track { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 20px; background: rgba(255, 255, 255, 0.03); margin-bottom: 12px; text-decoration: none; color: inherit; transition: all 0.3s; border: 1px solid transparent; }
        .mw-track:hover { background: rgba(255, 255, 255, 0.06); transform: translateX(4px); border-color: rgba(255, 255, 255, 0.05); }
        .mw-album-art { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; }
        .mw-cta { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); width: calc(100% - 40px); max-width: 400px; z-index: 100; }
        .mw-cta-btn { display: block; width: 100%; padding: 20px; border-radius: 100px; border: none; background: linear-gradient(135deg, #c4a8ff, #8ab4ff); color: #0d0d14; font-size: 16px; font-weight: 700; text-align: center; text-decoration: none; box-shadow: 0 10px 40px rgba(196, 168, 255, 0.4); transition: transform 0.2s; }
        .mw-cta-btn:hover { transform: translateY(-2px); }
        @media (max-width: 600px) { .mw-emotion-name { font-size: 28px; } .mw-emotion-desc { font-size: 16px; } }
      `}</style>

      <div className="mw-inner">
        <div className="mw-banner">🎵 MoodWave가 플레이리스트를 공유했어요</div>

        <div className="mw-emotion-card">
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span className="mw-emotion-name">{result.emotion}</span>
            <span className="mw-emotion-tag">#{result.keywords.join(' #')}</span>
          </div>
          <p className="mw-emotion-desc">{result.summary}</p>
        </div>

        <h3 style={{ fontSize: '13px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '24px' }}>
          Shared Playlist
        </h3>

        <div>
          {result.tracks.map((track: Track) => (
            <a key={track.id} href={track.spotifyUrl} target="_blank" rel="noopener noreferrer" className="mw-track">
              <img src={track.albumImage || ''} alt="" className="mw-album-art" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {track.name}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {track.artist} · {track.album}
                </div>
              </div>
              <div style={{ opacity: 0.3, fontSize: 12 }}>iTunes ↗</div>
            </a>
          ))}
        </div>

        <div className="mw-cta">
          <Link href="/" className="mw-cta-btn">나도 감정 분석하기 →</Link>
        </div>
      </div>
    </main>
  )
}