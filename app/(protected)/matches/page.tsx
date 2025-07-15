"use client";
import React, { useEffect, useState } from "react";

interface Team {
  Competitions: any[];
  Id: number;
  Name: string;
  Image: string;
}

interface Sport {
  MatchesSport: boolean;
  Id: number;
  Name: string;
  Image: string;
}

interface Competition {
  Sport: Sport;
  Id: number;
  Name: string;
  Image: string;
}

interface Channel {
  Aljazeera: boolean;
  Id: number;
  Name: string;
  Image: string;
}

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
  updated_at: string;
}

type Matches = Match[];

export default function MatchesPage() {
  const [partidos, setPartidos] = useState<Matches>([]);
  const [loading, setLoading] = useState(true);
  const [predicciones, setPredicciones] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    fetch("/api/popular-matches")
      .then((res) => res.json())
      .then((data) => {
        setPartidos(Array.isArray(data) ? data : data.Events || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar partidos desde tu backend:", err);
        setLoading(false);
      });
  }, []);

  const handlePrediccion = (id: number, value: string) => {
    setPredicciones((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent, id: number) => {
    e.preventDefault();
    alert(`Tu predicción para el partido ${id} fue: ${predicciones[id]}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Todos los Partidos</h1>
      {loading ? (
        <div className="space-y-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-gray-100 animate-pulse flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="h-4 w-40 bg-gray-300 rounded" />
                <div className="h-3 w-20 bg-gray-200 rounded" />
              </div>
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="flex gap-2 mt-2">
                <div className="h-6 w-20 bg-gray-200 rounded" />
                <div className="h-6 w-20 bg-gray-200 rounded" />
                <div className="h-6 w-20 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : partidos.length === 0 ? (
        <div>No hay partidos disponibles.</div>
      ) : (
        <ul className="space-y-6">
          {partidos.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 border-b pb-4">
              <div className="flex justify-between items-center">
                <span>
                  {p.home_team} vs {p.away_team}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(p.match_date).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>{p.league}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs mt-1">
                {/* Assuming p.Channels is not directly available in the Match interface,
                    but if it were, you would map it here. For now, it's commented out. */}
                {/* {p.Channels.map((ch) => (
                  <span key={ch.Id} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                    {ch.Name}
                  </span>
                ))} */}
              </div>
              <form onSubmit={(e) => handleSubmit(e, parseInt(p.id, 10))} className="flex gap-2 items-center mt-1">
                <label>
                  <input
                    type="radio"
                    name={`prediccion-${p.id}`}
                    value="local"
                    checked={predicciones[parseInt(p.id, 10)] === "local"}
                    onChange={() => handlePrediccion(parseInt(p.id, 10), "local")}
                  /> {p.home_team}
                </label>
                <label>
                  <input
                    type="radio"
                    name={`prediccion-${p.id}`}
                    value="empate"
                    checked={predicciones[parseInt(p.id, 10)] === "empate"}
                    onChange={() => handlePrediccion(parseInt(p.id, 10), "empate")}
                  /> Empate
                </label>
                <label>
                  <input
                    type="radio"
                    name={`prediccion-${p.id}`}
                    value="visitante"
                    checked={predicciones[parseInt(p.id, 10)] === "visitante"}
                    onChange={() => handlePrediccion(parseInt(p.id, 10), "visitante")}
                  /> {p.away_team}
                </label>
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                  type="submit"
                  disabled={!predicciones[parseInt(p.id, 10)]}
                >
                  Votar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 