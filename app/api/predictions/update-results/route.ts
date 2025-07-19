import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

// POST: Actualizar resultados de predicciones
export async function POST() {
  try {
    const supabase = await createClient()
    
    // Obtener partidos finalizados que no han sido procesados
    const { data: finishedMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'finished')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)

    if (matchesError) {
      return NextResponse.json({ error: 'Error obteniendo partidos finalizados', details: matchesError.message }, { status: 500 })
    }

    let updatedCount = 0

    for (const match of finishedMatches || []) {
      // Obtener todas las predicciones para este partido
      const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('*')
        .eq('match_id', match.id)
        .is('is_correct', null) // Solo predicciones no procesadas

      if (predError) {
        console.error(`Error obteniendo predicciones para partido ${match.id}:`, predError)
        continue
      }

      for (const prediction of predictions || []) {
        // Determinar resultado real
        let actualResult: 'local' | 'visitante' | 'empate'
        if (match.home_score > match.away_score) {
          actualResult = 'local'
        } else if (match.away_score > match.home_score) {
          actualResult = 'visitante'
        } else {
          actualResult = 'empate'
        }

        // Determinar predicción del usuario
        let userPrediction: 'local' | 'visitante' | 'empate'
        if (prediction.predicted_home_score > prediction.predicted_away_score) {
          userPrediction = 'local'
        } else if (prediction.predicted_away_score > prediction.predicted_home_score) {
          userPrediction = 'visitante'
        } else {
          userPrediction = 'empate'
        }

        // Calcular si la predicción es correcta
        const isCorrect = userPrediction === actualResult
        
        // Calcular puntos (3 por predicción correcta, 0 por incorrecta)
        let pointsEarned = 0
        if (isCorrect) {
          pointsEarned = 3
          // Bonus por predicción exacta del marcador
          if (prediction.predicted_home_score === match.home_score && 
              prediction.predicted_away_score === match.away_score) {
            pointsEarned += 1
          }
        }

        // Actualizar predicción
        const { error: updateError } = await supabase
          .from('predictions')
          .update({
            is_correct: isCorrect,
            points_earned: pointsEarned
          })
          .eq('id', prediction.id)

        if (updateError) {
          console.error(`Error actualizando predicción ${prediction.id}:`, updateError)
        } else {
          updatedCount++
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Actualizadas ${updatedCount} predicciones`,
      processedMatches: finishedMatches?.length || 0
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
} 