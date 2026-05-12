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
  const [obligaciones, setObligaciones] = useState<any[]>([]); // Estado para la nueva tabla
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
    descripcion: '', categoria: 'SERVICIOS', es_recurrente: true, dia_vencimiento: 15, recordatorio_dias: 3,monto_sugerido: 0
  });

  // --- 3. MOTOR DE CARGA FINANCIERA ---
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const dataReporte = await apiService.getReporteUtilidad(fechaInicio, fechaFin);
      const dataOb = await apiService.getObligaciones(); // Cargamos las reglas
      setReporte(dataReporte);
      setObligaciones(dataOb);
    } catch (error: any) {
      if (error.message.includes('401')) router.push('/login');
    } finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, [fechaInicio, fechaFin]);

    // Acciones de la nueva tabla
  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await apiService.updateObligacion(id, { activo: !currentStatus });
    cargarDatos(); // Refresca para apagar/encender la campana
  };

  const borrarRegla = async (id: string) => {
    if (confirm("¿Eliminar esta regla de pago permanentemente?")) {
      await apiService.deleteObligacion(id);
      cargarDatos();
    }
  };

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
      Auditoría en proceso...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Balance de Utilidades</h1>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Jean Nails Store • Trujillo</p>
        </div>
        
        <div className="flex gap-4">
          <button onClick={() => setShowModalConfig(true)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-zinc-700 transition-all">
            📅 Programar Pagos
          </button>
          <button onClick={() => setShowModalGasto(true)} className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 transition-all">
            💸 Registrar Egreso
          </button>
        </div>
      </header>

      {/* --- KPIs Y REPORTE DIARIO (MANTENIDOS) --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-zinc-500 font-black uppercase mb-2">Ingresos Totales</p>
          <p className="text-3xl text-white font-black italic">S/ {totales.ingresos.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-zinc-500 font-black uppercase mb-2">Inversión Stock</p>
          <p className="text-3xl text-zinc-500 font-black italic">S/ {totales.costos.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-red-500 font-black uppercase mb-2">Gastos Operativos</p>
          <p className="text-3xl text-red-500 font-black italic">S/ {totales.gastos.toFixed(2)}</p>
        </div>
        <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-emerald-500 font-black uppercase mb-2">Utilidad Neta Real</p>
          <p className="text-4xl text-emerald-400 font-black italic">S/ {utilidadNeta.toFixed(2)}</p>
        </div>
      </div>

      {/* --- NUEVA SECCIÓN: GESTIÓN DE OBLIGACIONES --- */}
      <div className="mt-20 mb-10">
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-6">Configuración de Alertas Recurrentes</h2>
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-[3rem] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/60 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <th className="p-6">Servicio / Obligación</th>
                <th className="p-6">Vencimiento</th>
                <th className="p-6 text-center">Estado Notificación</th>
                <th className="p-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {obligaciones.map((ob) => (
                <tr key={ob.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <p className="text-sm font-bold text-white">{ob.descripcion}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">{ob.categoria}</p>
                  </td>
                  <td className="p-6 text-xs text-zinc-400">Día {ob.dia_vencimiento} de cada mes</td>
                  <td className="p-6 text-center">
                    <button 
                      onClick={() => toggleStatus(ob.id, ob.activo)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${ob.activo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                    >
                      {ob.activo ? '● ACTIVA' : '○ DESACTIVADA'}
                    </button>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => borrarRegla(ob.id)} className="text-zinc-600 hover:text-red-500 transition-colors">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE GASTO (MULTIMODAL ORIGINAL REGUARDADO) --- */}
      {showModalGasto && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <form onSubmit={guardarGasto} className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-xl shadow-2xl">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8">Nuevo Gasto</h2>
            <div className="space-y-6">
              <input required placeholder="DESCRIPCIÓN" value={nuevoGasto.descripcion} onChange={(e) => setNuevoGasto({...nuevoGasto, descripcion: e.target.value.toUpperCase()})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white font-black uppercase outline-none focus:ring-2 focus:ring-red-600" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" required placeholder="MONTO S/" onChange={(e) => setNuevoGasto({...nuevoGasto, monto: Number(e.target.value)})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white font-black" />
                <select value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({...nuevoGasto, categoria: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white font-black">
                  {['ALQUILER', 'LUZ', 'AGUA', 'PERSONAL', 'MOVILIDAD', 'OTROS'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map((m) => (
                  <button key={m} type="button" onClick={() => setNuevoGasto({...nuevoGasto, metodo_pago: m})} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${nuevoGasto.metodo_pago === m ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-500'}`}>{m}</button>
                ))}
              </div>
              <button type="submit" className="w-full bg-red-600 text-white p-5 rounded-2xl font-black uppercase shadow-xl shadow-red-600/30">Confirmar Registro de Gasto</button>
              <button type="button" onClick={() => setShowModalGasto(false)} className="w-full text-zinc-500 uppercase text-[10px] font-black mt-2">Cerrar</button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL PROGRAMAR (MANTENIDO) --- */}
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
              <button onClick={guardarConfiguracion} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase">Guardar Regla</button>
              <button onClick={() => setShowModalConfig(false)} className="w-full text-zinc-500 font-black uppercase text-[10px] mt-4">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}