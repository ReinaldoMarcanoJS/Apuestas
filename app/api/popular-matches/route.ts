// /app/api/popular-matches/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

function getTodayDateString() {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET() {
  const url=process.env.POPULAR_MATCHES_API_URL
  const apiKey=process.env.POPULAR_MATCHES_API_KEY
  const apiHost=process.env.POPULAR_MATCHES_API_HOST

  if (!url || !apiKey || !apiHost) {
    return NextResponse.json({ error: 'Faltan variables de entorno para la API de partidos populares.' }, { status: 500 });
  }

  const supabase = await createClient();
  const today = getTodayDateString();

  // Buscar si ya hay datos para hoy
  const { data: existing, error: fetchError } = await supabase
    .from('daily_matches')
    .select('data')
    .eq('date', today)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // Error inesperado
    return NextResponse.json({ error: 'Error consultando la base de datos', details: fetchError.message }, { status: 500 });
  }

  if (existing) {
    // Ya hay datos para hoy
    return NextResponse.json(existing.data);
  }

  // Si no hay datos, pedir a la API externa
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': apiHost,
    },
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return NextResponse.json({ error: 'Error al obtener partidos de la API externa', status: response.status }, { status: 500 });
    }
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json({ error: 'Error al parsear la respuesta de la API', details: parseError?.toString(), raw: text }, { status: 500 });
    }
    // Guardar en la base de datos
    const { error: insertError } = await supabase
      .from('daily_matches')
      .insert({ date: today, data });
    if (insertError) {
      // Si el error es por restricción UNIQUE, leer el registro existente y devolverlo
      if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
        const { data: alreadySaved } = await supabase
          .from('daily_matches')
          .select('data')
          .eq('date', today)
          .single();
        if (alreadySaved) {
          return NextResponse.json(alreadySaved.data);
        }
      }
      return NextResponse.json({ error: 'Error guardando los partidos en la base de datos', details: insertError.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener partidos', details: error?.toString() }, { status: 500 });
  }
} 