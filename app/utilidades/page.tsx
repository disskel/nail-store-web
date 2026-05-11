'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
import { useRouter } from 'next/navigation';

/**
 * MÓDULO DE UTILIDADES Y RENTABILIDAD (v1.0.38)
 * Propósito: Comparar Ingresos vs Egresos para calcular la Utilidad Neta Real.
 * Actualización: Sincronización con Backend v1.0.34 para Bypass de RLS en gastos.
 */
export default function UtilidadesPage() {
  const router = useRouter();
  const [reporte, setReporte] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // --- 1. ESTADOS DE FILTRO (RANGO DE FECHAS) ---
  // Por defecto, muestra desde el primer día del mes actual hasta hoy.
  const [fechaInicio, setFechaInicio] = useState(new Date().toLocaleDateString('en-CA')); // Formato YYYY-MM-DD local
  const [fechaFin, setFechaFin] = useState(new Date().toLocaleDateString('en-CA'));

  // --- 2. ESTADOS PARA EL REGISTRO DE GASTOS ---
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [nuevoGasto, setNuevoGasto] = useState({
    descripcion: '',
    monto: 0,
    categoria: 'OTROS',
    metodo_pago: 'EFECTIVO' // Valor por defecto para evitar Error 500 en el servidor
  });

  // --- 3. MOTOR DE CARGA FINANCIERA ---
  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Consume la Vista SQL 'vista_reporte_utilidad' filtrada por fechas
      const data = await apiService.getReporteUtilidad(fechaInicio, fechaFin);
      setReporte(data);
    } catch (error: any) {
      console.error("Error al sincronizar utilidades:", error);
      // GESTIÓN DE SESIÓN: Si el servidor rechaza el token (401), forzamos re-login
      if (error.message.includes('SESIÓN EXPIRADA') || error.message.includes('401')) {
        alert("Su sesión ha caducado por seguridad. Inicie sesión nuevamente.");
        router.push('/login');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [fechaInicio, fechaFin]);

  // --- 4. CÁLCULO DE TOTALES (KPIs) ---
  const totales = useMemo(() => {
    return reporte.reduce((acc, curr) => ({
      ingresos: acc.ingresos + Number(curr.ingresos_totales),
      costos: acc.costos + Number(curr.costo_mercaderia),
      gastos: acc.gastos + Number(curr.egresos_operativos)
    }), { ingresos: 0, costos: 0, gastos: 0 });
  }, [reporte]);

  const utilidadBruta = totales.ingresos - totales.costos;
  const utilidadNeta = utilidadBruta - totales.gastos;

  // --- 5. LÓGICA DE REGISTRO DE EGRESOS ---
  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación preventiva en Trujillo para evitar datos basura
    if (nuevoGasto.monto <= 0) {
      alert("⚠️ ERROR: El monto del gasto debe ser mayor a 0.00");
      return;
    }

    try {
      /**
       * LLAMADA AL BACKEND:
       * El servidor (index.py) se encargará ahora de usar el token de usuario
       * para saltar el RLS y vincular el gasto a la caja abierta automáticamente.
       */
      await apiService.registrarGasto(nuevoGasto);
      
      setShowModalGasto(false);
      // Reset del formulario a valores seguros
      setNuevoGasto({ descripcion: '', monto: 0, categoria: 'OTROS', metodo_pago: 'EFECTIVO' });
      
      // Refrescamos el reporte inmediatamente para ver el nuevo gasto restado
      cargarDatos(); 
      alert("✅ GASTO REGISTRADO CORRECTAMENTE");
    } catch (error: any) {
      // Capturamos el error detallado (RLS o 500) para informar al usuario
      console.error("Fallo en registro de gasto:", error);
      alert(`Error al registrar el gasto: ${error.message || 'Error interno del servidor'}`);
    }
  };

  // --- PANTALLA DE CARGA PROFESIONAL ---
  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-500 font-black tracking-widest uppercase animate-pulse transition-colors duration-300">
      Sincronizando Rentabilidad Real...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700 transition-colors duration-300">
      
      {/* CABECERA DINÁMICA */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic transition-colors">Balance de Utilidades</h1>
          <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic transition-colors">Rentabilidad Neta • Jean Nails Store</p>
        </div>
        <button 
          onClick={() => setShowModalGasto(true)}
          className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 transition-all active:scale-95"
        >
          💸 Registrar Egreso
        </button>
      </header>

      {/* SECCIÓN DE FILTROS POR CALENDARIO */}
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

      {/* TARJETAS DE INDICADORES FINANCIEROS (BENTO GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] transition-colors shadow-sm dark:shadow-none">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest mb-2 transition-colors">Ingresos Totales</p>
          <p className="text-3xl text-zinc-900 dark:text-white font-black italic transition-colors">S/ {totales.ingresos.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] transition-colors shadow-sm dark:shadow-none">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest mb-2 transition-colors">Inversión Stock</p>
          <p className="text-3xl text-zinc-500 dark:text-zinc-400 font-black italic transition-colors">S/ {totales.costos.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] transition-colors shadow-sm dark:shadow-none">
          <p className="text-[10px] text-red-600 dark:text-red-500 font-black uppercase tracking-widest mb-2 transition-colors">Gastos Operativos</p>
          <p className="text-3xl text-red-600 dark:text-red-500 font-black italic transition-colors">S/ {totales.gastos.toFixed(2)}</p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500/20 dark:border-emerald-500/30 p-8 rounded-[2.5rem] shadow-lg transition-colors">
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-widest mb-2 transition-colors">Utilidad Neta Real</p>
          <p className="text-4xl text-emerald-600 dark:text-emerald-400 font-black italic tracking-tighter transition-colors">S/ {utilidadNeta.toFixed(2)}</p>
        </div>
      </div>

      {/* TABLA DE BALANCE DIARIO */}
      <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl transition-colors">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-black/60 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Fecha Operación</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Ventas</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Costo Mercadería</th>
              <th className="p-8 text-[10px] font-black text-red-600 dark:text-red-500 uppercase tracking-widest text-center">Gastos</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right">Ganancia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {reporte.map((dia, idx) => {
              const gananciaDia = (Number(dia.ingresos_totales) - Number(dia.costo_mercaderia)) - Number(dia.egresos_operativos);
         
              return (
                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
                  <td className="p-8 font-black text-zinc-900 dark:text-white transition-colors">{new Date(dia.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
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
        {reporte.length === 0 && (
          <div className="py-20 text-center text-zinc-400 dark:text-zinc-700 font-black uppercase italic tracking-widest transition-colors">No hay registros para este periodo</div>
        )}
      </div>

      {/* MODAL PARA REGISTRAR EGRESOS OPERATIVOS */}
      {showModalGasto && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-zinc-900/90 dark:bg-black/90 backdrop-blur-xl p-4 transition-colors">
          <form onSubmit={guardarGasto} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in duration-300 transition-colors">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter transition-colors">Nuevo Gasto</h2>
              <button type="button" onClick={() => setShowModalGasto(false)} className="text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors text-3xl">✕</button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 block transition-colors">Descripción del Ítem</label>
                <input required placeholder="EJ: RECIBO DE AGUA MAYO" value={nuevoGasto.descripcion} onChange={(e) => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-zinc-900 dark:text-white font-black outline-none focus:ring-2 focus:ring-red-600 uppercase transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 block transition-colors">Importe (S/)</label>
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

              {/* SELECTOR DE MEDIO DE PAGO PARA EVITAR ERROR 500 */}
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
                        ? 'bg-red-600 border-red-500 text-white shadow-lg' 
                        : 'bg-zinc-50 dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {metodo}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white p-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-red-600/30 active:scale-95">
                Confirmar Registro de Gasto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}