'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';

/**
 * MÓDULO DE UTILIDADES Y RENTABILIDAD (v1.0.34)
 * Propósito: Comparar Ingresos vs Egresos para calcular la Utilidad Neta Real.
 * Incluye: Registro de gastos, balance por fechas y métricas de rentabilidad.
 */
export default function UtilidadesPage() {
  const [reporte, setReporte] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // --- ESTADOS DE FILTRO (Rango de fechas) ---
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); // 1ero del mes
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]); // Hoy

  // --- ESTADOS PARA NUEVO GASTO ---
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [nuevoGasto, setNuevoGasto] = useState({
    descripcion: '',
    monto: 0,
    categoria: 'OTROS',
    metodo_pago: 'EFECTIVO'
  });

  // --- 1. CARGA DE DATOS FINANCIEROS ---
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const data = await apiService.getReporteUtilidad(fechaInicio, fechaFin);
      setReporte(data);
    } catch (error) {
      console.error("Error al sincronizar utilidades:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [fechaInicio, fechaFin]);

  // --- 2. CÁLCULO DE TOTALES (BALANCE GLOBAL) ---
  const totales = useMemo(() => {
    return reporte.reduce((acc, curr) => ({
      ingresos: acc.ingresos + Number(curr.ingresos_totales),
      costos: acc.costos + Number(curr.costo_mercaderia),
      gastos: acc.gastos + Number(curr.egresos_operativos)
    }), { ingresos: 0, costos: 0, gastos: 0 });
  }, [reporte]);

  const utilidadBruta = totales.ingresos - totales.costos;
  const utilidadNeta = utilidadBruta - totales.gastos;

  // --- 3. GESTIÓN DE GASTOS ---
  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.registrarGasto(nuevoGasto);
      setShowModalGasto(false);
      setNuevoGasto({ descripcion: '', monto: 0, categoria: 'OTROS', metodo_pago: 'EFECTIVO' });
      cargarDatos(); // Refrescamos el balance
    } catch (error) {
      alert("Error al registrar el gasto");
    }
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-indigo-500 font-black tracking-widest uppercase animate-pulse">
      Calculando Rentabilidad Real...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* CABECERA */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Balance de Utilidades</h1>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Rentabilidad Neta • Nail-Store Trujillo</p>
        </div>
        <button 
          onClick={() => setShowModalGasto(true)}
          className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95"
        >
          💸 Registrar Gasto
        </button>
      </header>

      {/* FILTROS DE FECHA */}
      <section className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2.5rem] mb-10 flex flex-wrap items-center gap-6 shadow-inner">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-500 uppercase italic">Desde</span>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-500 uppercase italic">Hasta</span>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
        </div>
      </section>

      {/* TARJETAS DE INDICADORES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Ingresos Totales</p>
          <p className="text-3xl text-white font-black italic">S/ {totales.ingresos.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Costo Mercadería</p>
          <p className="text-3xl text-zinc-400 font-black italic">S/ {totales.costos.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-2">Gastos Operativos</p>
          <p className="text-3xl text-red-500 font-black italic">S/ {totales.gastos.toFixed(2)}</p>
        </div>

        <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-8 rounded-[2.5rem] shadow-lg shadow-emerald-500/5">
          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-2">Utilidad Neta (Real)</p>
          <p className="text-4xl text-emerald-400 font-black italic tracking-tighter">S/ {utilidadNeta.toFixed(2)}</p>
        </div>
      </div>

      {/* TABLA DE DETALLE DIARIO */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/60 border-b border-zinc-800">
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fecha</th>
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Ventas</th>
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Costo Prod.</th>
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center text-red-500">Gastos</th>
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Ganancia Real</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {reporte.map((dia, idx) => {
              const gananciaDia = (Number(dia.ingresos_totales) - Number(dia.costo_mercaderia)) - Number(dia.egresos_operativos);
              return (
                <tr key={idx} className="hover:bg-white/5 transition-all">
                  <td className="p-8 font-black text-white">{new Date(dia.fecha).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
                  <td className="p-8 text-center text-zinc-400">S/ {Number(dia.ingresos_totales).toFixed(2)}</td>
                  <td className="p-8 text-center text-zinc-600">S/ {Number(dia.costo_mercaderia).toFixed(2)}</td>
                  <td className="p-8 text-center text-red-500/70 font-bold">S/ {Number(dia.egresos_operativos).toFixed(2)}</td>
                  <td className={`p-8 text-right font-black italic text-lg ${gananciaDia >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                    S/ {gananciaDia.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL: REGISTRO DE GASTO OPERATIVO */}
      {showModalGasto && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <form onSubmit={guardarGasto} className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Registrar Egreso</h2>
              <button type="button" onClick={() => setShowModalGasto(false)} className="text-zinc-600 hover:text-white transition-colors text-3xl">✕</button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Descripción del Gasto</label>
                <input required placeholder="EJ: PAGO LUZ MAYO" value={nuevoGasto.descripcion} onChange={(e) => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-red-600 uppercase" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Monto (S/)</label>
                  <input type="number" step="0.01" required value={nuevoGasto.monto} onChange={(e) => setNuevoGasto({...nuevoGasto, monto: Number(e.target.value)})} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-red-600" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Categoría</label>
                  <select value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({...nuevoGasto, categoria: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-red-600">
                    <option value="ALQUILER">ALQUILER</option>
                    <option value="LUZ">LUZ</option>
                    <option value="AGUA">AGUA</option>
                    <option value="PERSONAL">PERSONAL</option>
                    <option value="MOVILIDAD">MOVILIDAD</option>
                    <option value="OTROS">OTROS</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white p-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20">
                Confirmar Pago de Gasto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}