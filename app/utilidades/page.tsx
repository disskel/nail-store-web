'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
import { useRouter } from 'next/navigation';

/**
 * MÓDULO DE UTILIDADES Y RENTABILIDAD - ALTA DENSIDAD PRO
 * Rediseño corporativo: Expansión visual, tablas compactas y Tooltips de auditoría.
 */
export default function UtilidadesPage() {
  const router = useRouter();
  const [reporte, setReporte] = useState<any[]>([]);
  const [obligaciones, setObligaciones] = useState<any[]>([]); 
  const [detalleGastos, setDetalleGastos] = useState<any[]>([]); // NUEVO: Detalle para el Tooltip
  const [cargando, setCargando] = useState(true);
  
  // --- 1. FILTROS DE FECHA ---
  const [fechaInicio, setFechaInicio] = useState(new Date().toLocaleDateString('en-CA')); 
  const [fechaFin, setFechaFin] = useState(new Date().toLocaleDateString('en-CA'));

  // --- 2. ESTADOS DE MODALES ---
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [showModalConfig, setShowModalConfig] = useState(false);
  const [editMode, setEditMode] = useState<any>(null);

  // --- 3. ESTADOS DE FORMULARIO ---
  const [nuevoGasto, setNuevoGasto] = useState({
    descripcion: '', monto: 0, categoria: 'OTROS', metodo_pago: 'EFECTIVO'
  });

  const [formOb, setFormOb] = useState({
    descripcion: '', categoria: 'SERVICIOS', es_recurrente: true, dia_vencimiento: 15, recordatorio_dias: 3, monto_sugerido: 0
  });

  const [isSubmittingGasto, setIsSubmittingGasto] = useState(false); // NUEVO

  // --- 4. MOTOR DE CARGA SINCRONIZADO ---
  const cargarTodo = async () => {
    setCargando(true);
    try {
      const [resReporte, resOb, resGastosDetalle] = await Promise.all([
        apiService.getReporteUtilidad(fechaInicio, fechaFin),
        apiService.getObligaciones(),
        apiService.getDetalleGastos(fechaInicio, fechaFin) // Disparamos la nueva consulta
      ]);
      setReporte(resReporte);
      setObligaciones(resOb);
      setDetalleGastos(resGastosDetalle);
    } catch (error: any) {
      if (error.message.includes('401')) router.push('/login');
    } finally { setCargando(false); }
  };

  useEffect(() => { cargarTodo(); }, [fechaInicio, fechaFin]);

  // --- 5. ACCIONES DE GESTIÓN ---
  const handleGuardarConfig = async () => {
    try {
      if (editMode) {
        await apiService.updateObligacion(editMode.id, formOb);
        alert("✅ ACTUALIZADO: " + formOb.descripcion);
      } else {
        await apiService.crearObligacion(formOb);
        alert("✅ PROGRAMADO: " + formOb.descripcion);
      }
      setShowModalConfig(false); setEditMode(null); cargarTodo();
    } catch (error) { alert("Error al guardar la regla"); }
  };

  const prepararEdicion = (ob: any) => {
    setEditMode(ob);
    setFormOb({ descripcion: ob.descripcion, categoria: ob.categoria, es_recurrente: ob.es_recurrente, dia_vencimiento: ob.dia_vencimiento, recordatorio_dias: ob.recordatorio_dias, monto_sugerido: ob.monto_sugerido });
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
  const margenBruto = totales.ingresos > 0 ? ((totales.ingresos - totales.costos) / totales.ingresos) * 100 : 0;
  const margenNeto = totales.ingresos > 0 ? (utilidadNetaReal / totales.ingresos) * 100 : 0;

  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingGasto) return; // Candado de seguridad
    setIsSubmittingGasto(true);
    try {
      await apiService.registrarGasto(nuevoGasto);
      setShowModalGasto(false);
      setNuevoGasto({ descripcion: '', monto: 0, categoria: 'OTROS', metodo_pago: 'EFECTIVO' });
      cargarTodo();
      alert("✅ GASTO REGISTRADO");
    } catch (error) { alert("Error al registrar"); }
      finally {
      setIsSubmittingGasto(false); // Liberar candado
      }
  };

  if (cargando) return <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 text-indigo-500 font-black tracking-widest uppercase italic animate-pulse">Auditoría en proceso...</div>;

  return (
    <div className="p-4 lg:p-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* CABECERA CORPORATIVA COMPACTA */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 text-white p-4 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">Balance de Utilidades</h1>
          <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-widest mt-1">Rentabilidad Neta • Auditoría Financiera</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* FILTROS COMPACTOS */}
          <div className="flex items-center gap-2 bg-black border border-zinc-800 p-1.5 rounded-lg">
            <span className="text-[9px] font-black text-zinc-500 uppercase ml-1">DEL</span>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-transparent text-white font-bold text-[10px] outline-none" />
            <span className="text-[9px] font-black text-zinc-500 uppercase">AL</span>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-transparent text-white font-bold text-[10px] outline-none" />
          </div>

          <button onClick={() => { setEditMode(null); setFormOb({descripcion:'', categoria:'SERVICIOS', es_recurrente:true, dia_vencimiento:15, recordatorio_dias:3, monto_sugerido:0}); setShowModalConfig(true); }} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all">
            📅 Programar Pagos
          </button>
          <button onClick={() => setShowModalGasto(true)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-md transition-all">
            💸 Registrar Egreso
          </button>
        </div>
      </header>

      {/* BLOQUES KPI (ALTA DENSIDAD) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
          <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Ingresos Totales</p>
          <p className="text-2xl text-zinc-900 dark:text-white font-black tracking-tighter">S/ {totales.ingresos.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
          <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Inversión Stock</p>
          <p className="text-2xl text-zinc-500 font-black tracking-tighter">S/ {totales.costos.toFixed(2)}</p>
        </div>
        
        {/* BLOQUE GASTOS CON TOOLTIP INTERACTIVO */}
        <div className="relative group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm cursor-help hover:border-red-500 transition-colors">
          <p className="text-[10px] text-red-500 font-black uppercase mb-1 flex justify-between items-center">
            Gastos Operativos
            <span className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded text-[8px] animate-pulse">VER DETALLE 🔍</span>
          </p>
          <p className="text-2xl text-red-600 dark:text-red-500 font-black tracking-tighter">S/ {totales.gastos.toFixed(2)}</p>

          {/* ETIQUETA EMERGENTE (TOOLTIP) */}
          <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-3">
            <h4 className="text-[9px] text-zinc-500 dark:text-zinc-400 font-black uppercase border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-2">Desglose de Gastos en el Rango</h4>
            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {detalleGastos.length === 0 ? (
                <p className="text-zinc-500 text-[10px] italic font-bold">No hay gastos registrados.</p>
              ) : detalleGastos.map(g => (
                <div key={g.id} className="flex justify-between items-center text-[10px] bg-zinc-50 dark:bg-black/30 p-1.5 rounded">
                  <div className="truncate pr-2">
                    <p className="font-black text-zinc-900 dark:text-white truncate">{g.descripcion}</p>
                    <p className="text-[8px] text-zinc-500 uppercase font-bold">{new Date(g.fecha_gasto).toLocaleDateString('es-PE')} • {g.metodo_pago}</p>
                  </div>
                  <p className="font-black text-red-600 dark:text-red-400 whitespace-nowrap">S/ {g.monto.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BLOQUE UTILIDAD NETA CON TOOLTIP DE MÁRGENES */}
        <div className={`relative group p-4 rounded-xl border-2 shadow-sm flex flex-col justify-center cursor-help transition-all ${utilidadNetaReal >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500/50 hover:border-emerald-500' : 'bg-red-50 dark:bg-red-900/10 border-red-500/50 hover:border-red-500'}`}>
          <p className={`text-[10px] font-black uppercase mb-1 flex justify-between items-center ${utilidadNetaReal >= 0 ? 'text-emerald-700 dark:text-emerald-500' : 'text-red-700 dark:text-red-500'}`}>
            Utilidad Neta Real
            <span className={`${utilidadNetaReal >= 0 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'} px-1.5 py-0.5 rounded text-[8px] animate-pulse`}>VER MÁRGENES 🔍</span>
          </p>
          <p className={`text-3xl font-black italic tracking-tighter ${utilidadNetaReal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            S/ {utilidadNetaReal.toFixed(2)}
          </p>

          {/* ETIQUETA EMERGENTE (TOOLTIP DE ANÁLISIS) */}
          <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-4">
            <h4 className="text-[9px] text-zinc-500 dark:text-zinc-400 font-black uppercase border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-3">Análisis de Rentabilidad</h4>
            
            <div className="space-y-3">
              {/* MARGEN BRUTO */}
              <div className="flex justify-between items-center bg-zinc-50 dark:bg-black/30 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <div>
                  <p className="text-[10px] font-black text-zinc-900 dark:text-white">% MARGEN BRUTO</p>
                  <p className="text-[8px] text-zinc-500 font-bold leading-tight mt-0.5">Sin incluir gastos operativos</p>
                </div>
                <p className={`text-lg tracking-tighter font-black ${margenBruto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {margenBruto.toFixed(2)}%
                </p>
              </div>

              {/* MARGEN NETO */}
              <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                <div>
                  <p className="text-[10px] font-black text-indigo-900 dark:text-indigo-400">% MARGEN NETO</p>
                  <p className="text-[8px] text-indigo-500/70 font-bold leading-tight mt-0.5">Ganancia final al bolsillo</p>
                </div>
                <p className={`text-lg tracking-tighter font-black ${margenNeto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {margenNeto.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRID INFERIOR (TABLAS EN PARALELO PARA PANTALLAS GRANDES) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TABLA 1: HISTORIAL DE UTILIDADES */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[500px]">
          <div className="bg-zinc-100 dark:bg-black p-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xs font-black uppercase text-zinc-900 dark:text-white tracking-widest">Auditoría Diaria</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 sticky top-0 text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3 text-right">Ventas</th>
                  <th className="p-3 text-right">Costo</th>
                  <th className="p-3 text-right text-red-500">Gastos</th>
                  <th className="p-3 text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[10px]">
                {reporte.map((dia, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3 font-black text-zinc-900 dark:text-white uppercase">
                      {new Date(dia.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td className="p-3 text-right text-zinc-600 dark:text-zinc-400 font-bold">S/ {Number(dia.ingresos_totales).toFixed(2)}</td>
                    <td className="p-3 text-right text-zinc-500">S/ {Number(dia.costo_mercaderia).toFixed(2)}</td>
                    <td className="p-3 text-right text-red-600 dark:text-red-500 font-black">S/ {Number(dia.egresos_operativos).toFixed(2)}</td>
                    <td className={`p-3 text-right font-black ${Number(dia.ganancia_neta) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      S/ {Number(dia.ganancia_neta).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reporte.length === 0 && <p className="text-center py-10 text-[10px] text-zinc-500 font-black uppercase italic">Sin movimientos registrados</p>}
          </div>
        </div>

        {/* TABLA 2: GESTIÓN DE OBLIGACIONES */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[500px]">
          <div className="bg-zinc-100 dark:bg-black p-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xs font-black uppercase text-zinc-900 dark:text-white tracking-widest">Panel de Obligaciones</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 sticky top-0 text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3">Servicio</th>
                  <th className="p-3">Monto Fijo</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[10px]">
                {obligaciones.map((ob) => (
                  <tr key={ob.id} className={`transition-colors ${ob.activo ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50' : 'opacity-50 grayscale'}`}>
                    <td className="p-3">
                      <p className="font-black text-zinc-900 dark:text-white">{ob.descripcion}</p>
                      <p className="text-[8px] text-zinc-500 uppercase font-bold">VENCE: DÍA {ob.dia_vencimiento}</p>
                    </td>
                    <td className="p-3 font-black text-indigo-600 dark:text-indigo-400">
                      S/ {Number(ob.monto_sugerido).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => toggleActivo(ob)} className={`px-2 py-1 rounded text-[8px] font-black transition-all ${ob.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                        {ob.activo ? '● ACTIVA' : '○ PAUSADA'}
                      </button>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => prepararEdicion(ob)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-black uppercase px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded">Editar</button>
                      <button onClick={() => borrarRegla(ob.id)} className="text-red-600 hover:text-red-800 font-black px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded">X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODALES REDISEÑADOS Y COMPACTOS --- */}

      {/* MODAL GASTO */}
      {showModalGasto && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={guardarGasto} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">Registrar Egreso</h2>
            <div className="space-y-4">
              <input required placeholder="CONCEPTO DEL GASTO..." value={nuevoGasto.descripcion} onChange={(e) => setNuevoGasto({...nuevoGasto, descripcion: e.target.value.toUpperCase()})} className="w-full bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-800 p-3 rounded-lg text-zinc-900 dark:text-white text-xs font-black uppercase outline-none focus:border-red-500" />
              
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" required placeholder="IMPORTE S/" onChange={(e) => setNuevoGasto({...nuevoGasto, monto: Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-800 p-3 rounded-lg text-zinc-900 dark:text-white text-xs font-black outline-none focus:border-red-500" />
                <select value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({...nuevoGasto, categoria: e.target.value})} className="w-full bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-800 p-3 rounded-lg text-zinc-900 dark:text-white text-xs font-black outline-none focus:border-red-500 cursor-pointer">
                  {['ALQUILER', 'LUZ', 'AGUA', 'PERSONAL', 'MOVILIDAD', 'OTROS'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map((m) => (
                  <button key={m} type="button" onClick={() => setNuevoGasto({...nuevoGasto, metodo_pago: m})} className={`py-2 rounded-lg text-[9px] font-black transition-all ${nuevoGasto.metodo_pago === m ? 'bg-red-600 text-white shadow-md' : 'bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>{m}</button>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowModalGasto(false)} className="flex-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 p-3 rounded-lg font-black uppercase text-[10px]">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isSubmittingGasto}
                  className={`flex-1 p-3 rounded-lg font-black uppercase text-[10px] shadow-lg transition-all ${
                    isSubmittingGasto 
                      ? 'bg-zinc-500 text-white opacity-50 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {isSubmittingGasto ? 'Procesando...' : 'Confirmar Gasto'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN OBLIGACIÓN */}
      {showModalConfig && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                {editMode ? 'Editar Obligación' : 'Programar Pago'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 mb-1 block">Nombre del Servicio</label>
                <input value={formOb.descripcion} placeholder="EJ: RECIBO LUZ" className="w-full bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-800 p-3 rounded-lg text-zinc-900 dark:text-white text-xs font-black uppercase outline-none focus:border-indigo-500" onChange={(e) => setFormOb({...formOb, descripcion: e.target.value.toUpperCase()})} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 mb-1 block">Día Pago (1-31)</label>
                  <input type="number" value={formOb.dia_vencimiento} className="w-full bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-800 p-3 rounded-lg text-zinc-900 dark:text-white text-xs font-black outline-none focus:border-indigo-500" onChange={(e) => setFormOb({...formOb, dia_vencimiento: parseInt(e.target.value)|| 1})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 mb-1 block">Monto (S/)</label>
                  <input type="number" step="0.01" value={formOb.monto_sugerido} className="w-full bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-800 p-3 rounded-lg text-indigo-600 dark:text-indigo-400 text-xs font-black outline-none focus:border-indigo-500" onChange={(e) => setFormOb({...formOb, monto_sugerido: parseFloat(e.target.value)|| 0})} />
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/30">
                <label className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase ml-1 mb-1 block">Anticipación de Alarma</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={formOb.recordatorio_dias} className="w-16 bg-white dark:bg-black border border-indigo-200 dark:border-indigo-800 p-2 rounded text-zinc-900 dark:text-white text-xs font-black text-center outline-none" onChange={(e) => setFormOb({...formOb, recordatorio_dias: parseInt(e.target.value)})} />
                  <span className="text-[9px] text-zinc-500 font-bold">Días antes del pago 🔔</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button onClick={() => {setShowModalConfig(false); setEditMode(null);}} className="flex-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 p-3 rounded-lg font-black uppercase text-[10px]">Cancelar</button>
                <button onClick={handleGuardarConfig} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg font-black uppercase text-[10px] shadow-lg">
                  {editMode ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}