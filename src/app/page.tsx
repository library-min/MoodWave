'use client'

import { useState, useRef, useEffect } from 'react'
import { PlaylistResult } from '@/types'
import { createClient } from '@/lib/supabase'
import { saveEntry } from '@/lib/storage'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

type View = 'home' | 'loading' | 'result'
type Country = 'KR' | 'JP' | 'US'

const emotionColors: Record<string, string[]> = {
  기쁨: ['#f59e0b', '#f97316', '#fbbf24'],
  슬픔: ['#3b82f6', '#6366f1', '#0ea5e9'],
  분노: ['#ef4444', '#f43f5e', '#f97316'],
  불안: ['#8b5cf6', '#a855f7', '#d946ef'],
  평온: ['#14b8a6', '#06b6d4', '#10b981'],
  설렘: ['#ec4899', '#f43f5e', '#a855f7'],
  피곤: ['#64748b', '#6b7280', '#71717a'],
  기본: ['#6344a8', '#3875a8', '#a86382'],
}

export default function MoodWaveApp() {
  const [view, setView] = useState<View>('home')
  const [text, setText] = useState('')
  const [result, setResult] = useState<PlaylistResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  const [selectedCountry, setSelectedCountry] = useState<Country>('KR')
  const [loadingTracks, setLoadingTracks] = useState(false)
  
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30)
  const [volume, setVolume] = useState(0.7)
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null)
  const [isPaused, setIsPaused] = useState(true)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    
    // 컴포넌트 언마운트 시 오디오 정지
    return () => {
      subscription.unsubscribe()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [supabase.auth])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setView('loading')
    setError(null)
    setSelectedCountry('KR')
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await response.json()
      
      if (!response.ok) {
        const errorData = data as { error?: string }
        throw new Error(errorData.error || '분석 중 오류가 발생했습니다.')
      }
      
      const resultData = data as PlaylistResult
      setResult(resultData)
      setView('result')

      if (user) {
        await saveEntry({
          date: new Date().toISOString().split('T')[0],
          emotion: resultData.mood.emotion,
          summary: resultData.mood.summary,
          keywords: resultData.mood.keywords,
          playlist_name: resultData.playlistName,
          tracks: resultData.tracks,
          country: 'KR'
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.')
      setView('home')
    }
  }

  const handleCountryChange = async (country: Country) => {
    if (!result || selectedCountry === country || loadingTracks) return
    setSelectedCountry(country)
    setLoadingTracks(true)
    try {
      const response = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: result.mood, country }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error((data as { error: string }).error)
      setResult({ ...result, tracks: data.tracks })
      if (audioRef.current) audioRef.current.pause()
      setPlayingId(null)
      setCurrentTrackIndex(null)
      setIsPaused(true)
    } catch (err) {
      setError('음악 목록을 업데이트하지 못했습니다.')
    } finally {
      setLoadingTracks(false)
    }
  }

  const handleShare = async () => {
    if (!result || sharing) return
    setSharing(true)
    try {
      const { data, error: shareError } = await supabase
        .from('shared_playlists')
        .insert({
          emotion: result.mood.emotion,
          summary: result.mood.summary,
          keywords: result.mood.keywords,
          playlist_name: result.playlistName,
          tracks: result.tracks,
        })
        .select('id')
        .single()

      if (shareError) throw shareError

      const url = `${window.location.origin}/share/${data.id}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Sharing failed', e)
      alert('공유 링크 생성에 실패했습니다.')
    } finally {
      setSharing(false)
    }
  }

  const handlePlay = (index: number) => {
    if (!result) return
    const track = result.tracks[index]
    if (!track.previewUrl) return
    if (playingId === track.id) {
      if (audioRef.current?.paused) { audioRef.current.play(); setIsPaused(false); }
      else { audioRef.current?.pause(); setIsPaused(true); }
      return
    }
    if (audioRef.current) audioRef.current.pause()
    const audio = new Audio(track.previewUrl)
    audioRef.current = audio
    audio.volume = volume
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
    audio.onloadedmetadata = () => setDuration(audio.duration)
    audio.onended = () => handleNext()
    audio.onplay = () => setIsPaused(false)
    audio.onpause = () => setIsPaused(true)
    audio.play()
    setPlayingId(track.id)
    setCurrentTrackIndex(index)
    setIsPaused(false)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (audioRef.current) {
      audioRef.current.volume = val
    }
  }

  const handleNext = () => {
    if (!result || currentTrackIndex === null) return
    handlePlay((currentTrackIndex + 1) % result.tracks.length)
  }

  const handlePrev = () => {
    if (!result || currentTrackIndex === null) return
    handlePlay((currentTrackIndex - 1 + result.tracks.length) % result.tracks.length)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    audioRef.current.currentTime = (x / rect.width) * duration
  }

  const reset = () => {
    if (audioRef.current) audioRef.current.pause()
    setPlayingId(null); setResult(null); setText(''); setCurrentTrackIndex(null); setIsPaused(true); setView('home'); setSelectedCountry('KR');
  }

  const currentColors = result?.mood.emotion ? (emotionColors[result.mood.emotion] || emotionColors.기본) : emotionColors.기본;
  const currentTrack = currentTrackIndex !== null && result ? result.tracks[currentTrackIndex] : null

  return (
    <div className="mw-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@200;400;700&family=DM+Serif+Display&display=swap');
        :root { --bg: #0d0d14; --accent-start: #c4a8ff; --accent-end: #8ab4ff; --text-main: #f0eee8; --text-sub: rgba(240, 238, 232, 0.35); --glass: rgba(255, 255, 255, 0.04); --glass-border: rgba(255, 255, 255, 0.08); }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: var(--bg); color: var(--text-main); font-family: 'Noto Serif KR', serif; overflow-x: hidden; width: 100%; }
        .mw-app { position: relative; min-height: 100vh; width: 100%; display: flex; flex-direction: column; align-items: center; padding-bottom: ${currentTrack ? '80px' : '0'}; }
        .mw-background { position: fixed; inset: 0; z-index: 0; background: radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0d0d14 100%); overflow: hidden; }
        .mw-glow-layer { position: absolute; inset: -10%; filter: blur(150px); opacity: 0.6; }
        .mw-orb { position: absolute; border-radius: 50%; mix-blend-mode: screen; will-change: transform; transition: background 2s ease; }
        .orb-1 { width: 60vw; height: 60vw; top: -15%; left: -10%; animation: drift 25s infinite alternate ease-in-out; }
        .orb-2 { width: 55vw; height: 55vw; bottom: -10%; right: -5%; animation: drift 30s infinite alternate-reverse ease-in-out; }
        .orb-3 { width: 45vw; height: 45vw; top: 30%; left: 45%; animation: drift 22s infinite alternate ease-in-out -5s; }
        @keyframes drift { from { transform: translate(0, 0) scale(1); } to { transform: translate(40px, 30px) scale(1.1); } }
        .mw-auth-bar { position: absolute; top: 24px; right: 24px; z-index: 100; display: flex; align-items: center; gap: 12px; }
        .mw-login-btn { background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); color: white; padding: 10px 18px; border-radius: 100px; cursor: pointer; font-size: 13px; backdrop-filter: blur(10px); }
        .mw-user-avatar { width: 36px; height: 32px; border-radius: 50%; background: var(--accent-start); color: #0d0d14; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
        .mw-container { position: relative; z-index: 10; width: 100%; max-width: 800px; padding: 100px 24px; display: flex; flex-direction: column; flex: 1; }
        .mw-brand { font-family: 'DM Serif Display', serif; font-size: 13px; letter-spacing: 0.4em; color: var(--text-sub); margin-bottom: 60px; display: flex; align-items: center; gap: 16px; text-transform: uppercase; }
        .mw-brand::before { content: ''; display: block; width: 30px; height: 1px; background: rgba(255,255,255,0.2); }
        .mw-main-title { font-family: 'DM Serif Display', serif; font-size: clamp(34px, 10vw, 64px); line-height: 1.15; margin-bottom: 24px; word-break: keep-all; }
        .mw-sub-text { font-size: 17px; color: var(--text-sub); font-weight: 300; margin-bottom: 80px; line-height: 1.7; max-width: 500px; }
        .mw-input-wrap { width: 100%; margin-bottom: 32px; }
        .mw-input { width: 100%; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.15); padding: 20px 0; font-size: 22px; color: var(--text-main); outline: none; transition: border-color 0.4s ease; border-radius: 0; }
        .mw-input:focus { border-bottom-color: var(--accent-start); }
        .mw-btn-analyze { width: 100%; padding: 22px; border-radius: 100px; border: none; background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); color: #0d0d14; font-size: 17px; font-weight: 700; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .mw-btn-analyze:disabled { opacity: 0.5; }
        .mw-loading-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .mw-loading-card { width: min(320px, 80vw); height: min(320px, 80vw); background: var(--glass); backdrop-filter: blur(30px); border-radius: 50px; border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; margin-bottom: 48px; }
        .mw-bar { width: 5px; background: var(--accent-start); border-radius: 10px; animation: wave 1.2s ease-in-out infinite; }
        @keyframes wave { 0%, 100% { transform: scaleY(0.25); opacity: 0.4; } 50% { transform: scaleY(1); opacity: 1; } }
        .mw-emotion-card { background: var(--glass); backdrop-filter: blur(30px); border-radius: 32px; padding: min(48px, 8vw); border: 1px solid var(--glass-border); margin-bottom: 64px; }
        .mw-country-tabs { display: flex; gap: 8px; margin-bottom: 32px; overflow-x: auto; padding-bottom: 4px; -ms-overflow-style: none; scrollbar-width: none; }
        .mw-country-tab { padding: 10px 20px; border-radius: 100px; border: 1px solid var(--glass-border); background: transparent; color: var(--text-sub); font-size: 13px; cursor: pointer; white-space: nowrap; }
        .mw-country-tab.active { background: var(--accent-start); color: #0d0d14; border-color: var(--accent-start); font-weight: 600; }
        .mw-track { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 20px; transition: all 0.3s; cursor: pointer; position: relative; overflow: hidden; background: rgba(255,255,255,0.02); margin-bottom: 8px; }
        .mw-album-art { width: 56px; height: 56px; border-radius: 12px; flex-shrink: 0; }
        .mw-track-progress { position: absolute; bottom: 0; left: 0; height: 2px; background: var(--accent-start); }
        .mw-player { position: fixed; bottom: 0; left: 0; right: 0; height: 80px; background: rgba(13, 13, 20, 0.85); backdrop-filter: blur(30px); border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 20px; z-index: 1000; gap: 12px; }
        .mw-player-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .mw-player-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-player-artist { font-size: 12px; color: var(--text-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-player-seek { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.1); cursor: pointer; }
        .mw-player-seek-bar { height: 100%; background: var(--accent-start); }
        .mw-toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px); color: white; padding: 12px 24px; border-radius: 100px; font-size: 14px; border: 1px solid rgba(255, 255, 255, 0.1); z-index: 2000; }
        @media (max-width: 600px) {
          .mw-auth-bar { top: 16px; right: 16px; }
          .mw-container { padding: 80px 20px; }
          .mw-main-title { font-size: 34px; }
          .mw-player-volume, .mw-player-time { display: none; }
          .mw-share-btn span { display: none; }
          .mw-share-btn { padding: 10px; }
        }
      `}</style>
      <div className="mw-background"><div className="mw-glow-layer"><div className="mw-orb orb-1" style={{ background: `radial-gradient(circle, ${currentColors[0]}26 0%, transparent 70%)` }} /><div className="mw-orb orb-2" style={{ background: `radial-gradient(circle, ${currentColors[1]}26 0%, transparent 70%)` }} /><div className="mw-orb orb-3" style={{ background: `radial-gradient(circle, ${currentColors[2]}26 0%, transparent 70%)` }} /></div></div>
      <div className="mw-auth-bar">{user ? (<><div className="mw-user-avatar">{user.email?.charAt(0).toUpperCase()}</div><button className="mw-login-btn" onClick={handleLogout}>로그아웃</button></>) : (<button className="mw-login-btn" onClick={handleGoogleLogin}>구글로 시작</button>)}</div>
      <div className="mw-container">
        {view === 'home' && (
          <div className="fade-up">
            <div className="mw-brand">— MoodWave</div>
            <h1 className="mw-main-title">당신의 감정을<br />음악으로</h1>
            <p className="mw-sub-text">지금 느끼는 감정을 한 문장으로 들려주세요.<br />완벽한 음악을 찾아드릴게요.</p>
            <div className="mw-input-wrap"><input className="mw-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 고요한 새벽, 혼자만의 시간" onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()} autoFocus /></div>
            <button className="mw-btn-analyze" onClick={handleAnalyze} disabled={!text.trim()}>감정 분석하기</button>
            {error && <p style={{marginTop: '24px', color: '#ff8ab4', fontSize: '15px', textAlign: 'center'}}>{error}</p>}
            {user && (<Link href="/history" style={{display:'block', textAlign:'center', marginTop:40, color:'var(--text-sub)', textDecoration:'none', fontSize:14}}>감정 기록 보기 →</Link>)}
          </div>
        )}
        {view === 'loading' && (
          <div className="mw-loading-view fade-up">
            <h2 style={{fontFamily:'DM Serif Display', fontSize:'26px', marginBottom:'60px'}}>감정을 분석하고 있어요</h2>
            <div className="mw-loading-card"><div style={{display:'flex', gap:'10px', height:'100px', alignItems:'center'}}>{[...Array(9)].map((_, i) => (<div key={i} className="mw-bar" style={{ height: `${[40, 70, 50, 90, 60, 80, 45, 65, 40][i]}px`, animationDelay: `${i * 0.1}s` }} />))}</div></div>
            <p style={{fontSize:'14px', color:'var(--text-sub)', letterSpacing:'0.1em'}}>잠시만 기다려주세요...</p>
          </div>
        )}
        {view === 'result' && result && (
          <div className="fade-up">
            <button onClick={reset} style={{background:'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', color:'white', padding:'10px 20px', borderRadius:'100px', cursor:'pointer', marginBottom:'40px'}}>←</button>
            <h2 style={{fontFamily:'DM Serif Display', fontSize:'40px', marginBottom:'32px'}}>당신의 감정</h2>
            <div className="mw-emotion-card"><div style={{display:'flex', alignItems:'baseline', gap:'16px', marginBottom:'20px'}}><span style={{fontSize:'32px', fontWeight:'700'}}>{result.mood.emotion}</span><span style={{fontSize:'15px', color:'var(--accent-start)'}}>#{result.mood.keywords.join(' #')}</span></div><p style={{fontSize:'17px', lineHeight:'1.8', color:'rgba(240, 238, 232, 0.8)', fontWeight:'300'}}>{result.mood.summary}</p></div>
            <div className="mw-country-tabs">
              {['KR', 'JP', 'US'].map((c) => (<button key={c} className={`mw-country-tab ${selectedCountry === c ? 'active' : ''}`} onClick={() => handleCountryChange(c as Country)}>{c === 'KR' ? '한국' : c === 'JP' ? '일본' : '글로벌'}</button>))}
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'24px'}}><h3 style={{fontSize:'13px', letterSpacing:'0.2em', color:'var(--text-sub)', textTransform:'uppercase'}}>Recommended Playlist</h3><button className={`mw-share-btn ${copied ? 'copied' : ''}`} onClick={handleShare} disabled={sharing} style={{background:'transparent', border:`1px solid ${copied ? '#10b981' : 'var(--accent-start)'}`, color: copied ? '#10b981' : 'var(--accent-start)', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'12px'}}>{sharing ? '생성 중...' : copied ? '복사됨 ✓' : '🔗 공유하기'}</button></div>
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {loadingTracks ? ([...Array(4)].map((_, i) => <div key={i} style={{height:80, background:'rgba(255,255,255,0.03)', borderRadius:20}} />)) : (result.tracks.map((track, idx) => (<div key={track.id} className={`mw-track ${playingId === track.id ? 'playing' : ''}`} onClick={() => handlePlay(idx)}><img src={track.albumImage || ''} className="mw-album-art" alt="" /><div style={{flex:1, minWidth:0}}><div className="mw-player-title" style={{fontSize:15}}>{track.name}</div><div className="mw-player-artist" style={{fontSize:13}}>{track.artist} · {track.album}</div></div><div style={{fontSize:14}}>{playingId === track.id && !isPaused ? '■' : '▶'}</div>{playingId === track.id && (<div className="mw-track-progress" style={{ width: `${(currentTime / duration) * 100}%` }} />)}</div>)))}
            </div>
            {user && (<Link href="/history" style={{display:'block', textAlign:'center', marginTop:60, color:'var(--text-sub)', textDecoration:'none', fontSize:14}}>감정 기록 보기 →</Link>)}
          </div>
        )}
      </div>
      {copied && <div className="mw-toast">링크가 복사됐어요 ✓</div>}
      {currentTrack && (
        <div className="mw-player fade-up">
          <div className="mw-player-seek" onClick={handleSeek}>
            <div className="mw-player-seek-bar" style={{ width: `${(currentTime / duration) * 100}%` }} />
          </div>
          <div className="mw-player-info">
            <img src={currentTrack.albumImage || ''} style={{width:48, height:48, borderRadius:8}} alt="" />
            <div style={{minWidth:0}}>
              <div className="mw-player-title">{currentTrack.name}</div>
              <div className="mw-player-artist">{currentTrack.artist}</div>
            </div>
          </div>
          
          <div className="mw-player-volume" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
            <span style={{ fontSize: '10px', opacity: 0.4, textTransform: 'uppercase' }}>Vol</span>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={volume} onChange={handleVolumeChange}
              style={{ width: '60px', accentColor: '#c4a8ff', cursor: 'pointer' }}
            />
          </div>

          <div style={{display:'flex', gap:'20px', alignItems:'center'}}>
            <button onClick={handlePrev} style={{background:'none', border:'none', color:'white', cursor:'pointer', fontSize:18}}>⏮</button>
            <button onClick={() => currentTrackIndex !== null && handlePlay(currentTrackIndex)} style={{background:'none', border:'none', color:'white', cursor:'pointer', fontSize:24}}>{isPaused ? '▶' : '■'}</button>
            <button onClick={handleNext} style={{background:'none', border:'none', color:'white', cursor:'pointer', fontSize:18}}>⏭</button>
          </div>
          
          <div className="mw-player-time" style={{fontSize:12, opacity:0.5, minWidth:80, textAlign:'center'}}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      )}
    </div>
  )
}
