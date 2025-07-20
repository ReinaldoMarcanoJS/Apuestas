"use client"
import { redirect, useSearchParams } from "next/navigation";
import { getProfileWithStats } from '@/lib/supabase/profiles'
import { ProfileWithStats } from '@/lib/types/database'
import { ProfileCard } from '@/components/profile/profile-card'
import { PostsFeed } from '@/components/posts/posts-feed'
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<ProfileWithStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [predictionStats, setPredictionStats] = useState<PredictionStats | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState<boolean>(true);

  useEffect(() => {
    if (!username) {
      console.log(username);
      redirect("/auth/login");
      return;
    }
    async function fetchProfile() {
      const prof = await getProfileWithStats(username as string);
      if (!prof) {
        redirect("/auth/feed");
        return;
      }
      setProfile(prof);
      setLoading(false);
      
      // Cargar predicciones del usuario
      try {
        const response = await fetch('/api/predictions');
        if (response.ok) {
          const data = await response.json();
          setPredictions(data.predictions || []);
          setPredictionStats(data.stats);
        }
      } catch (error) {
        console.error('Error cargando predicciones:', error);
      } finally {
        setLoadingPredictions(false);
      }
    }
    fetchProfile();
  }, [searchParams, username]);

  const getPredictionResult = (prediction: Prediction) => {
    if (prediction.is_correct === null) return 'Pendiente';
    return prediction.is_correct ? '✅ Correcta' : '❌ Incorrecta';
  };

  const getPredictionText = (prediction: Prediction) => {
    if (prediction.predicted_home_score > prediction.predicted_away_score) {
      return `Victoria ${prediction.matches.home_team}`;
    } else if (prediction.predicted_away_score > prediction.predicted_home_score) {
      return `Victoria ${prediction.matches.away_team}`;
    } else {
      return 'Empate';
    }
  };

  const getActualResult = (prediction: Prediction) => {
    if (prediction.matches.status !== 'finished' || 
        prediction.matches.home_score === null || 
        prediction.matches.away_score === null) {
      return 'Pendiente';
    }
    
    if (prediction.matches.home_score > prediction.matches.away_score) {
      return `${prediction.matches.home_score}-${prediction.matches.away_score} (${prediction.matches.home_team})`;
    } else if (prediction.matches.away_score > prediction.matches.home_score) {
      return `${prediction.matches.home_score}-${prediction.matches.away_score} (${prediction.matches.away_team})`;
    } else {
      return `${prediction.matches.home_score}-${prediction.matches.away_score} (Empate)`;
    }
  };

  if (loading || !profile) {
    return (
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="w-full flex-1">
            {/* Skeleton para ProfileCard */}
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Skeleton para Predicciones */}
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
              
              {/* Skeleton para estadísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
                  </div>
                ))}
              </div>

              {/* Skeleton para historial de predicciones */}
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                          <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        {[...Array(4)].map((_, j) => (
                          <div key={j} className="text-center">
                            <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton para Publicaciones */}
            <div className="space-y-6">
              <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skeleton para panel derecho */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="h-6 bg-gray-200 rounded w-24 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col items-center justify-center lg:flex-row gap-4 lg:gap-6">
       <div className="max-w-2xl flex-1">
       <div className="mb-8">
          <ProfileCard profile={profile} />
        </div>
        
        {/* Sección de Predicciones */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Mis Predicciones</h2>
          
          {predictionStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{predictionStats.totalPredictions}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{predictionStats.correctPredictions}</div>
                <div className="text-sm text-gray-600">Correctas</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{predictionStats.accuracy}%</div>
                <div className="text-sm text-gray-600">Precisión</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{predictionStats.totalPoints}</div>
                <div className="text-sm text-gray-600">Puntos</div>
              </div>
            </div>
          )}
          
          {loadingPredictions ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                        <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="text-center">
                          <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : predictions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tienes predicciones aún. ¡Ve a la página de partidos y haz tus primeras predicciones!
            </div>
          ) : (
            <div className="space-y-4">
              {predictions.map(prediction => (
                <div key={prediction.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{prediction.matches.home_team}</span>
                        <span className="text-gray-500">vs</span>
                        <span className="font-semibold">{prediction.matches.away_team}</span>
                        <span className="text-xs text-gray-500">({prediction.matches.league})</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(prediction.matches.match_date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold">Tu predicción</div>
                        <div className="text-blue-600">{getPredictionText(prediction)}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Resultado</div>
                        <div className="text-gray-600">{getActualResult(prediction)}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Estado</div>
                        <div className={prediction.is_correct === true ? 'text-green-600' : 
                                       prediction.is_correct === false ? 'text-red-600' : 'text-gray-600'}>
                          {getPredictionResult(prediction)}
                        </div>
                      </div>
                      {prediction.points_earned !== null && (
                        <div className="text-center">
                          <div className="font-semibold">Puntos</div>
                          <div className="text-orange-600 font-bold">{prediction.points_earned}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Publicaciones de @{profile.username}</h2>
          <PostsFeed userId={profile.id} showCreatePost={false} />
        </div>
       </div>
      </div>
    </div>
  )
} 