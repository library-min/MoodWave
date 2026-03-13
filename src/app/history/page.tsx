'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getEntries, deleteEntry, HistoryEntry } from '@/lib/storage'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

const emotionEmojis: Record<string, string> = {
  기쁨: '😊', 슬픔: '😢', 분노: '😤', 불안: '😰', 평온: '😌', 설렘: '🥰', 피곤: '😴', 기본: '🎵'
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session) fetchHistory()
      else setLoading(false)
    })
  }, [])

  const fetchHistory = async () => {
    try {
      const data = await getEntries()
      setEntries(data)
    } catch (e) {} finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('기록을 삭제할까요?')) return
    try {
      await deleteEntry(id)
      setEntries(entries.filter(e => e.id !== id))
    } catch (e) {
      alert('삭제에 실패했습니다.')
    }
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
  const selectedEntry = entries.find(e => e.date === selectedDate)
  const monthEntries = entries.filter(e => {
    const d = new Date(e.date)
    return d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth()
  })
  const emotionStats = monthEntries.reduce((acc, curr) => { acc[curr.emotion] = (acc[curr.emotion] || 0) + 1; return acc; }, {} as Record<string, number>)
  const sortedStats = Object.entries(emotionStats).sort((a, b) => b[1] - a[1])

  if (loading) return <div style={{minHeight:'100vh', background:'#0d0d14', color:'white', display:'flex', alignItems:'center', justifySelf:'center', justifyContent:'center', fontFamily:'serif'}}>LOADING...</div>

  if (!user) return (
    <div style={{minHeight:'100vh', background:'#0d0d14', color:'white', display:'flex', flexDirection:'column', alignItems:'center', justifySelf:'center', justifyContent:'center', gap:20}}>
      <p style={{opacity:0.6}}>로그인이 필요해요</p>
      <Link href="/" style={{background:'#c4a8ff', color:'#0d0d14', padding:'12px 24px', borderRadius:100, textDecoration:'none', fontWeight:700}}>홈으로 가기</Link>
    </div>
  )

  return (
    <main className="mw-history-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@200;400;700&family=DM+Serif+Display&display=swap');
        .mw-history-page { min-height: 100vh; background: #0d0d14; color: #f0eee8; font-family: 'Noto Serif KR', serif; padding: 40px 20px 100px; width: 100%; overflow-x: hidden; }
        .mw-inner { max-width: 1100px; margin: 0 auto; width: 100%; }
        .back-link { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.3); text-decoration: none; font-size: 14px; margin-bottom: 40px; }
        .mw-history-layout { display: grid; grid-template-columns: 1fr 400px; gap: 40px; }
        .calendar-wrap { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 32px; padding: 32px; backdrop-filter: blur(10px); width: 100%; }
        .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .cal-title { font-family: 'DM Serif Display', serif; font-size: 24px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; width: 100%; }
        .cal-weekday { text-align: center; font-size: 11px; opacity: 0.2; letter-spacing: 0.1em; margin-bottom: 12px; }
        .cal-day { aspect-ratio: 1; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; transition: all 0.3s; position: relative; border: 1px solid transparent; background: rgba(255,255,255,0.01); }
        .cal-day.has-record { background: rgba(255,255,255,0.04); }
        .cal-day.selected { background: rgba(196, 168, 255, 0.15); border-color: #c4a8ff; }
        .cal-day.today::after { content: ''; position: absolute; top: 6px; right: 6px; width: 4px; height: 4px; background: #c4a8ff; border-radius: 50%; }
        .day-emoji { font-size: 18px; margin-top: 4px; }
        .detail-panel { position: sticky; top: 40px; height: fit-content; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 32px; padding: 32px; backdrop-filter: blur(30px); width: 100%; }
        .detail-emotion { font-size: 32px; font-weight: 700; margin-bottom: 12px; }
        .detail-track { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px; background: rgba(255,255,255,0.03); text-decoration: none; color: inherit; margin-bottom: 8px; }
        .track-art { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; }
        @media (max-width: 1000px) {
          .mw-history-layout { grid-template-columns: 1fr; }
          .detail-panel { position: static; margin-top: 20px; }
        }
        @media (max-width: 600px) {
          .cal-grid { gap: 4px; }
          .cal-day { font-size: 12px; border-radius: 8px; }
          .day-emoji { font-size: 14px; }
          .calendar-wrap { padding: 20px; border-radius: 24px; }
          .detail-panel { padding: 24px; border-radius: 24px; }
        }
      `}</style>
      <div className="mw-inner">
        <Link href="/" className="back-link">&larr; 돌아가기</Link>
        <div className="mw-history-layout">
          <div className="calendar-section">
            <div className="calendar-wrap">
              <div className="cal-header"><button onClick={handlePrevMonth} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>&larr;</button><div className="cal-title">{currentMonth.getFullYear()} / {currentMonth.getMonth() + 1}</div><button onClick={handleNextMonth} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>&rarr;</button></div>
              <div className="cal-grid">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (<div key={d} className="cal-weekday">{d}</div>))}
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />
                  const dateStr = day.toISOString().split('T')[0], entry = entries.find(e => e.date === dateStr), isSelected = selectedDate === dateStr, isToday = new Date().toISOString().split('T')[0] === dateStr
                  return (<div key={dateStr} className={`cal-day ${entry ? 'has-record' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`} onClick={() => setSelectedDate(dateStr)}><span>{day.getDate()}</span>{entry && <span className="day-emoji">{emotionEmojis[entry.emotion] || '🎵'}</span>}</div>)
                })}
              </div>
            </div>
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
            {selectedEntry ? (
              <div key={selectedEntry.id}>
                <div style={{fontSize:12, opacity:0.3, marginBottom:8}}>{selectedEntry.date}</div>
                <div className="detail-emotion">{emotionEmojis[selectedEntry.emotion]} {selectedEntry.emotion}</div>
                <p style={{fontSize:15, lineHeight:1.7, opacity:0.7, marginBottom:24, fontWeight:300}}>{selectedEntry.summary}</p>
                <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom: 32}}>{selectedEntry.keywords.map(k => (<span key={k} style={{fontSize:11, padding:'4px 10px', borderRadius:100, border:'1px solid rgba(196,168,255,0.2)', color:'#c4a8ff'}}>#{k}</span>))}</div>
                <div style={{fontSize:12, letterSpacing:'0.1em', opacity:0.2, textTransform:'uppercase', marginBottom:16}}>Playlist</div>
                {selectedEntry.tracks.slice(0, 5).map(track => (
                  <a key={track.id} href={track.spotifyUrl} target="_blank" rel="noopener noreferrer" className="detail-track"><img src={track.albumImage} alt="" className="track-art" /><div style={{flex:1, minWidth:0}}><div style={{fontSize:14, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{track.name}</div><div style={{fontSize:12, opacity:0.4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{track.artist}</div></div></a>
                ))}
                <button onClick={() => handleDelete(selectedEntry.id)} style={{width:'100%', marginTop:32, background:'rgba(239,68,68,0.05)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.1)', padding:12, borderRadius:12, cursor:'pointer', fontSize:13}}>기록 삭제</button>
              </div>
            ) : (<div style={{height:300, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.2, fontSize:14}}>{selectedDate} 기록이 없습니다.</div>)}
          </div>
        </div>
      </div>
    </main>
  )
}
