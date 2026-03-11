'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { PlaylistResult } from '@/types'

export default function Home() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<PlaylistResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (track: { id: string; previewUrl: string | null }) => {
    if (!track.previewUrl) return

    // 같은 곡 누르면 정지
    if (playingId === track.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    // 다른 곡 누르면 기존 정지 후 새 곡 재생
    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(track.previewUrl)
    audioRef.current = audio
    audio.volume = 0.7
    audio.play()
    setPlayingId(track.id)

    // 30초 끝나면 자동 정지
    audio.onended = () => setPlayingId(null)
  }

  const getEmoji = (emotion: string) => {
    const map: Record<string, string> = {
      기쁨: '😊', 슬픔: '😢', 분노: '😤',
      불안: '😰', 평온: '😌', 설렘: '🥰', 피곤: '😴',
    }
    return map[emotion] ?? '🎵'
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d0d14;
          min-height: 100vh;
          font-family: 'Noto Serif KR', serif;
        }

        .bg-noise {
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: 0.4;
        }

        .glow-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }

        .orb-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(99,75,168,0.15) 0%, transparent 70%);
          top: -200px; left: -100px;
          animation: drift1 20s ease-in-out infinite;
        }

        .orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(56,117,168,0.12) 0%, transparent 70%);
          bottom: -100px; right: -100px;
          animation: drift2 25s ease-in-out infinite;
        }

        .orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(168,99,130,0.08) 0%, transparent 70%);
          top: 40%; left: 60%;
          animation: drift3 18s ease-in-out infinite;
        }

        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(60px, 40px); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-40px, -60px); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -30px); }
          66% { transform: translate(-30px, 20px); }
        }

        .mw-container {
          position: relative;
          z-index: 1;
          max-width: 640px;
          margin: 0 auto;
          padding: 80px 24px 120px;
        }

        .mw-header { margin-bottom: 64px; animation: fadeUp 0.8s ease both; }

        .mw-logo {
          font-family: 'DM Serif Display', serif;
          font-size: 13px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mw-logo::before {
          content: '';
          display: block;
          width: 24px;
          height: 1px;
          background: rgba(255,255,255,0.2);
        }

        .mw-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(42px, 8vw, 64px);
          color: #f0eee8;
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .mw-title em {
          font-style: italic;
          background: linear-gradient(135deg, #c4a8ff, #8ab4ff, #a8d8ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .mw-subtitle {
          font-size: 15px;
          color: rgba(255,255,255,0.35);
          font-weight: 300;
          letter-spacing: 0.02em;
          line-height: 1.7;
        }

        .mw-input-section {
          animation: fadeUp 0.8s 0.15s ease both;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .mw-input-label {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          margin-bottom: 12px;
          font-family: 'DM Serif Display', serif;
        }

        .mw-textarea-wrap { position: relative; }

        .mw-textarea-wrap::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(196,168,255,0.2), rgba(138,180,255,0.1), rgba(168,216,255,0.1));
          z-index: 0;
        }

        .mw-textarea {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 160px;
          background: rgba(255,255,255,0.03);
          border: none;
          border-radius: 15px;
          padding: 20px 24px;
          color: rgba(255,255,255,0.8);
          font-family: 'Noto Serif KR', serif;
          font-size: 15px;
          font-weight: 300;
          line-height: 1.8;
          resize: none;
          outline: none;
          backdrop-filter: blur(10px);
        }

        .mw-textarea::placeholder { color: rgba(255,255,255,0.2); }

        .mw-char-count {
          text-align: right;
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          margin-top: 8px;
          font-family: 'DM Serif Display', serif;
          letter-spacing: 0.1em;
        }

        .mw-btn {
          margin-top: 24px;
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 14px;
          font-family: 'Noto Serif KR', serif;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, rgba(196,168,255,0.9), rgba(138,180,255,0.8));
          color: #0d0d14;
        }

        .mw-btn:disabled {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.2);
          cursor: not-allowed;
        }

        .mw-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 60px rgba(196,168,255,0.2);
        }

        .mw-wave {
          display: inline-flex;
          gap: 3px;
          align-items: center;
          justify-content: center;
          height: 24px;
        }

        .mw-wave span {
          width: 3px;
          border-radius: 3px;
          background: rgba(13,13,20,0.6);
          animation: mwWave 1s ease-in-out infinite;
        }

        .mw-wave span:nth-child(1) { height: 8px;  animation-delay: 0s; }
        .mw-wave span:nth-child(2) { height: 16px; animation-delay: 0.1s; }
        .mw-wave span:nth-child(3) { height: 24px; animation-delay: 0.2s; }
        .mw-wave span:nth-child(4) { height: 16px; animation-delay: 0.3s; }
        .mw-wave span:nth-child(5) { height: 8px;  animation-delay: 0.4s; }
        .mw-wave span:nth-child(6) { height: 20px; animation-delay: 0.15s; }
        .mw-wave span:nth-child(7) { height: 12px; animation-delay: 0.25s; }

        @keyframes mwWave {
          0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
          50% { transform: scaleY(1); opacity: 1; }
        }

        .mw-error {
          margin-top: 16px;
          padding: 16px 20px;
          border-radius: 12px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: rgba(252,165,165,0.9);
          font-size: 14px;
          line-height: 1.6;
        }

        .mw-result { margin-top: 64px; animation: fadeUp 0.8s ease both; }

        .mw-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 40px;
        }

        .mw-divider::before, .mw-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
        }

        .mw-divider-text {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.2);
          font-family: 'DM Serif Display', serif;
        }

        .mw-mood-card {
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 40px;
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(20px);
          background: rgba(255,255,255,0.02);
          position: relative;
          overflow: hidden;
        }

        .mw-mood-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(196,168,255,0.06), transparent 60%);
          pointer-events: none;
        }

        .mw-mood-top {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .mw-emoji { font-size: 48px; line-height: 1; flex-shrink: 0; }

        .mw-emotion-name {
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          color: #f0eee8;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }

        .mw-emotion-summary {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          font-weight: 300;
          line-height: 1.6;
        }

        .mw-intensity-label {
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.2);
          margin-bottom: 8px;
          font-family: 'DM Serif Display', serif;
        }

        .mw-intensity-track {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .mw-intensity-fill {
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg, #c4a8ff, #8ab4ff);
        }

        .mw-keywords { display: flex; gap: 8px; flex-wrap: wrap; }

        .mw-keyword {
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.03);
          letter-spacing: 0.02em;
        }

        .mw-playlist-title {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          color: #f0eee8;
          letter-spacing: -0.01em;
          margin-bottom: 4px;
        }

        .mw-playlist-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.05em;
          margin-bottom: 20px;
        }

        .mw-track-list { display: flex; flex-direction: column; gap: 4px; }

        .mw-track {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .mw-track.playing {
          background: rgba(196,168,255,0.06);
          border-color: rgba(196,168,255,0.15);
        }

        .mw-track:not(.playing):hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.06);
        }

        .mw-track-num {
          font-family: 'DM Serif Display', serif;
          font-size: 12px;
          color: rgba(255,255,255,0.15);
          width: 20px;
          text-align: center;
          flex-shrink: 0;
        }

        .mw-track.playing .mw-track-num { color: rgba(196,168,255,0.6); }

        .mw-track-img { border-radius: 8px; flex-shrink: 0; opacity: 0.85; }
        .mw-track.playing .mw-track-img { opacity: 1; }

        .mw-track-info { flex: 1; min-width: 0; }

        .mw-track-name {
          font-size: 14px;
          color: rgba(255,255,255,0.75);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 3px;
        }

        .mw-track.playing .mw-track-name { color: rgba(255,255,255,0.95); }

        .mw-track-artist {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mw-track-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .mw-play-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 11px;
          flex-shrink: 0;
        }

        .mw-play-btn:hover {
          background: rgba(196,168,255,0.15);
          border-color: rgba(196,168,255,0.4);
          color: rgba(196,168,255,0.9);
        }

        .mw-play-btn.active {
          background: rgba(196,168,255,0.2);
          border-color: rgba(196,168,255,0.5);
          color: rgba(196,168,255,1);
        }

        .mw-play-btn.no-preview {
          opacity: 0.2;
          cursor: not-allowed;
        }

        .mw-play-btn.no-preview:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.5);
        }

        .mw-itunes-link {
          font-size: 11px;
          color: rgba(255,255,255,0.15);
          text-decoration: none;
          transition: color 0.2s;
          letter-spacing: 0.05em;
        }

        .mw-itunes-link:hover { color: rgba(196,168,255,0.5); }

        .mw-playing-bar {
          display: inline-flex;
          gap: 2px;
          align-items: center;
        }

        .mw-playing-bar span {
          width: 2px;
          border-radius: 2px;
          background: rgba(196,168,255,0.8);
          animation: mwWave 0.8s ease-in-out infinite;
        }

        .mw-playing-bar span:nth-child(1) { height: 6px; animation-delay: 0s; }
        .mw-playing-bar span:nth-child(2) { height: 10px; animation-delay: 0.15s; }
        .mw-playing-bar span:nth-child(3) { height: 7px; animation-delay: 0.3s; }

        .mw-preview-badge {
          font-size: 10px;
          color: rgba(255,255,255,0.15);
          letter-spacing: 0.05em;
          margin-top: 12px;
          text-align: center;
          font-family: 'DM Serif Display', serif;
        }

        .mw-timestamp {
          text-align: center;
          margin-top: 48px;
          font-size: 11px;
          letter-spacing: 0.15em;
          color: rgba(255,255,255,0.1);
          font-family: 'DM Serif Display', serif;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="bg-noise" />
      <div className="glow-orb orb-1" />
      <div className="glow-orb orb-2" />
      <div className="glow-orb orb-3" />

      <div className="mw-container">
        <div className="mw-header">
          <div className="mw-logo">MoodWave</div>
          <h1 className="mw-title">오늘의 감정을<br /><em>음악으로</em></h1>
          <p className="mw-subtitle">지금 이 순간의 감정을 써내려가세요.<br />당신의 새벽을 채울 음악을 찾아드릴게요.</p>
        </div>

        <div className="mw-input-section">
          <div className="mw-input-label">오늘의 일기</div>
          <div className="mw-textarea-wrap">
            <textarea
              className="mw-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"오늘 하루 어땠나요\n감정을 자유롭게 써보세요..."}
              maxLength={500}
            />
          </div>
          <div className="mw-char-count">{text.length} / 500</div>

          <button
            className="mw-btn"
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <span className="mw-wave">
                <span /><span /><span /><span /><span /><span /><span />
              </span>
            ) : '음악 찾기'}
          </button>

          {error && <div className="mw-error">{error}</div>}
        </div>

        {result && (
          <div className="mw-result">
            <div className="mw-divider">
              <span className="mw-divider-text">분석 결과</span>
            </div>

            <div className="mw-mood-card">
              <div className="mw-mood-top">
                <div className="mw-emoji">{getEmoji(result.mood.emotion)}</div>
                <div>
                  <div className="mw-emotion-name">{result.mood.emotion}</div>
                  <div className="mw-emotion-summary">{result.mood.summary}</div>
                </div>
              </div>

              <div className="mw-intensity-label">감정 강도</div>
              <div className="mw-intensity-track">
                <div className="mw-intensity-fill" style={{ width: `${result.mood.intensity * 10}%` }} />
              </div>

              <div className="mw-keywords">
                {result.mood.keywords.map((keyword) => (
                  <span key={keyword} className="mw-keyword">{keyword}</span>
                ))}
              </div>
            </div>

            <div className="mw-playlist-title">{result.playlistName}</div>
            <div className="mw-playlist-sub">{result.tracks.length}곡 · {result.mood.genre.join(', ')}</div>

            <div className="mw-track-list">
              {result.tracks.map((track, index) => (
                <div
                  key={track.id}
                  className={`mw-track ${playingId === track.id ? 'playing' : ''}`}
                >
                  <span className="mw-track-num">
                    {playingId === track.id ? (
                      <span className="mw-playing-bar">
                        <span /><span /><span />
                      </span>
                    ) : (
                      index + 1
                    )}
                  </span>

                  <Image
                    src={track.albumImage || '/placeholder.png'}
                    alt={track.album}
                    width={44}
                    height={44}
                    className="mw-track-img"
                    style={{ borderRadius: '8px' }}
                  />

                  <div className="mw-track-info">
                    <div className="mw-track-name">{track.name}</div>
                    <div className="mw-track-artist">{track.artist}</div>
                  </div>

                  <div className="mw-track-actions">
                    <button
                      className={`mw-play-btn ${playingId === track.id ? 'active' : ''} ${!track.previewUrl ? 'no-preview' : ''}`}
                      onClick={() => handlePlay(track)}
                      title={!track.previewUrl ? '미리듣기 없음' : playingId === track.id ? '정지' : '재생'}
                    >
                      {playingId === track.id ? '■' : '▶'}
                    </button>
                    <a
                      href={track.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mw-itunes-link"
                    >
                      iTunes ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="mw-preview-badge">▶ 버튼으로 30초 미리듣기 가능</div>

            <div className="mw-timestamp">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}