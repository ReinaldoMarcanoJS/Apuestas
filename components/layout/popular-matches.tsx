"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_logo?: string;
  away_logo?: string;
}
type Matches = Match[];

export function PopularMatches() {
  const [partidos, setPartidos] = useState<Matches>([]);
  const [loading, setLoading] = useState(true);
  const [predicciones, setPredicciones] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    fetch("/api/football-matches?limit=10")
      .then((res) => res.json())
      .then((data) => {
        // La nueva API devuelve { matches: [...] }
        setPartidos(Array.isArray(data.matches) ? data.matches : []);
        // Log para depuración de status
        if (Array.isArray(data.matches)) {
          console.log("Partidos recibidos:", data.matches.map((p: Match) => ({ id: p.id, status: p.status })));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar partidos desde la nueva API:", err);
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
        <>
          <ul className="space-y-4">
            {partidos
              .filter((p: Match) => p.status === "upcoming" || p.status === "live")
              .slice(0, 5)
              .map((p: Match) => (
                <li key={p.id} className="flex flex-col gap-2 border-b pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 min-w-0 flex-1 mr-2">
                      <div className="flex items-center min-w-0">
                        {p.home_logo && <Image src={p.home_logo} alt={p.home_team} width={20} height={20} className="inline h-5 w-5 mr-1 flex-shrink-0" />}
                        <span className="truncate text-sm font-medium" title={p.home_team}>{p.home_team}</span>
                      </div>
                      <span className="text-gray-500 mx-1 flex-shrink-0">vs</span>
                      <div className="flex items-center min-w-0">
                        {p.away_logo && <Image src={p.away_logo} alt={p.away_team} width={20} height={20} className="inline h-5 w-5 mr-1 flex-shrink-0" />}
                        <span className="truncate text-sm font-medium" title={p.away_team}>{p.away_team}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(p.match_date).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{p.league}</span>
                    {p.status && <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 text-xs">{p.status}</span>}
                  </div>
                  <form className="flex gap-2 items-center mt-1">
                    <Button
                      type="button"
                      size="sm"
                      className={
                        `transition-all border-2 shadow-none min-w-0 flex-1 ` +
                        (predicciones[p.id] === "local"
                          ? "bg-gray-200 text-blue-700 font-bold"
                          : " bg-white text-gray-800 hover:bg-gray-100")
                      }
                      onClick={() => handlePrediccion(p.id, "local")}
                      title={p.home_team}
                    >
                      <span className="truncate">{p.home_team}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className={
                        `transition-all border-2 shadow-none flex-shrink-0 ` +
                        (predicciones[p.id] === "empate"
                          ? "bg-black text-white font-bold"
                          : " bg-black text-white/70 hover:text-white")
                      }
                      onClick={() => handlePrediccion(p.id, "empate")}
                    >
                      Empate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className={
                        `transition-all border-2 shadow-none min-w-0 flex-1 ` +
                        (predicciones[p.id] === "visitante"
                          ? "bg-gray-200 text-blue-700 font-bold"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200")
                      }
                      onClick={() => handlePrediccion(p.id, "visitante")}
                      title={p.away_team}
                    >
                      <span className="truncate">{p.away_team}</span>
                    </Button>
                  </form>
                </li>
              ))}
          </ul>
        </>
      )}
    </aside>
  );
} 