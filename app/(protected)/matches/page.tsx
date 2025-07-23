'use client'
import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface League {
  id: number
  name: string
  logo: string | null
  country?: string | null
  season?: number | null
}

interface Match {
  id: string
  home_team: string
  away_team: string
  league: string
  match_date: string
  status: string
  home_score: number | null
  away_score: number | null
  home_logo?: string | null
  away_logo?: string | null
  start_timestamp?: number | null
  api_status?: string | null
}

const STATUS_FILTERS = [
  { label: 'No comenzados', value: 'upcoming' },
  { label: 'En vivo', value: 'live' },
  { label: 'Finalizados', value: 'finished' },
]

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null)
  const [votes, setVotes] = useState<Record<string, 'local' | 'empate' | 'visitante'>>({})
  const [statusFilter, setStatusFilter] = useState<'upcoming' | 'live' | 'finished' | null>(null)
  const [offset, setOffset] = useState(0)
  const limit = 20
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [timeoutError, setTimeoutError] = useState(false)

  // Fetch inicial y cuando cambia la liga o el filtro
  useEffect(() => {
    setLoading(true)
    setOffset(0)
    fetch(`/api/football-matches?offset=0&limit=${limit}`)
      .then(res => res.json())
      .then(data => {
        setMatches(data.matches || [])
        setLeagues(data.leagues || [])
        setHasMore((data.matches || []).length === limit)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!loading) {
      setTimeoutError(false)
      return
    }
    const timer = setTimeout(() => {
      if (loading) setTimeoutError(true)
    }, 15000)
    return () => clearTimeout(timer)
  }, [loading])

  const handleRetry = () => {
    setTimeoutError(false)
    setLoading(true)
    fetch(`/api/football-matches?offset=0&limit=${limit}`)
      .then(res => res.json())
      .then(data => {
        setMatches(data.matches || [])
        setLeagues(data.leagues || [])
        setHasMore((data.matches || []).length === limit)
        setLoading(false)
      })
  }

  // Filtrar partidos por búsqueda, liga y status
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const matchText = `${m.home_team} ${m.away_team} ${m.league}`.toLowerCase()
      const searchMatch = matchText.includes(search.toLowerCase())
      let leagueMatch = true
      if (selectedLeague) {
        const leagueObj = leagues.find(l => l.id === selectedLeague)
        leagueMatch = leagueObj ? m.league === leagueObj.name : false
      }
      let statusMatch = true
      if (statusFilter) {
        statusMatch = m.status === statusFilter
      }
      return searchMatch && leagueMatch && statusMatch
    })
  }, [matches, search, selectedLeague, leagues, statusFilter])

  if (timeoutError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">No se pudo cargar la página</h2>
        <p className="text-muted-foreground mb-6">La carga está tardando demasiado. Por favor, verifica tu conexión o inténtalo de nuevo.</p>
        <button onClick={handleRetry} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Intentar nuevamente
        </button>
      </div>
    )
  }

  const handleVote = async (matchId: string, vote: 'local' | 'empate' | 'visitante') => {
    setVotes(prev => ({ ...prev, [matchId]: vote }))
    
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          prediction: vote
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Error guardando predicción:', error)
        // Revertir el voto si falla
        setVotes(prev => {
          const newVotes = { ...prev }
          delete newVotes[matchId]
          return newVotes
        })
      }
    } catch (error) {
      console.error('Error guardando predicción:', error)
      // Revertir el voto si falla
      setVotes(prev => {
        const newVotes = { ...prev }
        delete newVotes[matchId]
        return newVotes
      })
    }
  }

  // Cargar más partidos
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextOffset = offset + limit
    fetch(`/api/football-matches?offset=${nextOffset}&limit=${limit}`)
      .then(res => res.json())
      .then(data => {
        setMatches(prev => [...prev, ...(data.matches || [])])
        setHasMore((data.matches || []).length === limit)
        setOffset(nextOffset)
      })
      .finally(() => setLoadingMore(false))
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-2 py-6 flex flex-col md:flex-row gap-6">
        {/* Columna de partidos */}
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <input
              type="text"
              placeholder="Buscar equipo o liga..."
              className="border rounded px-3 py-2 flex-1"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <h1 className="text-2xl font-bold mb-2">Partidos de hoy</h1>
          <div className="flex gap-2 mb-4">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                className={`px-3 py-1 rounded font-semibold border transition-colors ${statusFilter === f.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
                onClick={() => setStatusFilter(f.value as 'upcoming' | 'live' | 'finished')}
              >
                {f.label}
              </button>
            ))}
            <button
              className={`px-3 py-1 rounded font-semibold border transition-colors ${statusFilter === null ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
              onClick={() => setStatusFilter(null)}
            >
              Todos
            </button>
          </div>
          {loading ? (
            <div className="space-y-4">
              {/* Skeleton para búsqueda */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <div className="h-10 bg-gray-200 rounded flex-1 animate-pulse"></div>
              </div>
              
              {/* Skeleton para título */}
              <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              
              {/* Skeleton para filtros */}
              <div className="flex gap-2 mb-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                ))}
              </div>
              
              {/* Skeleton para partidos */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row items-center gap-4 w-full">
                  <div className="flex-1 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 bg-gray-200 rounded mb-1 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </div>
                    <div className="flex flex-col items-center justify-center min-w-[60px]">
                      <div className="h-4 bg-gray-200 rounded w-8 mb-1 animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 bg-gray-200 rounded mb-1 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 min-w-[120px]">
                    <div className="h-4 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="text-center text-gray-500">No hay partidos para mostrar.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredMatches.map(match => {
                const leagueObj = leagues.find(l => l.name === match.league)
                const partidoEnVivo = match.status === 'live'
                const puedeVotar = match.status === 'upcoming'
                return (
                  <div key={match.id} className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row items-center gap-4 w-full">
                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex flex-col items-center">
                        {match.home_logo && (
                          <Image 
                            src={match.home_logo} 
                            alt={match.home_team} 
                            width={40}
                            height={40}
                            className="mb-1" 
                          />
                        )}
                        <span className="font-semibold text-sm text-center">{match.home_team}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center min-w-[60px]">
                        <div className="text-center text-gray-500 font-bold text-lg">vs</div>
                        <div className="text-center text-xl font-bold mt-1">
                          {match.home_score !== null && match.away_score !== null
                            ? `${match.home_score} - ${match.away_score}`
                            : '--'}
                        </div>
                        {partidoEnVivo && (
                          <div className="text-xs text-green-600 font-semibold mt-1">En juego</div>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        {match.away_logo && (
                          <Image 
                            src={match.away_logo} 
                            alt={match.away_team} 
                            width={40}
                            height={40}
                            className="mb-1" 
                          />
                        )}
                        <span className="font-semibold text-sm text-center">{match.away_team}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 min-w-[120px]">
                      <div className="text-xs text-gray-500 mb-1">{new Date(match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      {puedeVotar && (
                        <div className="flex gap-1">
                          <button
                            className={`px-2 py-1 rounded text-xs font-semibold border ${votes[match.id] === 'local' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 border-gray-300'}`}
                            onClick={() => handleVote(match.id, 'local')}
                          >
                            {match.home_team}
                          </button>
                          <button
                            className={`px-2 py-1 rounded text-xs font-semibold border ${votes[match.id] === 'empate' ? 'bg-black text-white border-black' : 'bg-gray-100 border-gray-300'}`}
                            onClick={() => handleVote(match.id, 'empate')}
                          >
                            Empate
                          </button>
                          <button
                            className={`px-2 py-1 rounded text-xs font-semibold border ${votes[match.id] === 'visitante' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 border-gray-300'}`}
                            onClick={() => handleVote(match.id, 'visitante')}
                          >
                            {match.away_team}
                          </button>
                        </div>
                      )}
                      {leagueObj && (
                        <div className="flex items-center gap-1 mt-1">
                          {leagueObj.logo && (
                            <Image 
                              src={leagueObj.logo} 
                              alt={leagueObj.name} 
                              width={16}
                              height={16}
                            />
                          )}
                          <span className="text-xs text-gray-500">{leagueObj.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {hasMore && filteredMatches.length === matches.length && (
                <button
                  className={`mt-4 px-4 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-50`}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Cargando...' : 'Cargar más'}
                </button>
              )}
            </div>
          )}
        </div>
        {/* Columna de ligas */}
        <aside className="md:w-64 w-full md:sticky md:top-6 md:h-[calc(100vh-48px)]">
          <div className="bg-white rounded-xl shadow p-4 h-full flex flex-col">
            <h2 className="text-lg font-bold mb-3">Ligas</h2>
            {loading ? (
              <>
                {/* Desktop: scroll vertical, Mobile: scroll horizontal */}
                <div className="hidden md:flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2">
                      <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                  ))}
                </div>
                <div className="flex md:hidden gap-2 overflow-x-auto pb-2">
                  <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2">
                      <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Desktop: scroll vertical, Mobile: scroll horizontal */}
                <div className="hidden md:flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                  <button
                    className={`flex items-center gap-2 px-3 py-2 rounded ${selectedLeague === null ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                    onClick={() => setSelectedLeague(null)}
                  >
                    <span className="whitespace-nowrap">Todas</span>
                  </button>
                  {leagues.map(league => (
                                    <button
                  key={league.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded ${selectedLeague === league.id ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  onClick={() => setSelectedLeague(league.id)}
                >
                  {league.logo && (
                    <Image 
                      src={league.logo} 
                      alt={league.name} 
                      width={20}
                      height={20}
                      className="rounded-full bg-white" 
                    />
                  )}
                  <span className="whitespace-nowrap">{league.name}</span>
                </button>
                  ))}
                </div>
                <div className="flex md:hidden gap-2 overflow-x-auto pb-2">
                  <button
                    className={`flex items-center gap-2 px-3 py-2 rounded ${selectedLeague === null ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                    onClick={() => setSelectedLeague(null)}
                  >
                    <span className="whitespace-nowrap">Todas</span>
                  </button>
                  {leagues.map(league => (
                                    <button
                  key={league.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded ${selectedLeague === league.id ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  onClick={() => setSelectedLeague(league.id)}
                >
                  {league.logo && (
                    <Image 
                      src={league.logo} 
                      alt={league.name} 
                      width={20}
                      height={20}
                      className="rounded-full bg-white" 
                    />
                  )}
                  <span className="whitespace-nowrap">{league.name}</span>
                </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
} 