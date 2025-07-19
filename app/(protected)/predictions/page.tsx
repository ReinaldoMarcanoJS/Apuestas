'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Prediction {
  id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  is_correct: boolean | null
  points_earned: number | null
  created_at: string
  matches: {
    id: string
    home_team: string
    away_team: string
    home_score: number | null
    away_score: number | null
    status: string
    match_date: string
    league: string
  }
}

interface PredictionStats {
  totalPredictions: number
  correctPredictions: number
  accuracy: number
  totalPoints: number
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [predictionStats, setPredictionStats] = useState<PredictionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setUser] = useState<{ id: string; email?: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/auth/login'
          return
        }
        setUser(user)

        // Cargar predicciones
        const response = await fetch('/api/predictions')
        if (response.ok) {
          const data = await response.json()
          setPredictions(data.predictions || [])
          setPredictionStats(data.stats)
        }
      } catch (error) {
        console.error('Error cargando predicciones:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase])

  const getPredictionResult = (prediction: Prediction) => {
    if (prediction.is_correct === null) return 'Pendiente'
    return prediction.is_correct ? '✅ Correcta' : '❌ Incorrecta'
  }

  const getPredictionText = (prediction: Prediction) => {
    if (prediction.predicted_home_score > prediction.predicted_away_score) {
      return `Victoria ${prediction.matches.home_team}`
    } else if (prediction.predicted_away_score > prediction.predicted_home_score) {
      return `Victoria ${prediction.matches.away_team}`
    } else {
      return 'Empate'
    }
  }

  const getActualResult = (prediction: Prediction) => {
    if (prediction.matches.status !== 'finished' || 
        prediction.matches.home_score === null || 
        prediction.matches.away_score === null) {
      return 'Pendiente'
    }
    
    if (prediction.matches.home_score > prediction.matches.away_score) {
      return `${prediction.matches.home_score}-${prediction.matches.away_score} (${prediction.matches.home_team})`
    } else if (prediction.matches.away_score > prediction.matches.home_score) {
      return `${prediction.matches.home_score}-${prediction.matches.away_score} (${prediction.matches.away_team})`
    } else {
      return `${prediction.matches.home_score}-${prediction.matches.away_score} (Empate)`
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        {/* Skeleton para el título */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>

        {/* Skeleton para estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-24 mx-auto animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Skeleton para el historial */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="mb-6 last:mb-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                      <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="text-center">
                        <div className="h-4 bg-gray-200 rounded w-20 mx-auto mb-1 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mis Predicciones</h1>
        <p className="text-gray-600">Seguimiento de tus predicciones y estadísticas</p>
      </div>

      {/* Estadísticas */}
      {predictionStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{predictionStats.totalPredictions}</div>
            <div className="text-sm text-gray-600">Total Predicciones</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{predictionStats.correctPredictions}</div>
            <div className="text-sm text-gray-600">Predicciones Correctas</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{predictionStats.accuracy}%</div>
            <div className="text-sm text-gray-600">Precisión</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">{predictionStats.totalPoints}</div>
            <div className="text-sm text-gray-600">Puntos Totales</div>
          </div>
        </div>
      )}

      {/* Historial de Predicciones */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Historial de Predicciones</h2>
        </div>
        
        {predictions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes predicciones aún</h3>
            <p className="text-gray-500 mb-4">
              Ve a la página de partidos y haz tus primeras predicciones para empezar a acumular puntos.
            </p>
            <a 
              href="/matches" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Ir a Partidos
            </a>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {predictions.map(prediction => (
              <div key={prediction.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg">{prediction.matches.home_team}</span>
                      <span className="text-gray-500">vs</span>
                      <span className="font-semibold text-lg">{prediction.matches.away_team}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {prediction.matches.league}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(prediction.matches.match_date).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-gray-700">Tu predicción</div>
                      <div className="text-blue-600 font-medium">{getPredictionText(prediction)}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-700">Resultado</div>
                      <div className="text-gray-600">{getActualResult(prediction)}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-700">Estado</div>
                      <div className={prediction.is_correct === true ? 'text-green-600 font-medium' : 
                                     prediction.is_correct === false ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {getPredictionResult(prediction)}
                      </div>
                    </div>
                    {prediction.points_earned !== null && (
                      <div className="text-center">
                        <div className="font-semibold text-gray-700">Puntos</div>
                        <div className="text-orange-600 font-bold text-lg">{prediction.points_earned}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 