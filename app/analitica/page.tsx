'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';

export default function AnaliticaBIPage() {
  const [dataBI, setDataBI] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  
  // Por defecto analizamos el mes actual
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toLocaleDateString('en-CA');
  const diaActual = hoy.toLocaleDateString('en-CA');
  
  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(diaActual);

  const procesarAnalitica = async () => {
    setCargando(true);
    try {
      const response = await apiService.getAnaliticaBI(desde, hasta);
      setDataBI(response);
    } catch (error) {
      console.error("Error al cargar BI:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    procesarAnalitica();
  }, []);

  if (cargando && !dataBI) {
    return <div className="flex h-screen items-center justify-center bg-zinc-950 text-indigo-500 font-black tracking-widest uppercase animate-pulse">Procesando Algoritmos BI...</div>;
  }

  // Filtrado de cuadrantes para fácil renderizado
  const estrellas = dataBI?.matriz.filter((p: any) => p.cuadrante === 'ESTRELLA') || [];
  const vacas = dataBI?.matriz.filter((p: any) => p.cuadrante === 'VACA') || [];
  const interrogantes = dataBI?.matriz.filter((p: any) => p.cuadrante === 'INTERROGANTE') || [];
  const perros = dataBI?.matriz.filter((p: any) => p.cuadrante === 'PERRO') || [];

  return (
    <div className="p-4 lg:p-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* 1. CABECERA Y FILTROS */}
      <header className="mb-6 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 text-white">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
            Inteligencia de Negocio
          </h1>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Matriz de Rentabilidad BCG • Rankings</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="bg-black border border-zinc-700 p-2 rounded-lg text-xs font-black uppercase outline-none focus:border-indigo-500" />
          <span className="font-black text-zinc-600">-</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="bg-black border border-zinc-700 p-2 rounded-lg text-xs font-black uppercase outline-none focus:border-indigo-500" />
          <button onClick={procesarAnalitica} disabled={cargando} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all">
            {cargando ? '...' : 'ANALIZAR'}
          </button>
        </div>
      </header>

      {/* 2. KPIs GLOBALES (PUNTO DE CORTE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Ingresos del Periodo</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">S/ {dataBI?.resumen.ingresos.toFixed(2)}</p>
          </div>
          <div className="text-3xl opacity-50">💰</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Ticket Promedio</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">S/ {dataBI?.resumen.ticket_promedio.toFixed(2)}</p>
          </div>
          <div className="text-3xl opacity-50">🛒</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Margen Promedio Global</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{dataBI?.resumen.margen_global.toFixed(2)}%</p>
          </div>
          <div className="text-3xl opacity-50">📈</div>
        </div>
      </div>

      {/* 3. MATRIZ DE RENTABILIDAD (CUADRANTES BCG) */}
      <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase italic mb-3">Matriz de Rendimiento de Inventario</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        
        {/* CUADRANTE 1: ESTRELLAS */}
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-500/30 rounded-2xl p-4 flex flex-col h-72">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-emerald-200 dark:border-emerald-800/50">
            <div>
              <h3 className="text-emerald-700 dark:text-emerald-400 font-black uppercase flex items-center gap-2">⭐ Estrellas <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 px-2 py-0.5 rounded text-emerald-900 dark:text-emerald-200">{estrellas.length}</span></h3>
              <p className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-500/70 uppercase">Alta Rotación • Alto Margen (¡Invierte aquí!)</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {estrellas.map((p: any) => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 p-2 rounded shadow-sm border border-emerald-100 dark:border-emerald-800/30 flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 truncate w-1/2">{p.nombre}</span>
                <span className="text-[10px] font-bold text-zinc-500">{p.cantidad} unid</span>
                <span className="text-[10px] font-black text-emerald-600">{p.margen_porcentaje}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* CUADRANTE 2: INTERROGANTES */}
        <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col h-72">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-amber-200 dark:border-amber-800/50">
            <div>
              <h3 className="text-amber-700 dark:text-amber-400 font-black uppercase flex items-center gap-2">❓ Interrogantes <span className="text-[10px] bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded text-amber-900 dark:text-amber-200">{interrogantes.length}</span></h3>
              <p className="text-[9px] font-bold text-amber-600/70 dark:text-amber-500/70 uppercase">Baja Rotación • Alto Margen (Haz combos o promos)</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {interrogantes.map((p: any) => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 p-2 rounded shadow-sm border border-amber-100 dark:border-amber-800/30 flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 truncate w-1/2">{p.nombre}</span>
                <span className="text-[10px] font-bold text-zinc-500">{p.cantidad} unid</span>
                <span className="text-[10px] font-black text-amber-600">{p.margen_porcentaje}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* CUADRANTE 3: VACAS LECHERAS */}
        <div className="bg-indigo-50 dark:bg-indigo-900/10 border-2 border-indigo-500/30 rounded-2xl p-4 flex flex-col h-72">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-indigo-200 dark:border-indigo-800/50">
            <div>
              <h3 className="text-indigo-700 dark:text-indigo-400 font-black uppercase flex items-center gap-2">🐄 Vacas Lecheras <span className="text-[10px] bg-indigo-200 dark:bg-indigo-800 px-2 py-0.5 rounded text-indigo-900 dark:text-indigo-200">{vacas.length}</span></h3>
              <p className="text-[9px] font-bold text-indigo-600/70 dark:text-indigo-500/70 uppercase">Alta Rotación • Bajo Margen (Pagan las cuentas fijas)</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {vacas.map((p: any) => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 p-2 rounded shadow-sm border border-indigo-100 dark:border-indigo-800/30 flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 truncate w-1/2">{p.nombre}</span>
                <span className="text-[10px] font-bold text-indigo-500">{p.cantidad} unid</span>
                <span className="text-[10px] font-black text-zinc-500">{p.margen_porcentaje}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* CUADRANTE 4: PERROS */}
        <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-500/30 rounded-2xl p-4 flex flex-col h-72">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-red-200 dark:border-red-800/50">
            <div>
              <h3 className="text-red-700 dark:text-red-400 font-black uppercase flex items-center gap-2">🐕 Perros <span className="text-[10px] bg-red-200 dark:bg-red-800 px-2 py-0.5 rounded text-red-900 dark:text-red-200">{perros.length}</span></h3>
              <p className="text-[9px] font-bold text-red-600/70 dark:text-red-500/70 uppercase">Baja Rotación • Bajo Margen (Liquida y no recompres)</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {perros.map((p: any) => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 p-2 rounded shadow-sm border border-red-100 dark:border-red-800/30 flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 truncate w-1/2">{p.nombre}</span>
                <span className="text-[10px] font-bold text-zinc-500">{p.cantidad} unid</span>
                <span className="text-[10px] font-black text-red-500">{p.margen_porcentaje}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. RANKING DUAL (VOLUMEN VS RENTABILIDAD) */}
      <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase italic mb-3">Ranking Top 10 Estratégico</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* RANKING VOLUMEN */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-zinc-100 dark:bg-black/60 p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-black uppercase text-[11px] text-zinc-600 dark:text-zinc-400">🏆 Top Volumen (Los más llevados)</h3>
          </div>
          <table className="w-full text-left">
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {dataBI?.ranking_volumen.map((p: any, i: number) => (
                <tr key={p.id} className="text-[10px]">
                  <td className="p-3 font-black text-zinc-400 w-8">#{i + 1}</td>
                  <td className="p-3 font-bold text-zinc-900 dark:text-white truncate max-w-[150px]">{p.nombre}</td>
                  <td className="p-3 text-right font-black text-indigo-600 dark:text-indigo-400">{p.cantidad} unid</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RANKING RENTABILIDAD */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-zinc-100 dark:bg-black/60 p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-black uppercase text-[11px] text-zinc-600 dark:text-zinc-400">💸 Top Rentabilidad (Los que dejan más dinero)</h3>
          </div>
          <table className="w-full text-left">
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {dataBI?.ranking_rentabilidad.map((p: any, i: number) => (
                <tr key={p.id} className="text-[10px]">
                  <td className="p-3 font-black text-zinc-400 w-8">#{i + 1}</td>
                  <td className="p-3 font-bold text-zinc-900 dark:text-white truncate max-w-[150px]">{p.nombre}</td>
                  <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">S/ {p.utilidad_neta.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}