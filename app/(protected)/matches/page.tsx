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
  LocalTeam: Team;
  AwayTeam: Team;
  Competition: Competition;
  Date: string;
  DateEnd?: string;
  Channels: Channel[];
  Id: number;
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
            <li key={p.Id} className="flex flex-col gap-2 border-b pb-4">
              <div className="flex justify-between items-center">
                <span>
                  {p.LocalTeam.Name} vs {p.AwayTeam.Name}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(p.Date).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>{p.Competition.Name}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs mt-1">
                {p.Channels.map((ch) => (
                  <span key={ch.Id} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                    {ch.Name}
                  </span>
                ))}
              </div>
              <form onSubmit={(e) => handleSubmit(e, p.Id)} className="flex gap-2 items-center mt-1">
                <label>
                  <input
                    type="radio"
                    name={`prediccion-${p.Id}`}
                    value="local"
                    checked={predicciones[p.Id] === "local"}
                    onChange={() => handlePrediccion(p.Id, "local")}
                  /> {p.LocalTeam.Name}
                </label>
                <label>
                  <input
                    type="radio"
                    name={`prediccion-${p.Id}`}
                    value="empate"
                    checked={predicciones[p.Id] === "empate"}
                    onChange={() => handlePrediccion(p.Id, "empate")}
                  /> Empate
                </label>
                <label>
                  <input
                    type="radio"
                    name={`prediccion-${p.Id}`}
                    value="visitante"
                    checked={predicciones[p.Id] === "visitante"}
                    onChange={() => handlePrediccion(p.Id, "visitante")}
                  /> {p.AwayTeam.Name}
                </label>
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                  type="submit"
                  disabled={!predicciones[p.Id]}
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