import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

function getTodayDateString() {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Mapea el status de la API a los valores permitidos por la base de datos
function mapStatus(apiStatus: string): 'upcoming' | 'live' | 'finished' {
  if ([
    'NS', 'TBD', '1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'INT', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'BT', 'BREAK', 'IN PROGRESS'
  ].includes(apiStatus)) return 'live';
  if ([
    'FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO', 'POSTP', 'SUSP', 'INT', 'BREAK', 'FT_PEN', 'FT_AET'
  ].includes(apiStatus)) return 'finished';
  return 'upcoming';
}

const REQUEST_LIMIT_PER_DAY = 100;
const MIN_INTERVAL_MINUTES = 15;

export async function GET(request: Request) {
  const supabase = await createClient();
  const today = getTodayDateString();

  // Leer paginación de la query
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  // 0. Verificar cuántas peticiones se han hecho hoy
  const { data: requestsToday, error: reqError } = await supabase
    .from('api_football_requests')
    .select('requested_at')
    .gte('requested_at', today + 'T00:00:00Z')
    .lt('requested_at', today + 'T23:59:59Z');
  if (reqError) {
    return NextResponse.json({ step: 'request_count', error: 'Error consultando requests', details: reqError.message }, { status: 500 });
  }
  const requestsCount = requestsToday?.length || 0;
  const lastRequest = requestsToday && requestsToday.length > 0
    ? new Date(requestsToday[requestsToday.length - 1].requested_at)
    : null;

  // 1. Buscar partidos del día en la base de datos (con paginación)
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .gte('match_date', today + 'T00:00:00Z')
    .lt('match_date', today + 'T23:59:59Z')
    .order('match_date', { ascending: true })
    .range(offset, offset + limit - 1);

  // 2. Buscar ligas del día en la base de datos
  const { data: leagues, error: leaguesError } = await supabase
    .from('leagues')
    .select('*');

  if (matchesError || leaguesError) {
    return NextResponse.json({ step: 'db_query', error: 'Error consultando la base de datos', details: matchesError?.message || leaguesError?.message }, { status: 500 });
  }

  // 3. Lógica de rate limit y caché
  const now = new Date();
  let canRequest = true;
  if (requestsCount >= REQUEST_LIMIT_PER_DAY) {
    canRequest = false;
  } else if (lastRequest) {
    const diffMinutes = (now.getTime() - lastRequest.getTime()) / (1000 * 60);
    if (diffMinutes < MIN_INTERVAL_MINUTES) {
      canRequest = false;
    }
  }

  // Si hay datos en la base de datos, respóndelos rápido y pon cache HTTP
  if (matches && matches.length > 0) {
    const res = NextResponse.json({ step: 'db_cache', matches, leagues, requestsCount, lastRequest });
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  }

  if (!canRequest) {
    // No se puede hacer fetch externo y no hay datos
    const res = NextResponse.json({ step: 'db_cache_empty', matches: [], leagues, requestsCount, lastRequest });
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  }

  // 4. Si se puede hacer petición, primero borrar partidos y ligas viejos
  // await supabase.from('matches').delete().neq('id', ''); // Eliminado
  // await supabase.from('leagues').delete().neq('id', ''); // Eliminado

  // 5. Hacer petición a la API externa
  const apiKey = process.env.FOOTBALL_API_KEY || '9a0913f697bcaf1fb594b9bbd41be687';
  const apiHost = 'v3.football.api-sports.io';
  const todayParam = today;
  const url = `https://v3.football.api-sports.io/fixtures?date=${todayParam}`;

  let response, data;
  try {
    response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
        'x-rapidapi-host': apiHost,
      },
    });
  } catch (err) {
    return NextResponse.json({ step: 'api_fetch', error: 'Error al hacer fetch a la API externa', details: err?.toString() }, { status: 500 });
  }
  if (!response.ok) {
    return NextResponse.json({ step: 'api_response', error: 'Error al obtener partidos de la API externa', status: response.status }, { status: 500 });
  }
  try {
    data = await response.json();
  } catch (err) {
    return NextResponse.json({ step: 'api_json', error: 'Error al parsear JSON de la API externa', details: err?.toString() }, { status: 500 });
  }
  const apiMatches = data.response || [];

  // Extraer y guardar ligas únicas
  const uniqueLeagues: Record<number, { id: number; name: string; logo: string; country: string; season: number }> = {};
  (apiMatches as Array<{
    league: { id: number; name: string; logo: string; country: string; season: number }
  }>).forEach((m) => {
    const l = m.league;
    uniqueLeagues[l.id] = {
      id: l.id,
      name: l.name,
      logo: l.logo,
      country: l.country,
      season: l.season,
    };
  });
  const leaguesArr = Object.values(uniqueLeagues);

  // Guardar ligas (ignorar duplicados)
  for (const league of leaguesArr) {
    const { error: leagueError } = await supabase.from('leagues').upsert(league, { onConflict: 'id' });
    if (leagueError) {
      return NextResponse.json({ step: 'league_upsert', error: 'Error guardando liga', details: leagueError.message, league }, { status: 500 });
    }
  }

  // Guardar partidos usando external_id y mapeando status, logos y timestamp
  for (const m of apiMatches as Array<{
    fixture: { id: number; date: string; timestamp: number; status: { short: string } }
    teams: { home: { name: string; logo: string }; away: { name: string; logo: string } }
    league: { name: string }
    goals: { home: number | null; away: number | null }
  }>) {
    const mappedStatus = mapStatus(m.fixture.status.short);
    const { error: matchError } = await supabase.from('matches').upsert({
      external_id: m.fixture.id,
      home_team: m.teams.home.name,
      away_team: m.teams.away.name,
      league: m.league.name,
      match_date: m.fixture.date,
      status: mappedStatus,
      home_score: m.goals.home,
      away_score: m.goals.away,
      home_logo: m.teams.home.logo,
      away_logo: m.teams.away.logo,
      start_timestamp: m.fixture.timestamp,
      api_status: m.fixture.status.short,
    }, { onConflict: 'external_id' });
    if (matchError) {
      return NextResponse.json({ step: 'match_upsert', error: 'Error guardando partido', details: matchError.message, match: m, mappedStatus }, { status: 500 });
    }
  }

  // Registrar la petición
  await supabase.from('api_football_requests').insert({});

  // Al final, después de guardar, consulta de nuevo con paginación
  const { data: savedMatches, error: savedMatchesError } = await supabase
    .from('matches')
    .select('*')
    .gte('match_date', today + 'T00:00:00Z')
    .lt('match_date', today + 'T23:59:59Z')
    .order('match_date', { ascending: true })
    .range(offset, offset + limit - 1);
  const { data: savedLeagues, error: savedLeaguesError } = await supabase
    .from('leagues')
    .select('*');

  if (savedMatchesError || savedLeaguesError) {
    return NextResponse.json({ step: 'final_query', error: 'Error consultando partidos/ligas guardados', details: savedMatchesError?.message || savedLeaguesError?.message }, { status: 500 });
  }

  const res = NextResponse.json({ step: 'success', matches: savedMatches, leagues: savedLeagues, requestsCount: requestsCount + 1 });
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res;
} 