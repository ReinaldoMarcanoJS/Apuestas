import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

// POST: Guardar predicción
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { matchId, prediction } = await request.json()
    
    if (!matchId || !prediction) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Verificar que el partido existe y no ha comenzado
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }

    if (match.status !== 'upcoming') {
      return NextResponse.json({ error: 'No se puede predecir un partido que ya comenzó' }, { status: 400 })
    }

    // Guardar o actualizar predicción
    const { data, error } = await supabase
      .from('predictions')
      .upsert({
        user_id: user.id,
        match_id: matchId,
        predicted_home_score: prediction === 'local' ? 1 : 0,
        predicted_away_score: prediction === 'visitante' ? 1 : 0,
        confidence: 5, // Valor por defecto
      }, {
        onConflict: 'user_id,match_id'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error guardando predicción', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, prediction: data })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// GET: Obtener predicciones del usuario
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        matches (
          id,
          home_team,
          away_team,
          home_score,
          away_score,
          status,
          match_date,
          league
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Error obteniendo predicciones', details: error.message }, { status: 500 })
    }

    // Calcular estadísticas
    const totalPredictions = predictions?.length || 0
    const correctPredictions = predictions?.filter(p => p.is_correct === true).length || 0
    const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0
    const totalPoints = predictions?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0

    return NextResponse.json({
      predictions,
      stats: {
        totalPredictions,
        correctPredictions,
        accuracy: Math.round(accuracy * 100) / 100,
        totalPoints
      }
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
} 