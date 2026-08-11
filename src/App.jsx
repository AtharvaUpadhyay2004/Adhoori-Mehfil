import { useEffect, useMemo, useRef, useState } from 'react'

// Edit only this block with your final copy and playlist links.
const SITE = {
  name: 'ADHOORI MEHFIL',
  suggestEmail: 'atharva.upadhyay2144@gmail.com',
  spotifyUrl: 'https://open.spotify.com/playlist/3LV8L5VMua5M7COsqzHuXd',
  appleMusicUrl: 'https://music.apple.com/in/library/playlist/p.YJXV928s5JV8v7o',
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

function PlayIcon({ playing }) {
  if (playing) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function SkipIcon({ direction }) {
  if (direction === 'previous') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 5h2v14H6zM16 5l-9 7 9 7z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 5h2v14h-2zM8 5l9 7-9 7z" />
    </svg>
  )
}

function shuffleArr(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const SHER_INTERVAL = 15000

function SherWidget() {
  const sheersRef = useRef([])
  const posRef = useRef(0)
  const pauseRef = useRef(false)
  const busyRef = useRef(false)
  const timerRef = useRef(null)
  const fnRef = useRef({})
  const [current, setCurrent] = useState(null)
  const [opacity, setOpacity] = useState(1)

  // update fns every render so they always close over latest refs/state
  useEffect(() => {
    fnRef.current.schedule = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(fnRef.current.tryAdvance, SHER_INTERVAL)
    }
    fnRef.current.tryAdvance = () => {
      if (pauseRef.current || busyRef.current) {
        timerRef.current = setTimeout(fnRef.current.tryAdvance, 500)
        return
      }
      fnRef.current.doAdvance()
    }
    fnRef.current.doAdvance = () => {
      busyRef.current = true
      setOpacity(0)

      setTimeout(() => {
        const s = sheersRef.current
        posRef.current = (posRef.current + 1) % s.length
        if (posRef.current === 0) {
          const lastId = s[s.length - 1].id
          sheersRef.current = shuffleArr(s)
          if (sheersRef.current.length > 1 && sheersRef.current[0].id === lastId)
            ;[sheersRef.current[0], sheersRef.current[1]] = [sheersRef.current[1], sheersRef.current[0]]
        }
        setCurrent(sheersRef.current[posRef.current])
        setOpacity(1)
        busyRef.current = false
        fnRef.current.schedule()
      }, 600)
    }
  })

  useEffect(() => {
    fetch('/sher.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.sher?.length) return
        sheersRef.current = shuffleArr(d.sher)
        setCurrent(sheersRef.current[0])
        fnRef.current.schedule()
      })
      .catch(() => {})
    return () => clearTimeout(timerRef.current)
  }, [])

  const toggleMeaning = () => {
    const next = !meaningOpen
    setMeaningOpen(next)
    if (next) {
      pauseRef.current = true
      clearTimeout(timerRef.current)
    } else {
      pauseRef.current = false
      fnRef.current.schedule()
    }
  }

  if (!current) return null

  return (
    <div
      className="sher"
      onMouseEnter={() => { pauseRef.current = true; clearTimeout(timerRef.current) }}
      onMouseLeave={() => { pauseRef.current = false; fnRef.current.schedule() }}
    >
      <div style={{ opacity, transition: 'opacity 1.2s ease' }}>
        <p className="sher-text">{current.sher}</p>
        <p className="sher-poet">— {current.poet}</p>
        <p className="sher-meaning open">{current.easy_english_meaning}</p>
      </div>
    </div>
  )
}

