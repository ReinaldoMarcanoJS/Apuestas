"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Team {
  Competitions: unknown[];
  Id: number;
  Name: string;
  Image: string;
}

// interface Sport {
//   MatchesSport: boolean;
//   Id: number;
//   Name: string;
//   Image: string;
// }

interface Competition {
  Sport: unknown;
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

export function PopularMatches() {
  const [partidos, setPartidos] = useState<Matches>([]);
  const [loading, setLoading] = useState(true);
  const [predicciones, setPredicciones] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    fetch("/api/popular-matches")
      .then((res) => res.json())
      .then((data) => {
        // La respuesta es un array de partidos
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

  // const handleSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   // Ya no mostramos alert, solo se resalta el botón seleccionado
  // };

  return (
    <aside className="p-4 bg-white rounded-lg shadow space-y-4">
      <h3 className="text-lg font-bold">Partidos Populares</h3>
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-gray-100 animate-pulse flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="h-4 w-32 bg-gray-300 rounded" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="flex gap-2 mt-2">
                <div className="h-6 w-16 bg-gray-200 rounded" />
                <div className="h-6 w-16 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : partidos.length === 0 ? (
        <div>No hay partidos disponibles.</div>
      ) : (
        <ul className="space-y-4">
          {partidos.slice(0, 5).map((p) => (
            <li key={p.Id} className="flex flex-col gap-2 border-b pb-2">
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
              <form className="flex gap-2 items-center mt-1">
                <Button
                  type="button"
                  size="sm"
                  className={
                    `transition-all border-2 shadow-none ` +
                    (predicciones[p.Id] === "local"
                      ? "bg-gray-200 text-blue-700 font-bold"
                      : " bg-white text-gray-800 hover:bg-gray-100")
                  }
                  onClick={() => handlePrediccion(p.Id, "local")}
                >
                  {p.LocalTeam.Name}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={
                    `transition-all border-2 shadow-none ` +
                    (predicciones[p.Id] === "empate"
                      ? "bg-black text-white font-bold"
                      : " bg-black text-white/70 hover:text-white")
                  }
                  onClick={() => handlePrediccion(p.Id, "empate")}
                >
                  Empate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={
                    `transition-all border-2 shadow-none ` +
                    (predicciones[p.Id] === "visitante"
                      ? "bg-gray-200 text-blue-700 font-bold"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200")
                  }
                  onClick={() => handlePrediccion(p.Id, "visitante")}
                >
                  {p.AwayTeam.Name}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
} 