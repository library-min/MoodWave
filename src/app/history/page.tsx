'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { getEntries, deleteEntry, HistoryEntry } from '@/lib/storage'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { Track } from '@/types'

const emotionEmojis: Record<string, string> = {
  기쁨: '😊', 슬픔: '😢', 분노: '😤', 불안: '😰', 평온: '😌', 설렘: '🥰', 피곤: '😴', 기본: '🎵'
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeEntryIndex, setActiveEntryIndex] = useState(0)
  
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30)
  const [isPaused, setIsPaused] = useState(true)
  const [volume, setVolume] = useState(0.7)
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const tabsRef = useRef<HTMLDivElement | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session) fetchHistory()
      else setLoading(false)
    })

    // 컴포넌트 언마운트 시 오디오 정지
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const fetchHistory = async () => {
    try {
      const data = await getEntries()
      setEntries(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('기록을 삭제할까요?')) return
    try {
      await deleteEntry(id)
      setEntries(entries.filter(e => e.id !== id))
      setActiveEntryIndex(0)
    } catch (e) {
      alert('삭제에 실패했습니다.')
    }
  }

  const handlePlay = (track: Track) => {
    if (!track.previewUrl) return

    if (playingId === track.id) {
      if (audioRef.current?.paused) {
        audioRef.current.play()
        setIsPaused(false)
      } else {
        audioRef.current?.pause()
        setIsPaused(true)
      }
      return
    }

    if (audioRef.current) audioRef.current.pause()

    const audio = new Audio(track.previewUrl)
    audio.volume = volume
    audioRef.current = audio
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
    audio.onloadedmetadata = () => setDuration(audio.duration)
    audio.onended = () => { setPlayingId(null); setIsPaused(true); }
    audio.onplay = () => setIsPaused(false)
    audio.onpause = () => setIsPaused(true)

    audio.play()
    setPlayingId(track.id)
    setIsPaused(false)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (audioRef.current) {
      audioRef.current.volume = val
    }
  }

  const scrollTabs = (direction: 'left' | 'right') => {
    if (!tabsRef.current) return
    const scrollAmount = 200
    tabsRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear(), month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const calendarDays = getDaysInMonth(currentMonth)
  
  const getTopEmotionForDate = (dateStr: string) => {
    const dayEntries = entries.filter(e => e.date === dateStr)
    if (dayEntries.length === 0) return null
    const counts = dayEntries.reduce((acc, curr) => {
      acc[curr.emotion] = (acc[curr.emotion] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  }

  const dayEntries = entries.filter(e => e.date === selectedDate)
  const selectedEntry = dayEntries[activeEntryIndex]

  const monthEntries = entries.filter(e => {
    const d = new Date(e.date)
    return d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth()
  })
  const emotionStats = monthEntries.reduce((acc, curr) => { acc[curr.emotion] = (acc[curr.emotion] || 0) + 1; return acc; }, {} as Record<string, number>)
  const sortedStats = Object.entries(emotionStats).sort((a, b) => b[1] - a[1])

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    setActiveEntryIndex(0)
  }

  if (loading) return (
    <div className="mw-loader-wrap">
      <style>{`
        .mw-loader-wrap { min-height: 100vh; background: #0d0d14; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; color: #f0eee8; }
        .mw-pulse-logo { font-family: 'DM Serif Display', serif; font-size: 32px; letter-spacing: 0.2em; color: #c4a8ff; animation: pulse 2s infinite ease-in-out; }
        @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1); } }
        .mw-loading-bar-bg { width: 120px; height: 2px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; }
        .mw-loading-bar-fill { height: 100%; width: 40%; background: #c4a8ff; border-radius: 10px; animation: slide 1.5s infinite ease-in-out; }
        @keyframes slide { from { transform: translateX(-150%); } to { transform: translateX(250%); } }
      `}</style>
      <div className="mw-pulse-logo">MOODWAVE</div>
      <div className="mw-loading-bar-bg"><div className="mw-loading-bar-fill" /></div>
    </div>
  )

  if (!user) return (
    <div className="mw-history-login-req">
      <style>{`.mw-history-login-req { min-height: 100vh; background: #0d0d14; color: white; display: flex; flexDirection: column; align-items: center; justify-content: center; gap: 20px; } .login-btn { background: #c4a8ff; color: #0d0d14; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-weight: 700; }`}</style>
      <p style={{opacity:0.6}}>로그인이 필요해요</p>
      <Link href="/" className="login-btn">홈으로 가기</Link>
    </div>
  )

  return (
    <main className="mw-history-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@200;400;700&family=DM+Serif+Display&display=swap');
        .mw-history-page { min-height: 100vh; background: #0d0d14; color: #f0eee8; font-family: 'Noto Serif KR', serif; padding: 40px 20px 120px; width: 100%; overflow-x: hidden; }
        .mw-inner { max-width: 1100px; margin: 0 auto; width: 100%; }
        .back-link { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.3); text-decoration: none; font-size: 14px; margin-bottom: 40px; }
        .mw-history-layout { display: grid; grid-template-columns: 1fr 400px; gap: 40px; }
        .calendar-wrap { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 32px; padding: 32px; backdrop-filter: blur(10px); width: 100%; }
        .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; width: 100%; }
        .cal-day { aspect-ratio: 1; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; transition: all 0.3s; position: relative; border: 1px solid transparent; background: rgba(255,255,255,0.01); }
        .cal-day.selected { background: rgba(196, 168, 255, 0.15); border-color: #c4a8ff; }
        .cal-day.today::after { content: ''; position: absolute; top: 6px; right: 6px; width: 4px; height: 4px; background: #c4a8ff; border-radius: 50%; }
        
        /* 탭 가로 스크롤 */
        .tabs-container { position: relative; display: flex; align-items: center; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .entry-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; -ms-overflow-style: none; scrollbar-width: none; flex: 1; scroll-behavior: smooth; }
        .entry-tabs::-webkit-scrollbar { display: none; }
        .entry-tab { padding: 10px 18px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.4); cursor: pointer; font-size: 13px; transition: all 0.3s; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
        .entry-tab.active { background: #c4a8ff; color: #0d0d14; border-color: #c4a8ff; font-weight: 600; }
        
        .tab-scroll-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; z-index: 2; margin-bottom: 12px; }
        .tab-scroll-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
        
        /* 노래 세로 목록 */
        .detail-tracks { display: flex; flex-direction: column; gap: 10px; }
        .detail-track { display: flex; align-items: center; gap: 16px; padding: 12px; border-radius: 20px; background: rgba(255,255,255,0.03); border: 1px solid transparent; text-decoration: none; color: inherit; transition: all 0.3s ease; cursor: pointer; position: relative; overflow: hidden; }
        .detail-track:hover { background: rgba(255,255,255,0.06); }
        .detail-track.playing { background: rgba(196, 168, 255, 0.12); border-color: rgba(196, 168, 255, 0.2); }
        .track-art { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; }
        .track-progress-bar { position: absolute; bottom: 0; left: 0; height: 2px; background: #c4a8ff; opacity: 0.6; }
        
        .detail-panel { position: sticky; top: 40px; height: fit-content; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 32px; padding: 32px; backdrop-filter: blur(30px); width: 100%; min-height: 500px; }
        
        /* 미니 플레이어 */
        .mw-mini-player { position: fixed; bottom: 0; left: 0; right: 0; height: 72px; background: rgba(13, 13, 20, 0.85); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 24px; gap: 16px; z-index: 1000; }
        .mw-player-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .mw-player-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mw-player-artist { font-size: 12px; color: rgba(255,255,255,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        @media (max-width: 1000px) { .mw-history-layout { grid-template-columns: 1fr; } .detail-panel { position: static; margin-top: 20px; } }
        @media (max-width: 600px) { .mw-mini-player { padding: 0 16px; } }
      `}</style>

      <div className="mw-inner">
        <Link href="/" className="back-link">&larr; 돌아가기</Link>
        <div className="mw-history-layout">
          <div className="calendar-section">
            <div className="calendar-wrap">
              <div className="cal-header"><button onClick={handlePrevMonth} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>&larr;</button><div style={{fontFamily:'DM Serif Display', fontSize:24}}>{currentMonth.getFullYear()} / {currentMonth.getMonth() + 1}</div><button onClick={handleNextMonth} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>&rarr;</button></div>
              <div className="cal-grid">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (<div key={d} style={{textAlign:'center', fontSize:11, opacity:0.2, marginBottom:12}}>{d}</div>))}
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />
                  const dateStr = day.toISOString().split('T')[0]
                  const topEmotion = getTopEmotionForDate(dateStr)
                  const isToday = new Date().toISOString().split('T')[0] === dateStr
                  return (<div key={dateStr} className={`cal-day ${topEmotion ? 'has-record' : ''} ${selectedDate === dateStr ? 'selected' : ''} ${isToday ? 'today' : ''}`} onClick={() => handleDateClick(dateStr)}><span>{day.getDate()}</span>{topEmotion && <span style={{fontSize:18, marginTop:4}}>{emotionEmojis[topEmotion] || '🎵'}</span>}</div>)
                })}
              </div>
            </div>
            {/* 통계 바 차트 */}
            <div style={{marginTop: 40, padding: '0 10px'}}>
              <h3 style={{fontFamily:'DM Serif Display', fontSize:20, marginBottom: 24}}>Mood Spectrum</h3>
              {sortedStats.map(([emotion, count]) => (
                <div key={emotion} style={{display:'flex', alignItems:'center', gap:12, marginBottom:12}}>
                  <span style={{width: 60, fontSize: 13, opacity: 0.6}}>{emotion}</span>
                  <div style={{flex:1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden'}}><div style={{height:'100%', width: `${(count / monthEntries.length) * 100}%`, background: 'linear-gradient(90deg, #c4a8ff, #8ab4ff)'}} /></div>
                  <span style={{fontSize: 11, opacity: 0.3}}>{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="detail-panel">
            <div style={{fontSize:12, opacity:0.3, marginBottom:16}}>{selectedDate}</div>
            {dayEntries.length > 0 ? (
              <>
                <div className="tabs-container">
                  {dayEntries.length > 3 && (
                    <button className="tab-scroll-btn" onClick={() => scrollTabs('left')}>&larr;</button>
                  )}
                  <div className="entry-tabs" ref={tabsRef}>
                    {dayEntries.map((entry, idx) => (
                      <button key={entry.id} className={`entry-tab ${activeEntryIndex === idx ? 'active' : ''}`} onClick={() => setActiveEntryIndex(idx)}>
                        <span>{emotionEmojis[entry.emotion]}</span>{entry.emotion}
                      </button>
                    ))}
                  </div>
                  {dayEntries.length > 3 && (
                    <button className="tab-scroll-btn" onClick={() => scrollTabs('right')}>&rarr;</button>
                  )}
                </div>
                
                {selectedEntry && (
                  <div className="fade-up" key={selectedEntry.id}>
                    <div style={{fontSize:32, fontWeight:700, marginBottom:12}}>{emotionEmojis[selectedEntry.emotion]} {selectedEntry.emotion}</div>
                    <p style={{fontSize:15, lineHeight:1.7, opacity:0.7, marginBottom:20, fontWeight:300}}>{selectedEntry.summary}</p>
                    <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom: 32}}>{selectedEntry.keywords.map(k => (<span key={k} style={{fontSize:11, padding:'4px 10px', borderRadius:100, border:'1px solid rgba(196,168,255,0.2)', color:'#c4a8ff'}}>#{k}</span>))}</div>
                    
                    <div style={{fontSize:11, opacity:0.2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12}}>Playlist Collection</div>
                    <div className="detail-tracks">
                      {selectedEntry.tracks.slice(0, 5).map((track: Track) => (
                        <div key={track.id} className={`detail-track ${playingId === track.id ? 'playing' : ''}`} onClick={() => handlePlay(track)}>
                          <img src={track.albumImage} alt="" className="track-art" />
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{fontSize:14, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{track.name}</div>
                            <div style={{fontSize:12, opacity:0.4}}>{track.artist}</div>
                          </div>
                          <div style={{fontSize:14}}>{playingId === track.id && !isPaused ? '■' : '▶'}</div>
                          {playingId === track.id && (
                            <div className="track-progress-bar" style={{ width: `${(currentTime / duration) * 100}%` }} />
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => handleDelete(selectedEntry.id)} style={{width:'100%', marginTop:32, background:'rgba(239,68,68,0.05)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.1)', padding:12, borderRadius:12, cursor:'pointer', fontSize:13}}>기록 삭제하기</button>
                  </div>
                )}
              </>
            ) : (
              <div style={{height:300, display:'flex', alignItems:'center', justifySelf:'center', justifyContent:'center', opacity:0.2, fontSize:14}}>{selectedDate} 기록이 없습니다.</div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 미니 플레이어 */}
      {playingId && (
        <div className="mw-mini-player fade-up">
          <div className="mw-player-info">
            <div className="mw-player-text">
              <div className="mw-player-title">Now Playing</div>
              <div className="mw-player-artist">{formatTime(currentTime)} / {formatTime(duration)}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '20px' }}>
            <span style={{ fontSize: '12px', opacity: 0.5 }}>Vol</span>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume} 
              onChange={handleVolumeChange}
              style={{ width: '80px', accentColor: '#c4a8ff', cursor: 'pointer' }}
            />
          </div>

          <button onClick={() => { if (audioRef.current?.paused) audioRef.current.play(); else audioRef.current?.pause(); }} style={{background:'none', border:'none', color:'white', cursor:'pointer', fontSize:24}}>
            {isPaused ? '▶' : '■'}
          </button>
        </div>
      )}
    </main>
  )
}
