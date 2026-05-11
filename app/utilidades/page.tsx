'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
import { useRouter } from 'next/navigation';

/**
 * MÓDULO DE UTILIDADES Y RENTABILIDAD (v1.0.37)
 * Propósito: Comparar Ingresos vs Egresos para calcular la Utilidad Neta Real.
 * Actualización: Inclusión de selector de medio de pago y manejo de sesión expirada.
 */
export default function UtilidadesPage() {
  const router = useRouter();
  const [reporte, setReporte] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // --- ESTADOS DE FILTRO (Rango de fechas) ---
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); 
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]); 

  // --- ESTADOS PARA NUEVO GASTO ---
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [nuevoGasto, setNuevoGasto] = useState({
    descripcion: '',
    monto: 0,
    categoria: 'OTROS',
    metodo_pago: 'EFECTIVO' // Este valor es crítico para el backend
  });

  // --- 1. CARGA DE DATOS FINANCIEROS ---
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const data = await apiService.getReporteUtilidad(fechaInicio, fechaFin);
      setReporte(data);
    } catch (error: any) {
      console.error("Error al sincronizar utilidades:", error);
      // Si el error es de autorización (401), redirigimos al login
      if (error.message.includes('SESIÓN EXPIRADA')) {
        alert("Su sesión ha expirado. Por favor, inicie sesión nuevamente.");
        router.push('/login');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [fechaInicio, fechaFin]);

  // --- 2. CÁLCULO DE TOTALES ---
  const totales = useMemo(() => {
    return reporte.reduce((acc, curr) => ({
      ingresos: acc.ingresos + Number(curr.ingresos_totales),
      costos: acc.costos + Number(curr.costo_mercaderia),
      gastos: acc.gastos + Number(curr.egresos_operativos)
    }), { ingresos: 0, costos: 0, gastos: 0 });
  }, [reporte]);

  const utilidadBruta = totales.ingresos - totales.costos;
  const utilidadNeta = utilidadBruta - totales.gastos;

  // --- 3. GESTIÓN DE GASTOS (CON VALIDACIÓN MEJORADA) ---
  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación de seguridad antes de enviar
    if (nuevoGasto.monto <= 0) {
      alert("El monto debe ser mayor a cero");
      return;
    }

    try {
      await apiService.registrarGasto(nuevoGasto);
      setShowModalGasto(false);
      // Reset del formulario incluyendo el medio de pago por defecto
      setNuevoGasto({ descripcion: '', monto: 0, categoria: 'OTROS', metodo_pago: 'EFECTIVO' });
      cargarDatos(); 
    } catch (error: any) {
      alert(`Error al registrar el gasto: ${error.message || 'Error interno del servidor'}`);
    }
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-500 font-black tracking-widest uppercase animate-pulse transition-colors duration-300">
      Calculando Rentabilidad Real...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700 transition-colors duration-300">
      
      {/* CABECERA */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic transition-colors">Balance de Utilidades</h1>
          <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic transition-colors">Rentabilidad Neta • Nail-Store Trujillo</p>
        </div>
        <button 
          onClick={() => setShowModalGasto(true)}
          className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95"
        >
          💸 Registrar Gasto
        </button>
      </header>

      {/* FILTROS DE FECHA */}
      <section className="bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2.5rem] mb-10 flex flex-wrap items-center gap-6 shadow-inner transition-colors">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase italic transition-colors">Desde</span>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-zinc-900 dark:text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase italic transition-colors">Hasta</span>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-zinc-900 dark:text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
        </div>
      </section>

      {/* TARJETAS DE INDICADORES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] transition-colors shadow-sm dark:shadow-none">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest mb-2 transition-colors">Ingresos Totales</p>
          <p className="text-3xl text-zinc-900 dark:text-white font-black italic transition-colors">S/ {totales.ingresos.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] transition-colors shadow-sm dark:shadow-none">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest mb-2 transition-colors">Costo Mercadería</p>
          <p className="text-3xl text-zinc-500 dark:text-zinc-400 font-black italic transition-colors">S/ {totales.costos.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] transition-colors shadow-sm dark:shadow-none">
          <p className="text-[10px] text-red-600 dark:text-red-500 font-black uppercase tracking-widest mb-2 transition-colors">Gastos Operativos</p>
          <p className="text-3xl text-red-600 dark:text-red-500 font-black italic transition-colors">S/ {totales.gastos.toFixed(2)}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500/20 dark:border-emerald-500/30 p-8 rounded-[2.5rem] shadow-lg shadow-emerald-500/5 transition-colors">
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-widest mb-2 transition-colors">Utilidad Neta (Real)</p>
          <p className="text-4xl text-emerald-600 dark:text-emerald-400 font-black italic tracking-tighter transition-colors">S/ {utilidadNeta.toFixed(2)}</p>
        </div>
      </div>

      {/* TABLA DE DETALLE DIARIO */}
      <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl transition-colors">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-black/60 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Fecha</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Ventas</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Costo Prod.</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center text-red-600 dark:text-red-500">Gastos</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right">Ganancia Real</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {reporte.map((dia, idx) => {
              const gananciaDia = (Number(dia.ingresos_totales) - Number(dia.costo_mercaderia)) - Number(dia.egresos_operativos);
              return (
                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
                  <td className="p-8 font-black text-zinc-900 dark:text-white transition-colors">{new Date(dia.fecha).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
                  <td className="p-8 text-center text-zinc-500 dark:text-zinc-400 transition-colors">S/ {Number(dia.ingresos_totales).toFixed(2)}</td>
                  <td className="p-8 text-center text-zinc-400 dark:text-zinc-600 transition-colors">S/ {Number(dia.costo_mercaderia).toFixed(2)}</td>
                  <td className="p-8 text-center text-red-600 dark:text-red-500/70 font-bold transition-colors">S/ {Number(dia.egresos_operativos).toFixed(2)}</td>
                  <td className={`p-8 text-right font-black italic text-lg transition-colors ${gananciaDia >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-500'}`}>
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-zinc-900/90 dark:bg-black/90 backdrop-blur-xl p-4 transition-colors">
          <form onSubmit={guardarGasto} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in duration-300 transition-colors">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter transition-colors">Registrar Egreso</h2>
              <button type="button" onClick={() => setShowModalGasto(false)} className="text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors text-3xl">✕</button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 block transition-colors">Descripción del Gasto</label>
                <input required placeholder="EJ: PAGO LUZ MAYO" value={nuevoGasto.descripcion} onChange={(e) => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-zinc-900 dark:text-white font-black outline-none focus:ring-2 focus:ring-red-600 uppercase transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 block transition-colors">Monto (S/)</label>
                  <input type="number" step="0.01" required value={nuevoGasto.monto === 0 ? '' : nuevoGasto.monto} onChange={(e) => setNuevoGasto({...nuevoGasto, monto: Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-zinc-900 dark:text-white font-black outline-none focus:ring-2 focus:ring-red-600 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 block transition-colors">Categoría</label>
                  <select value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({...nuevoGasto, categoria: e.target.value})} className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-zinc-900 dark:text-white font-black outline-none focus:ring-2 focus:ring-red-600 transition-colors">
                    <option value="ALQUILER">ALQUILER</option>
                    <option value="LUZ">LUZ</option>
                    <option value="AGUA">AGUA</option>
                    <option value="PERSONAL">PERSONAL</option>
                    <option value="MOVILIDAD">MOVILIDAD</option>
                    <option value="OTROS">OTROS</option>
                  </select>
                </div>
              </div>

              {/* SECCIÓN NUEVA: MEDIO DE PAGO (CORRIGE ERROR 500 POSIBLE) */}
              <div>
                <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 block transition-colors">Medio de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map((metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setNuevoGasto({...nuevoGasto, metodo_pago: metodo})}
                      className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                        nuevoGasto.metodo_pago === metodo 
                        ? 'bg-red-600 border-red-500 text-white' 
                        : 'bg-zinc-50 dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {metodo}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white p-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 active:scale-95">
                Confirmar Pago de Gasto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}