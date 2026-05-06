'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
import NotaPedidoPrint from '../ventas/components/NotaPedidoPrint';

/**
 * MÓDULO DE GESTIÓN DE CAJAS PRO (v1.0.33)
 * Propósito: Auditoría avanzada con detección de descuadres (Sistema vs Realidad).
 * Incluye: Columna de diferencia global, tooltips de auditoría y filtros de discrepancia.
 */
export default function HistorialCajas() {
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [mostrarSoloDescuadres, setMostrarSoloDescuadres] = useState(false); // Nuevo filtro de auditoría
  
  // --- ESTADOS PARA REPORTES ---
  const [showReporteProd, setShowReporteProd] = useState(false);
  const [showReporteGen, setShowReporteGen] = useState(false);
  const [reporteAgrupado, setReporteAgrupado] = useState<any[]>([]);
  const [resumenFinanciero, setResumenFinanciero] = useState<any>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // --- ESTADO PARA MOTOR DE IMPRESIÓN ---
  const [datosImpresion, setDatosImpresion] = useState<any>(null);

  // --- 1. CARGA DE DATOS ---
  const cargarHistorial = async () => {
    try {
      const data = await apiService.getHistorialCajas();
      setHistorial(data);
    } catch (error) {
      console.error("Error de sincronización en Trujillo:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarHistorial(); }, []);

  // --- 2. FILTRADO INTELIGENTE (INCLUYE FILTRO DE DESCUADRE) ---
  const historialFiltrado = useMemo(() => {
    return historial.filter(item => {
      const coincideBusqueda = item.fecha_apertura.includes(filtro) || item.estado.toLowerCase().includes(filtro.toLowerCase());
      
      // Lógica del filtro de descuadres: Si está activo, solo muestra donde la diferencia no sea 0
      if (mostrarSoloDescuadres) {
        return coincideBusqueda && Math.abs(item.descuadre_total || 0) > 0.01;
      }
      
      return coincideBusqueda;
    });
  }, [filtro, historial, mostrarSoloDescuadres]);

  // --- 3. LÓGICA DE REPORTES (PROCESAMIENTO) ---
  const verReporteProductos = async (sesionId: string) => {
    setCargandoDetalle(true);
    setShowReporteProd(true);
    try {
      const data = await apiService.getReporteProductosPorTurno(sesionId);
      setReporteAgrupado(data);
    } catch (error) {
      alert("Error al cargar el detalle agrupado");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const verReporteGeneral = async (sesionId: string) => {
    setCargandoDetalle(true);
    setShowReporteGen(true);
    try {
      const data = await apiService.getResumenCaja(sesionId);
      setResumenFinanciero(data);
    } catch (error) {
      alert("Error al cargar resumen financiero");
    } finally {
      setCargandoDetalle(false);
    }
  };

  // --- 4. MOTOR DE REIMPRESIÓN ---
  const ejecutarReimpresion = async (idVenta: string) => {
    try {
      const data = await apiService.getDetalleVenta(idVenta);
      setDatosImpresion({
        items: data.items.map((i: any) => ({
          codigo: i.productos.sku || 'S/C',
          cantidad: i.cantidad,
          descripcion: i.productos.nombre,
          precio_unitario: i.precio_momento,
          total: i.precio_momento * i.cantidad
        })),
        cliente: data.venta.clientes,
        correlativo: data.venta.correlativo_nota,
        total_letras: data.venta.total_letras || "REIMPRESIÓN",
        subtotal: data.venta.monto_bruto,
        descuento_global: data.venta.monto_descuento,
        total_pagar: data.venta.monto_neto,
        fecha: new Date(data.venta.fecha).toLocaleDateString('es-PE'),
        vendedor: "Auditoría Trujillo"
      });
      setTimeout(() => { window.print(); setDatosImpresion(null); }, 500);
    } catch (error) { alert("No se pudo recuperar la venta"); }
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-indigo-500 font-black tracking-widest uppercase animate-pulse">
      Sincronizando Auditoría Trujillo...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* CAPA DE IMPRESIÓN (OCULTA) */}
      {datosImpresion && (
        <div className="hidden print:block">
           <NotaPedidoPrint data={datosImpresion} />
        </div>
      )}

      {/* CABECERA */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Control de Cajas</h1>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Auditoría de Turnos • v1.0.33</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 px-8 py-5 rounded-3xl text-right">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Registros Totales</p>
          <p className="text-2xl text-white font-black italic">{historial.length} TURNOS</p>
        </div>
      </header>

      {/* SECCIÓN DE FILTROS Y BOTONES RÁPIDOS */}
      <section className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2.5rem] mb-10 flex flex-wrap gap-4 print:hidden shadow-inner">
        <input type="date" onChange={(e) => setFiltro(e.target.value)} className="bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all cursor-pointer" />
        <input placeholder="BUSCAR POR ESTADO O FECHA..." value={filtro} onChange={(e) => setFiltro(e.target.value.toUpperCase())} className="flex-1 bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all uppercase placeholder:text-zinc-800" />
        
        {/* BOTÓN DE FILTRO DE DESCUADRE */}
        <button 
          onClick={() => setMostrarSoloDescuadres(!mostrarSoloDescuadres)}
          className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${
            mostrarSoloDescuadres 
            ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/20' 
            : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-white'
          }`}
        >
          {mostrarSoloDescuadres ? '🔔 VIENDO DESCUADRES' : 'MOSTRAR TODO'}
        </button>
      </section>

      {/* TABLA DE TURNOS ACTUALIZADA (AUDITORÍA TRUJILLO) */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl print:hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-black/60 border-b border-zinc-800">
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Apertura / Cierre</th>
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Inicial</th>
              {/* CAMBIO: Ahora muestra lo calculado por el sistema */}
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Final (Sistema)</th>
              {/* NUEVA COLUMNA: Diferencia Global */}
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Diferencia</th>
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Estado</th>
              <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {historialFiltrado.map((caja) => {
              const diferencia = Number(caja.descuadre_total || 0);
              const esFaltante = diferencia < -0.01;
              const esSobrante = diferencia > 0.01;
              
              return (
                <tr key={caja.id} className="hover:bg-indigo-500/5 transition-all group">
                  <td className="p-8">
                    <p className="text-sm font-black text-white">{new Date(caja.fecha_apertura).toLocaleString('es-PE')}</p>
                    <p className="text-[10px] font-bold text-zinc-600 mt-2 uppercase italic tracking-tighter">
                      {caja.fecha_cierre ? `Cierre: ${new Date(caja.fecha_cierre).toLocaleString('es-PE')}` : '🔓 TURNO ABIERTO'}
                    </p>
                  </td>
                  <td className="p-8 text-center font-mono text-zinc-500">S/ {Number(caja.monto_inicial).toFixed(2)}</td>
                  
                  {/* FINAL (SISTEMA): Lo que el sistema calculó automáticamente */}
                  <td className="p-8 text-center font-mono text-zinc-300 font-bold italic bg-white/5">
                    S/ {Number(caja.saldo_esperado_efectivo || 0).toFixed(2)}
                  </td>

                  {/* SALDO DE DIFERENCIA (Sobrante vs Faltante) */}
                  <td className={`p-8 text-center font-mono font-black text-sm transition-all`} title={esFaltante ? "Faltante Detectado (Dinero no encontrado)" : esSobrante ? "Sobrante Detectado (Caja excedida)" : "Caja Cuadrada"}>
                    <div className={`px-4 py-2 rounded-xl inline-block ${
                      esFaltante ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg shadow-red-500/10' : 
                       esSobrante ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                      'text-zinc-500'
                    }`}>
                      {esSobrante ? '+' : ''} S/ {diferencia.toFixed(2)}
                    </div>
                  </td>

                  <td className="p-8 text-center">
                    <span className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                      caja.estado === 'CERRADA' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse'
                    }`}>
                      {caja.estado}
                    </span>
                  </td>
                  <td className="p-8 text-center space-x-3">
                    <button onClick={() => verReporteProductos(caja.id)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black rounded-xl uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-95">📦 Productos</button>
                    <button onClick={() => verReporteGeneral(caja.id)} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] font-black rounded-xl uppercase transition-all">📊 General</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- MODALES (MANTENIENDO TU ESTRUCTURA ACTUAL) --- */}
      {showReporteProd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-5xl shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-10 text-white font-black uppercase italic text-4xl">
              <h2>Detalle de Ventas</h2>
              <button onClick={() => setShowReporteProd(false)}>✕</button>
            </div>
            {/* ... Resto del modal de productos agrupados (v1.0.32) ... */}
            <div className="space-y-6 max-h-[550px] overflow-y-auto pr-4 custom-scrollbar">
                {reporteAgrupado.map((nota, idx) => (
                  <div key={idx} className="bg-black/40 border border-zinc-800 rounded-[2rem] overflow-hidden group mb-6">
                    <div className="p-6 bg-zinc-800/20 border-b border-zinc-800 flex justify-between items-center">
                       <div><span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Nota de Venta</span><h3 className="text-white font-black italic tracking-tighter">{nota.correlativo}</h3></div>
                       <div className="text-center"><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Cliente Atendido</span><p className="text-zinc-300 font-bold uppercase text-[11px]">{nota.cliente}</p></div>
                       <button onClick={() => ejecutarReimpresion(nota.id_venta)} className="p-4 bg-indigo-600 hover:bg-white hover:text-black rounded-2xl shadow-xl transition-all">🖨️ Reimprimir</button>
                    </div>
                    <table className="w-full text-left text-xs">
                      <tbody>
                        {nota.productos.map((prod: any, pIdx: number) => (
                          <tr key={pIdx}>
                            <td className="p-5 font-bold text-zinc-400 uppercase">{prod.nombre}</td>
                            <td className="p-5 text-center text-zinc-500 font-black">x{prod.cantidad}</td>
                            <td className="p-5 text-center text-zinc-600">S/ {prod.precio_venta.toFixed(2)}</td>
                            <td className="p-5 text-right text-emerald-400 font-black italic">S/ {prod.total_item.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL REPORTE GENERAL --- */}
      {showReporteGen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-start mb-10 text-white font-black text-4xl">
              <h2>Resumen Financiero</h2>
              <button onClick={() => setShowReporteGen(false)}>✕</button>
            </div>
            {/* ... Resto del modal financiero (v1.0.32) ... */}
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-black rounded-3xl border border-zinc-800 shadow-inner">
                    <p className="text-[10px] text-zinc-500 font-black uppercase mb-2 italic">Efectivo Inicial</p>
                    <p className="text-2xl text-white font-black">S/ {resumenFinanciero?.monto_inicial.toFixed(2)}</p>
                  </div>
                  <div className="p-6 bg-black rounded-3xl border border-zinc-800 shadow-inner">
                    <p className="text-[10px] text-zinc-500 font-black uppercase mb-2 italic">Ventas Efectivo</p>
                    <p className="text-2xl text-emerald-400 font-black">S/ {resumenFinanciero?.ventas_por_metodo.EFECTIVO.toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-8 bg-zinc-800/20 rounded-[2.5rem] border border-zinc-800 space-y-4 text-white text-xs">
                    <div className="flex justify-between pb-3 border-b border-zinc-800 uppercase text-zinc-500"><span>Yape:</span> <span className="text-white">S/ {resumenFinanciero?.ventas_por_metodo.YAPE.toFixed(2)}</span></div>
                    <div className="flex justify-between pb-3 border-b border-zinc-800 uppercase text-zinc-500"><span>Plin:</span> <span className="text-white">S/ {resumenFinanciero?.ventas_por_metodo.PLIN.toFixed(2)}</span></div>
                    <div className="flex justify-between uppercase text-zinc-500"><span>Transferencias:</span> <span className="text-white">S/ {resumenFinanciero?.ventas_por_metodo.TRANSFERENCIA.toFixed(2)}</span></div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}