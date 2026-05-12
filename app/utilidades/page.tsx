'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
import { useRouter } from 'next/navigation';

/**
 * MÓDULO DE UTILIDADES Y RENTABILIDAD - v1.2.8
 * RESGUARDA: Dashboard de 4 bloques, Filtros de Fecha e Historial de 5 columnas.
 * INTEGRA: Gestión avanzada de Obligaciones (Monto Fijo, Edición y Toggle de Estado).
 */
export default function UtilidadesPage() {
  const router = useRouter();
  const [reporte, setReporte] = useState<any[]>([]);
  const [obligaciones, setObligaciones] = useState<any[]>([]); 
  const [cargando, setCargando] = useState(true);
  
  // --- 1. FILTROS DE FECHA ---
  const [fechaInicio, setFechaInicio] = useState(new Date().toLocaleDateString('en-CA')); 
  const [fechaFin, setFechaFin] = useState(new Date().toLocaleDateString('en-CA'));

  // --- 2. ESTADOS DE MODALES ---
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [showModalConfig, setShowModalConfig] = useState(false);
  const [editMode, setEditMode] = useState<any>(null); // null = Crear, {data} = Editar

  // --- 3. ESTADOS DE FORMULARIO ---
  const [nuevoGasto, setNuevoGasto] = useState({
    descripcion: '', monto: 0, categoria: 'OTROS', metodo_pago: 'EFECTIVO'
  });

  const [formOb, setFormOb] = useState({
    descripcion: '', 
    categoria: 'SERVICIOS', 
    es_recurrente: true, 
    dia_vencimiento: 15, 
    recordatorio_dias: 3,
    monto_sugerido: 0 // Campo para montos fijos como 'SISTEMA'
  });

  // --- 4. MOTOR DE CARGA SINCRONIZADO ---
  const cargarTodo = async () => {
    setCargando(true);
    try {
      // Cargamos el balance y las reglas en paralelo para Trujillo
      const [resReporte, resOb] = await Promise.all([
        apiService.getReporteUtilidad(fechaInicio, fechaFin),
        apiService.getObligaciones() // Ahora trae activas e inactivas
      ]);
      setReporte(resReporte);
      setObligaciones(resOb);
    } catch (error: any) {
      if (error.message.includes('401')) router.push('/login');
    } finally { setCargando(false); }
  };

  useEffect(() => { cargarTodo(); }, [fechaInicio, fechaFin]);

  // --- 5. ACCIONES DE GESTIÓN (OBLIGACIONES) ---
  
  const handleGuardarConfig = async () => {
    try {
      if (editMode) {
        await apiService.updateObligacion(editMode.id, formOb);
        alert("✅ ACTUALIZADO: " + formOb.descripcion);
      } else {
        await apiService.crearObligacion(formOb);
        alert("✅ PROGRAMADO: " + formOb.descripcion);
      }
      setShowModalConfig(false);
      setEditMode(null);
      cargarTodo();
    } catch (error) { alert("Error al guardar la regla"); }
  };

  const prepararEdicion = (ob: any) => {
    setEditMode(ob);
    setFormOb({
      descripcion: ob.descripcion,
      categoria: ob.categoria,
      es_recurrente: ob.es_recurrente,
      dia_vencimiento: ob.dia_vencimiento,
      recordatorio_dias: ob.recordatorio_dias,
      monto_sugerido: ob.monto_sugerido
    });
    setShowModalConfig(true);
  };

  const toggleActivo = async (ob: any) => {
    try {
      await apiService.updateObligacion(ob.id, { activo: !ob.activo });
      cargarTodo();
    } catch (e) { alert("Error al cambiar estado"); }
  };

  const borrarRegla = async (id: string) => {
    if (confirm("¿Eliminar esta regla permanentemente? Esto no afectará tus gastos pasados.")) {
      try {
        await apiService.deleteObligacion(id);
        cargarTodo();
      } catch (e) { alert("Error al eliminar"); }
    }
  };

  // --- 6. CÁLCULOS DE BALANCE ---
  const totales = useMemo(() => {
    return reporte.reduce((acc, curr) => ({
      ingresos: acc.ingresos + Number(curr.ingresos_totales),
      costos: acc.costos + Number(curr.costo_mercaderia),
      gastos: acc.gastos + Number(curr.egresos_operativos)
    }), { ingresos: 0, costos: 0, gastos: 0 });
  }, [reporte]);

  const utilidadNetaReal = (totales.ingresos - totales.costos) - totales.gastos;

  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.registrarGasto(nuevoGasto);
      setShowModalGasto(false);
      setNuevoGasto({ descripcion: '', monto: 0, categoria: 'OTROS', metodo_pago: 'EFECTIVO' });
      cargarTodo();
      alert("✅ GASTO REGISTRADO");
    } catch (error) { alert("Error al registrar"); }
  };

  if (cargando) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-indigo-500 font-black animate-pulse uppercase">Auditoría en proceso...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* CABECERA */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Balance de Utilidades</h1>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Rentabilidad Neta • Jean Nails Store</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => { setEditMode(null); setFormOb({descripcion:'', categoria:'SERVICIOS', es_recurrente:true, dia_vencimiento:15, recordatorio_dias:3, monto_sugerido:0}); setShowModalConfig(true); }}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-zinc-700 transition-all shadow-lg"
          >
            📅 Programar Pagos
          </button>
          <button 
            onClick={() => setShowModalGasto(true)}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 transition-all"
          >
            💸 Registrar Egreso
          </button>
        </div>
      </header>

      {/* FILTROS */}
      <section className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2.5rem] mb-10 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-zinc-500 uppercase">Desde</span>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-black border border-zinc-800 p-3 rounded-xl text-white font-black" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-zinc-500 uppercase">Hasta</span>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-black border border-zinc-800 p-3 rounded-xl text-white font-black" />
        </div>
      </section>

      {/* BLOQUES KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-zinc-500 font-black uppercase mb-2">Ingresos Totales</p>
          <p className="text-3xl text-white font-black italic">S/ {totales.ingresos.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-zinc-500 font-black uppercase mb-2">Inversión Stock</p>
          <p className="text-3xl text-zinc-400 font-black italic">S/ {totales.costos.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] text-red-500 font-black uppercase mb-2">Gastos Operativos</p>
          <p className="text-3xl text-red-500 font-black italic">S/ {totales.gastos.toFixed(2)}</p>
        </div>
        <div className={`p-8 rounded-[2.5rem] border-2 ${utilidadNetaReal >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <p className={`text-[10px] font-black uppercase mb-2 ${utilidadNetaReal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Utilidad Neta Real</p>
          <p className={`text-4xl font-black italic tracking-tighter ${utilidadNetaReal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            S/ {utilidadNetaReal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* TABLA DE HISTORIAL (5 COLUMNAS - RESGUARDADO)  */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl mb-20">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-black/60 border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              <th className="p-8">Fecha Operación</th>
              <th className="p-8 text-center">Ventas</th>
              <th className="p-8 text-center">Costo Mercadería</th>
              <th className="p-8 text-center text-red-500">Gastos</th>
              <th className="p-8 text-right">Ganancia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {reporte.map((dia, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-all">
                <td className="p-8 font-black text-white uppercase italic">
                  {new Date(dia.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })}
                </td>
                <td className="p-8 text-center text-zinc-400">S/ {Number(dia.ingresos_totales).toFixed(2)}</td>
                <td className="p-8 text-center text-zinc-500">S/ {Number(dia.costo_mercaderia).toFixed(2)}</td>
                <td className="p-8 text-center text-red-500/70 font-bold">S/ {Number(dia.egresos_operativos).toFixed(2)}</td>
                <td className={`p-8 text-right font-black italic ${Number(dia.ganancia_neta) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  S/ {Number(dia.ganancia_neta).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- PANEL DE GESTIÓN DE OBLIGACIONES ACTUALIZADO --- */}
      <div className="mt-20 mb-10">
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-6">Configuración de Alertas Recurrentes</h2>
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-[3rem] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/60 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <th className="p-6">Servicio / Obligación</th>
                <th className="p-6">Monto Fijo</th>
                <th className="p-6">Vencimiento</th>
                <th className="p-6 text-center">Notificación</th>
                <th className="p-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {obligaciones.map((ob) => (
                <tr key={ob.id} className={`transition-colors ${ob.activo ? 'hover:bg-white/5' : 'opacity-40 grayscale'}`}>
                  <td className="p-6">
                    <p className="text-sm font-bold text-white">{ob.descripcion}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">{ob.categoria}</p>
                  </td>
                  <td className="p-6 text-sm font-black text-indigo-400">
                    S/ {Number(ob.monto_sugerido).toFixed(2)}
                  </td>
                  <td className="p-6 text-xs text-zinc-400">Día {ob.dia_vencimiento} de cada mes</td>
                  <td className="p-6 text-center">
                    <button 
                      onClick={() => toggleActivo(ob)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${ob.activo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}
                    >
                      {ob.activo ? '● ACTIVA' : '○ PAUSADA'}
                    </button>
                  </td>
                  <td className="p-6 text-right space-x-4">
                    <button onClick={() => prepararEdicion(ob)} className="text-indigo-400 hover:text-white text-xs font-bold uppercase transition-colors">Editar</button>
                    <button onClick={() => borrarRegla(ob.id)} className="text-zinc-600 hover:text-red-500 transition-colors">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: NUEVO GASTO MANUAL --- */}
      {showModalGasto && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <form onSubmit={guardarGasto} className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-xl shadow-2xl">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8 text-center">Nuevo Gasto</h2>
            <div className="space-y-6">
              <input required placeholder="DESCRIPCIÓN DEL ÍTEM" value={nuevoGasto.descripcion} onChange={(e) => setNuevoGasto({...nuevoGasto, descripcion: e.target.value.toUpperCase()})} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black uppercase outline-none focus:ring-2 focus:ring-red-600" />
              
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" required placeholder="IMPORTE S/" onChange={(e) => setNuevoGasto({...nuevoGasto, monto: Number(e.target.value)})} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black" />
                <select value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({...nuevoGasto, categoria: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black">
                  {['ALQUILER', 'LUZ', 'AGUA', 'PERSONAL', 'MOVILIDAD', 'OTROS'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map((m) => (
                  <button key={m} type="button" onClick={() => setNuevoGasto({...nuevoGasto, metodo_pago: m})} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${nuevoGasto.metodo_pago === m ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-500'}`}>{m}</button>
                ))}
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white p-5 rounded-2xl font-black uppercase shadow-xl shadow-red-600/30">Confirmar Registro de Gasto</button>
              <button type="button" onClick={() => setShowModalGasto(false)} className="w-full text-zinc-500 uppercase text-[10px] font-black mt-2">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL: PROGRAMAR / EDITAR PAGO ACTUALIZADO --- */}
      {showModalConfig && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3.5rem] w-full max-w-lg shadow-2xl">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8">
                {editMode ? 'Editar Obligación' : 'Programar Pago'}
            </h2>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 mb-1 block">Nombre del Pago</label>
                <input value={formOb.descripcion} placeholder="EJ: RECIBO LUZ" className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white font-black uppercase outline-none focus:ring-2 focus:ring-indigo-600" onChange={(e) => setFormOb({...formOb, descripcion: e.target.value.toUpperCase()})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 mb-1 block">Día de Pago (1-31)</label>
                  <input type="number" value={formOb.dia_vencimiento} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white font-black" onChange={(e) => setFormOb({...formOb, dia_vencimiento: parseInt(e.target.value)|| 1})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 mb-1 block">Monto Mensual (S/)</label>
                  <input type="number" step="0.01" value={formOb.monto_sugerido} placeholder="S/ 0.00" className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-indigo-400 font-black" onChange={(e) => setFormOb({...formOb, monto_sugerido: parseFloat(e.target.value)|| 0})} />
                </div>
              </div>

              <div className="bg-indigo-600/5 p-4 rounded-2xl border border-indigo-600/10">
                <label className="text-[10px] font-black text-indigo-500 uppercase ml-2 mb-1 block">Anticipación del Aviso</label>
                <input type="number" value={formOb.recordatorio_dias} className="w-full bg-transparent text-zinc-400 font-bold outline-none" onChange={(e) => setFormOb({...formOb, recordatorio_dias: parseInt(e.target.value)})} />
                <p className="text-[9px] text-zinc-600 ml-2 mt-1 italic">Días antes de la fecha para encender la campana 🔔</p>
              </div>

              <button onClick={handleGuardarConfig} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-2xl font-black uppercase transition-all shadow-xl shadow-indigo-600/20">
                {editMode ? 'Guardar Cambios' : 'Guardar Regla de Pago'}
              </button>
              <button onClick={() => {setShowModalConfig(false); setEditMode(null);}} className="w-full text-zinc-500 font-black uppercase text-[10px] mt-4 text-center">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}