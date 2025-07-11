// /app/api/popular-matches/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const url = 'https://wosti-futbol-tv-spain.p.rapidapi.com/api/Events';
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': '00e227e8demsheeb740659153f65p131f13jsn8bbbf3b1cbf7',
      'x-rapidapi-host': 'wosti-futbol-tv-spain.p.rapidapi.com',
    },
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      console.error('Error en fetch:', response.status, response.statusText);
      return NextResponse.json({ error: 'Error al obtener partidos de Wosti Futbol TV Spain', status: response.status }, { status: 500 });
    }
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Error al parsear JSON:', parseError);
      return NextResponse.json({ error: 'Error al parsear la respuesta de la API', details: parseError?.toString(), raw: text }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en el endpoint /api/popular-matches:', error);
    return NextResponse.json({ error: 'Error al obtener partidos', details: error?.toString() }, { status: 500 });
  }
} 