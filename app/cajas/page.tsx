'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';

/**
 * MÓDULO DE GESTIÓN DE CAJAS (AUDITORÍA FINANCIERA)
 * Propósito: Visualizar el historial de turnos, saldos y reportes de productos.
 */
export default function HistorialCajas() {
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  
  // Estados para el reporte detallado (Modal)
  const [showReporte, setShowReporte] = useState(false);
  const [reporteData, setReporteData] = useState<any>(null);
  const [cargandoReporte, setCargandoReporte] = useState(false);

  // --- 1. CARGA DE DATOS ---
  const cargarHistorial = async () => {
    try {
      const data = await apiService.getHistorialCajas();
      setHistorial(data);
    } catch (error) {
      console.error("Error al sincronizar historial:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarHistorial(); }, []);

  // --- 2. LÓGICA DE FILTRADO ---
  const historialFiltrado = useMemo(() => {
    return historial.filter(item => 
      item.fecha_apertura.includes(filtro) || item.estado.toLowerCase().includes(filtro.toLowerCase())
    );
  }, [filtro, historial]);

  // --- 3. GESTIÓN DE REPORTES ---
  const verReporteProductos = async (sesionId: string) => {
    setCargandoReporte(true);
    setShowReporte(true);
    try {
      const data = await apiService.getReporteProductosPorTurno(sesionId);
      setReporteData(data);
    } catch (error) {
      alert("Error al cargar el detalle de productos");
    } finally {
      setCargandoReporte(false);
    }
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-indigo-500 font-black tracking-widest uppercase animate-pulse">
      Cargando Historial...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* CABECERA DE ESTADÍSTICAS (Estilo Dashboard) */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Control de Cajas</h1>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Auditoría de Turnos • Trujillo Centro</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 px-6 py-4 rounded-2xl text-right backdrop-blur-md">
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Turnos Cerrados</p>
            <p className="text-xl text-white font-black">{historial.length}</p>
          </div>
        </div>
      </header>

      {/* FILTROS Y BÚSQUEDA */}
      <section className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem] mb-8 flex gap-4">
        <input 
          type="date" 
          onChange={(e) => setFiltro(e.target.value)}
          className="bg-black border border-zinc-800 p-4 rounded-xl text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all" 
        />
        <input 
          placeholder="BUSCAR POR ESTADO..." 
          value={filtro}
          onChange={(e) => setFiltro(e.target.value.toUpperCase())}
          className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all uppercase" 
        />
      </section>

      {/* TABLA DE HISTORIAL (Basada en tu imagen de referencia) */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/60 border-b border-zinc-800">
              <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Apertura / Cierre</th>
              <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Saldo Inicial</th>
              <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Saldo Final</th>
              <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Estado</th>
              <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {historialFiltrado.map((caja) => (
              <tr key={caja.id} className="hover:bg-white/5 transition-colors group">
                <td className="p-6">
                  <p className="text-sm font-black text-white">{new Date(caja.fecha_apertura).toLocaleString('es-PE')}</p>
                  <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase italic">
                    {caja.fecha_cierre ? new Date(caja.fecha_cierre).toLocaleString('es-PE') : '---'}
                  </p>
                </td>
                <td className="p-6 text-center font-mono text-zinc-400">S/ {Number(caja.monto_inicial).toFixed(2)}</td>
                <td className="p-6 text-center font-mono font-black text-emerald-400">
                  S/ {Number(caja.saldo_final_efectivo || 0).toFixed(2)}
                </td>
                <td className="p-6 text-center">
                  <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                    caja.estado === 'CERRADA' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse'
                  }`}>
                    {caja.estado}
                  </span>
                </td>
                <td className="p-6 text-center space-x-2">
                  <button 
                    onClick={() => verReporteProductos(caja.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black rounded-lg uppercase tracking-widest transition-all active:scale-95"
                  >
                    Reporte Productos
                  </button>
                  <button 
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] font-black rounded-lg uppercase tracking-widest transition-all"
                  >
                    Reporte General
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE REPORTE DETALLADO (Productos y Clientes) */}
      {showReporte && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Detalle del Turno</h2>
                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mt-1">Desglose de productos y clientes</p>
              </div>
              <button onClick={() => setShowReporte(false)} className="text-zinc-500 hover:text-white transition-colors text-2xl">✕</button>
            </div>

            {cargandoReporte ? (
              <div className="text-center py-20 animate-pulse text-indigo-400 font-black">PROCESANDO REPORTE...</div>
            ) : (
              <div className="space-y-6">
                <div className="max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-zinc-900">
                      <tr className="text-[10px] text-zinc-500 uppercase font-black border-b border-zinc-800">
                        <th className="pb-4">Producto</th>
                        <th className="pb-4 text-center">Cant</th>
                        <th className="pb-4 text-center">Precio</th>
                        <th className="pb-4 text-center">Total</th>
                        <th className="pb-4 text-right">Cliente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {reporteData?.map((item: any, idx: number) => (
                        <tr key={idx} className="text-xs">
                          <td className="py-4 font-bold text-white uppercase">{item.producto}</td>
                          <td className="py-4 text-center text-zinc-400 font-black">{item.cantidad}</td>
                          <td className="py-4 text-center text-zinc-400">S/ {item.precio_venta.toFixed(2)}</td>
                          <td className="py-4 text-center text-emerald-400 font-black">S/ {item.total.toFixed(2)}</td>
                          <td className="py-4 text-right text-indigo-400 font-bold uppercase">{item.cliente}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-6 bg-black rounded-3xl border border-zinc-800 flex justify-between items-center">
                    <p className="text-zinc-500 text-[10px] font-black uppercase">Ventas Totales en Productos</p>
                    <p className="text-3xl font-black text-white italic">
                        S/ {reporteData?.reduce((acc: number, cur: any) => acc + cur.total, 0).toFixed(2)}
                    </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}