export default function App() {
  const audioRef = useRef(null)
  const shouldResumeRef = useRef(false)
  const [tracks, setTracks] = useState([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [liveCount, setLiveCount] = useState(0)
  const sessionIdRef = useRef(crypto.randomUUID())

  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('https://adhoori-presence.atharva-upadhyay2144.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      })
        .then(r => r.json())
        .then(d => { if (d.count) setLiveCount(d.count) })
        .catch(() => {})
    }
    sendHeartbeat()
    const id = setInterval(sendHeartbeat, 30000)
    return () => clearInterval(id)
  }, [])

  const track = useMemo(() => tracks[index] ?? null, [tracks, index])

  useEffect(() => {
    fetch('/library.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('library missing')
        return response.json()
      })
      .then((data) => setTracks(shuffleArr(Array.isArray(data.tracks) ? data.tracks : [])))
      .catch(() => setError('Add music to public/music and restart the site.'))
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return

    setCurrentTime(0)
    setDuration(0)
    audio.load()
  }, [track?.id])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio || !track) return

    if (audio.paused) {
      try {
        await audio.play()
        setError('')
      } catch {
        setError('Playback was blocked. Press play again.')
      }
    } else {
      audio.pause()
    }
  }

  const move = (step, forcePlay = false) => {
    if (!tracks.length) return
    shouldResumeRef.current = forcePlay || playing
    setIndex((current) => (current + step + tracks.length) % tracks.length)
  }

  const seek = (event) => {
    const audio = audioRef.current
    if (!audio) return
    const value = Number(event.target.value)
    audio.currentTime = value
    setCurrentTime(value)
  }

  const handleCanPlay = async () => {
    if (!shouldResumeRef.current || !audioRef.current) return
    shouldResumeRef.current = false
    try {
      await audioRef.current.play()
    } catch {
      // A browser may require another direct click before playback resumes.
    }
  }

  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestSent, setSuggestSent] = useState(false)

  const hasSpotify = false
  const hasYtMusic = false

  return (
    <div className="page">
      <audio
        ref={audioRef}
        src={track?.src ?? undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onCanPlay={handleCanPlay}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => move(1, true)}
        onError={() => track && setError('This audio file could not be played.')}
      />

      <div className="film-grain" />

      <div className="live-indicator">
        <span className="live-dot"><span className="live-ping" /><span className="live-dot-inner" /></span>
        <span className="live-count">{liveCount}</span>
        <span className="live-label">online</span>
      </div>

      <nav className="links">
        <a href={SITE.spotifyUrl} target="_blank" rel="noreferrer" className="pill" aria-label="Open on Spotify">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          <span>Spotify</span>
        </a>
        <a href={SITE.appleMusicUrl} target="_blank" rel="noreferrer" className="pill" aria-label="Open on Apple Music">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0 0 19.7.28C18.82.11 17.93.006 17.03 0H6.97C6.07.006 5.18.11 4.3.28c-.87.17-1.66.52-2.33 1.09-.88.71-1.49 1.6-1.8 2.68-.18.63-.28 1.28-.33 1.95-.05.5-.06 1-.06 1.5v9c0 .5.01 1 .06 1.5.05.67.15 1.32.33 1.95.31 1.08.92 1.97 1.8 2.68.67.57 1.46.92 2.33 1.09.88.17 1.77.27 2.67.28h10.06c.9-.01 1.79-.11 2.67-.28.87-.17 1.66-.52 2.33-1.09.88-.71 1.49-1.6 1.8-2.68.18-.63.28-1.28.33-1.95.05-.5.06-1 .06-1.5v-9c0-.5-.01-1-.06-1.5zm-6.28 3.89l-.01 7.12c0 .61-.12 1.19-.36 1.74-.35.78-.9 1.34-1.66 1.68-.46.21-.95.33-1.46.38-.63.06-1.27.02-1.87-.18-.86-.28-1.49-.89-1.79-1.76a2.487 2.487 0 0 1 .07-1.78c.28-.68.78-1.14 1.44-1.43.47-.21.96-.33 1.47-.39.55-.06 1.1-.04 1.65.06.23.04.45.1.67.18V9.84l-.01-.07-5.72 1.74v8.44c0 .62-.12 1.2-.37 1.76-.36.78-.91 1.34-1.67 1.68-.46.21-.95.33-1.46.37-.63.06-1.27.02-1.87-.18-.86-.28-1.49-.89-1.79-1.76-.2-.57-.22-1.16-.07-1.76.27-.69.77-1.16 1.44-1.45.47-.21.96-.33 1.47-.39.55-.07 1.1-.04 1.65.06.24.04.46.1.69.18V7.45c0-.35.07-.69.25-.99.22-.37.56-.6.96-.71l6.07-1.85c.12-.04.25-.06.38-.08.42-.05.78.1 1.05.42.19.23.29.5.3.8V10z"/></svg>
          <span>Apple Music</span>
        </a>
        <button className="pill" onClick={() => { setShowSuggest(true); setSuggestSent(false) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span>Add Suggestion</span>
        </button>
      </nav>

      {showSuggest && (
        <div className="suggest-overlay" onClick={() => setShowSuggest(false)}>
          <div className="suggest-box" onClick={(e) => e.stopPropagation()}>
            <button className="suggest-close" onClick={() => setShowSuggest(false)} aria-label="Close">&times;</button>
            <h2 className="suggest-title">Suggest a Ghazal</h2>
            <p className="suggest-desc">Farmaiye, kya sunna pasand karenge?</p>
            {suggestSent ? (
              <p className="suggest-thanks">Shukriya! Your suggestion has been noted.</p>
            ) : (
              <form
                className="suggest-form"
                action={`https://formsubmit.co/${SITE.suggestEmail}`}
                method="POST"
                onSubmit={() => { setSuggestSent(true); setShowSuggest(false) }}
                target="_blank"
              >
                <input type="hidden" name="_subject" value="New Ghazal Suggestion - Adhoori Mehfil" />
                <input type="hidden" name="_captcha" value="false" />
                <input type="hidden" name="_template" value="box" />
                <input
                  className="suggest-input"
                  type="text"
                  name="song"
                  placeholder="Song or ghazal name..."
                  required
                  autoFocus
                />
                <input
                  className="suggest-input"
                  type="text"
                  name="artist"
                  placeholder="Artist (optional)"
                />
                <button className="suggest-submit" type="submit">Send Suggestion</button>
              </form>
            )}
          </div>
        </div>
      )}

      <main className="content">
        <h1 className="mehfil">Adhoori Mehfil</h1>
        <SherWidget />
      </main>

      <section className="player" aria-label="Music player">
        <div className={`cd${playing ? ' spinning' : ''}`}>
          {track?.cover ? <img src={track.cover} alt="" /> : <div className="cd-vinyl" />}
        </div>

        <div className="track-info">
          <strong>{track?.title ?? 'No music'}</strong>
          <span className="artist">{track?.artist}</span>
        </div>

        <span className="time">{formatTime(currentTime)} / {formatTime(duration)}</span>

        <button onClick={() => move(-1)} disabled={!track} aria-label="Previous track">
          <SkipIcon direction="previous" />
        </button>
        <button className="play" onClick={toggle} disabled={!track} aria-label={playing ? 'Pause' : 'Play'}>
          <PlayIcon playing={playing} />
        </button>
        <button onClick={() => move(1)} disabled={!track} aria-label="Next track">
          <SkipIcon direction="next" />
        </button>

        <div
          className="progress-bar"
          style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' }}
        >
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={seek}
            disabled={!track}
            aria-label="Seek"
          />
        </div>

        {error && <p className="player-error">{error}</p>}
      </section>
    </div>
  )
}
