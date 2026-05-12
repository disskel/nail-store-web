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

    // --- NUEVA LÓGICA DE CONFIGURACIÓN (ADICIONADA) ---
  const [showModalConfig, setShowModalConfig] = useState(false);
  const [nuevaOb, setNuevaOb] = useState({
    descripcion: '', categoria: 'SERVICIOS', es_recurrente: true, dia_vencimiento: 15, recordatorio_dias: 3
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

    // Nueva función para guardar la configuración de notificaciones
  const guardarConfiguracion = async () => {
    try {
      await apiService.crearObligacion(nuevaOb);
      alert("✅ CONFIGURACIÓN GUARDADA: La campana te avisará automáticamente.");
      setShowModalConfig(false);
    } catch (error) { alert("Error al guardar regla"); }
  };


  // --- PANTALLA DE CARGA PROFESIONAL ---
  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-500 font-black tracking-widest uppercase animate-pulse transition-colors duration-300">
      Sincronizando Rentabilidad Real...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* CABECERA CON DOS BOTONES */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Balance de Utilidades</h1>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Rentabilidad Neta • Jean Nails Store</p>
        </div>
        
        <div className="flex gap-4">
          {/* NUEVO BOTÓN DE CONFIGURACIÓN */}
          <button 
            onClick={() => setShowModalConfig(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-zinc-700 transition-all active:scale-95 shadow-lg"
          >
            📅 Configurar Pagos
          </button>

          {/* TU BOTÓN ORIGINAL */}
          <button 
            onClick={() => setShowModalGasto(true)}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 transition-all active:scale-95"
          >
            💸 Registrar Egreso
          </button>
        </div>
      </header>

      {/* Rango de Fechas y Bento Grid (Mantenidos) */}
      <section className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2.5rem] mb-10 flex flex-wrap items-center gap-6">
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black" />
        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black" />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-zinc-500 font-black uppercase mb-2">Ingresos</p>
          <p className="text-3xl text-white font-black italic">S/ {totales.ingresos.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-zinc-500 font-black uppercase mb-2">Inversión</p>
          <p className="text-3xl text-zinc-500 font-black italic">S/ {totales.costos.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-red-500 font-black uppercase mb-2">Gastos</p>
          <p className="text-3xl text-red-500 font-black italic">S/ {totales.gastos.toFixed(2)}</p>
        </div>
        <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-emerald-500 font-black uppercase mb-2">Utilidad Neta</p>
          <p className="text-4xl text-emerald-400 font-black italic">S/ {utilidadNeta.toFixed(2)}</p>
        </div>
      </div>

      {/* MODAL NUEVO: CONFIGURAR PAGOS RECURRENTES */}
      {showModalConfig && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3.5rem] w-full max-w-lg shadow-2xl">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8">Programar Pago</h2>
            <div className="space-y-5">
              <input placeholder="NOMBRE (EJ: ALQUILER)" className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white font-black uppercase" onChange={(e) => setNuevaOb({...nuevaOb, descripcion: e.target.value.toUpperCase()})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="DÍA (1-31)" className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white font-black" onChange={(e) => setNuevaOb({...nuevaOb, dia_vencimiento: parseInt(e.target.value)})} />
                <input type="number" placeholder="AVISO (DÍAS ANTES)" className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white font-black" onChange={(e) => setNuevaOb({...nuevaOb, recordatorio_dias: parseInt(e.target.value)})} />
              </div>
              <button onClick={guardarConfiguracion} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase shadow-xl shadow-indigo-600/20">Guardar Regla de Pago</button>
              <button onClick={() => setShowModalConfig(false)} className="w-full text-zinc-500 font-black uppercase text-[10px] mt-4">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ORIGINAL: NUEVO GASTO (RESGUARDADO) */}
      {showModalGasto && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <form onSubmit={guardarGasto} className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-xl shadow-2xl transition-all">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Nuevo Gasto</h2>
              <button type="button" onClick={() => setShowModalGasto(false)} className="text-zinc-600 hover:text-white text-3xl">✕</button>
            </div>

            <div className="space-y-6">
              <input required placeholder="DESCRIPCIÓN DEL ÍTEM" value={nuevoGasto.descripcion} onChange={(e) => setNuevoGasto({...nuevoGasto, descripcion: e.target.value.toUpperCase()})} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-red-600 uppercase" />
              
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" required placeholder="IMPORTE S/" onChange={(e) => setNuevoGasto({...nuevoGasto, monto: Number(e.target.value)})} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none" />
                <select value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({...nuevoGasto, categoria: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black">
                  <option value="ALQUILER">ALQUILER</option>
                  <option value="LUZ">LUZ</option>
                  <option value="AGUA">AGUA</option>
                  <option value="PERSONAL">PERSONAL</option>
                  <option value="MOVILIDAD">MOVILIDAD</option>
                  <option value="OTROS">OTROS</option>
                </select>
              </div>

              {/* TUS BOTONES DE MEDIO DE PAGO ORIGINALES */}
              <div className="grid grid-cols-2 gap-2">
                {['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map((metodo) => (
                  <button
                    key={metodo}
                    type="button"
                    onClick={() => setNuevoGasto({...nuevoGasto, metodo_pago: metodo})}
                    className={`py-3 rounded-xl text-[10px] font-black border transition-all ${nuevoGasto.metodo_pago === metodo ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-500'}`}
                  >
                    {metodo}
                  </button>
                ))}
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white p-5 rounded-2xl font-black uppercase shadow-xl shadow-red-600/30">Confirmar Registro de Gasto</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de Resultados (Mantenida) */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/60 border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              <th className="p-8">Fecha Operación</th>
              <th className="p-8 text-center">Ventas</th>
              <th className="p-8 text-center text-red-500">Gastos</th>
              <th className="p-8 text-right">Ganancia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {reporte.map((dia, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-all">
                <td className="p-8 font-black text-white uppercase italic">{new Date(dia.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
                <td className="p-8 text-center text-zinc-400">S/ {Number(dia.ingresos_totales).toFixed(2)}</td>
                <td className="p-8 text-center text-red-500/70 font-bold">S/ {Number(dia.egresos_operativos).toFixed(2)}</td>
                <td className="p-8 text-right font-black italic text-emerald-400">S/ {(Number(dia.ingresos_totales) - Number(dia.costo_mercaderia) - Number(dia.egresos_operativos)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}