'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
import NotaPedidoPrint from '../ventas/components/NotaPedidoPrint';

/**
 * MÓDULO DE GESTIÓN DE CAJAS PRO (ALTA DENSIDAD)
 * Actualización: Diseño Full-Width corporativo y sistema de Paginación.
 */
export default function HistorialCajas() {
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [mostrarSoloDescuadres, setMostrarSoloDescuadres] = useState(false); 
  
  // --- NUEVO: ESTADOS DE PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);
  const turnosPorPagina = 12; // Cantidad de filas por vista

  // --- ESTADOS PARA REPORTES ---
  const [showReporteProd, setShowReporteProd] = useState(false);
  const [showReporteGen, setShowReporteGen] = useState(false);
  const [reporteAgrupado, setReporteAgrupado] = useState<any[]>([]);
  const [resumenFinanciero, setResumenFinanciero] = useState<any>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [datosImpresion, setDatosImpresion] = useState<any>(null);

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

  // --- FILTRADO INTELIGENTE ---
  const historialFiltrado = useMemo(() => {
    return historial.filter(item => {
      const coincideBusqueda = item.fecha_apertura.includes(filtro) || item.estado.toLowerCase().includes(filtro.toLowerCase());
      if (mostrarSoloDescuadres) {
        return coincideBusqueda && Math.abs(item.descuadre_total || 0) > 0.01;
      }
      return coincideBusqueda;
    });
  }, [filtro, historial, mostrarSoloDescuadres]);

  // --- LÓGICA DE PAGINACIÓN ---
  // Si el usuario filtra o busca algo, lo regresamos a la página 1 automáticamente
  useEffect(() => {
    setPaginaActual(1);
  }, [filtro, mostrarSoloDescuadres]);

  const totalPaginas = Math.ceil(historialFiltrado.length / turnosPorPagina);
  const historialPaginado = historialFiltrado.slice(
    (paginaActual - 1) * turnosPorPagina,
    paginaActual * turnosPorPagina
  );

  // --- REPORTES Y REIMPRESIÓN ---
  const verReporteProductos = async (sesionId: string) => {
    setCargandoDetalle(true); setShowReporteProd(true);
    try {
      const data = await apiService.getReporteProductosPorTurno(sesionId);
      setReporteAgrupado(data);
    } catch (error) { alert("Error al cargar el detalle agrupado"); } 
    finally { setCargandoDetalle(false); }
  };

  const verReporteGeneral = async (sesionId: string) => {
    setCargandoDetalle(true); setShowReporteGen(true);
    try {
      const data = await apiService.getResumenCaja(sesionId);
      setResumenFinanciero(data);
    } catch (error) { alert("Error al cargar resumen financiero"); } 
    finally { setCargandoDetalle(false); }
  };

  const ejecutarReimpresion = async (idVenta: string) => {
    try {
      const data = await apiService.getDetalleVenta(idVenta);
      setDatosImpresion({
        items: data.items.map((i: any) => ({ codigo: i.productos?.sku || 'S/C', cantidad: i.cantidad, descripcion: i.productos?.nombre || 'Producto Desconocido', precio_unitario: i.precio_momento, total: i.precio_momento * i.cantidad })),
        cliente: data.venta.clientes || { nombre_razon_social: "PÚBLICO GENERAL", numero_documento: "0" },
        correlativo: data.venta.correlativo_nota || "P001-XXXXXXX",
        total_letras: data.venta.total_letras || "COPIA DE NOTA DE VENTA",
        subtotal: data.venta.monto_bruto,
        descuento_global: data.venta.monto_descuento,
        total_pagar: data.venta.monto_neto,
        fecha: new Date(data.venta.fecha).toLocaleDateString('es-PE'),
        vendedor: "Auditoría / Reimpresión"
      });
      setTimeout(() => { window.print(); }, 700); 
    } catch (error) { 
      console.error(error); alert("No se pudo recuperar la información de la venta seleccionada"); 
    }
  };

  const formatearFechaLocal = (fechaStr: string) => {
    if (!fechaStr) return null;
    const fechaLimpia = fechaStr.replace('Z', '').replace(/\+00$/, '');
    return new Date(fechaLimpia).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (cargando) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-indigo-500 font-black tracking-widest uppercase animate-pulse">Sincronizando Auditoría...</div>;

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] w-full mx-auto animate-in fade-in duration-500 relative transition-colors duration-300 print:p-0 print:m-0">
      
      {/* CAPA DE IMPRESIÓN */}
      {datosImpresion && (
        <div className="hidden print:block print:w-full print:bg-white">
           <NotaPedidoPrint data={datosImpresion} />
        </div>
      )}

      {/* CABECERA CORPORATIVA COMPACTA */}
      <header className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 text-white p-4 rounded-xl shadow-md print:hidden">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">Control de Cajas</h1>
          <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-widest mt-1">Auditoría de Turnos • v1.1.2</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* BUSCADOR COMPACTO */}
          <div className="flex bg-black p-1.5 rounded-lg border border-zinc-800">
            <input type="date" onChange={(e) => setFiltro(e.target.value)} className="bg-transparent text-white text-[10px] font-black outline-none px-2 cursor-pointer" />
            <div className="w-px bg-zinc-800 mx-2"></div>
            <input placeholder="BUSCAR ESTADO O FECHA..." value={filtro} onChange={(e) => setFiltro(e.target.value.toUpperCase())} className="bg-transparent w-48 text-white text-[10px] font-black outline-none uppercase placeholder:text-zinc-600" />
          </div>
          
          <button onClick={() => setMostrarSoloDescuadres(!mostrarSoloDescuadres)} className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${mostrarSoloDescuadres ? 'bg-red-600 text-white shadow-md' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            {mostrarSoloDescuadres ? '🔔 DESCUADRES' : 'MOSTRAR TODO'}
          </button>

          <div className="bg-zinc-800 px-3 py-1 rounded-lg text-right hidden md:block">
            <span className="text-[8px] text-zinc-400 font-black uppercase block">Registros Totales</span>
            <span className="text-sm text-white font-black">{historial.length}</span>
          </div>
        </div>
      </header>

      {/* TABLA DE AUDITORÍA (ALTA DENSIDAD) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm print:hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-zinc-100 dark:bg-black/60 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Apertura / Cierre</th>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Inicial</th>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Final (Sistema)</th>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Diferencia</th>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Estado</th>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Acciones de Reporte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-[11px]">
              {historialPaginado.map((caja) => {
                const diferencia = Number(caja.descuadre_total || 0);
                const esFaltante = diferencia < -0.01;
                const esSobrante = diferencia > 0.01;

                return (
                  <tr key={caja.id} className="hover:bg-indigo-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3">
                      <p className="font-black text-zinc-900 dark:text-white">{formatearFechaLocal(caja.fecha_apertura)}</p>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase mt-0.5">
                        {caja.fecha_cierre ? `Cierre: ${formatearFechaLocal(caja.fecha_cierre)}` : '🔓 TURNO ABIERTO'}
                      </p>
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-500 dark:text-zinc-400">
                      S/ {Number(caja.monto_inicial || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-black text-zinc-900 dark:text-white bg-zinc-50 dark:bg-black/20">
                      S/ {Number(caja.monto_total_sistema || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-black ${esFaltante ? 'bg-red-500/10 text-red-600 dark:text-red-400' : esSobrante ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-zinc-400 dark:text-zinc-600'}`}>
                        {esSobrante ? '+' : ''} S/ {diferencia.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded font-black text-[9px] uppercase ${caja.estado === 'CERRADA' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse'}`}>
                        {caja.estado}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => verReporteProductos(caja.id)} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-black rounded text-[9px] uppercase transition-colors">📦 Productos</button>
                      <button onClick={() => verReporteGeneral(caja.id)} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-black rounded text-[9px] uppercase transition-colors">📊 General</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {historialFiltrado.length === 0 && (
            <div className="text-center py-10 text-[10px] font-black uppercase text-zinc-400 italic">No se encontraron turnos</div>
          )}
        </div>

        {/* CONTROLES DE PAGINACIÓN */}
        {historialFiltrado.length > 0 && (
          <div className="bg-zinc-50 dark:bg-black border-t border-zinc-200 dark:border-zinc-800 p-3 flex justify-between items-center text-[10px]">
            <span className="font-black text-zinc-500 uppercase tracking-widest">
              Mostrando {(paginaActual - 1) * turnosPorPagina + 1} - {Math.min(paginaActual * turnosPorPagina, historialFiltrado.length)} de {historialFiltrado.length}
            </span>
            <div className="flex gap-2 items-center">
              <button disabled={paginaActual === 1} onClick={() => setPaginaActual(p => p - 1)} className="px-3 py-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-black uppercase disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Anterior</button>
              <span className="font-black text-zinc-900 dark:text-white px-2">Pág. {paginaActual} de {totalPaginas || 1}</span>
              <button disabled={paginaActual >= totalPaginas} onClick={() => setPaginaActual(p => p + 1)} className="px-3 py-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-black uppercase disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALES COMPACTOS REDISEÑADOS --- */}
      {showReporteProd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
              <h2 className="font-black text-lg text-zinc-900 dark:text-white uppercase italic">Detalle de Ventas</h2>
              <button onClick={() => setShowReporteProd(false)} className="text-zinc-400 hover:text-red-500 font-black">✕ CERRAR</button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {reporteAgrupado.map((nota, idx) => (
                  <div key={idx} className="bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                       <div>
                         <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block mb-0.5">Nota de Venta</span>
                         <h3 className="text-zinc-900 dark:text-white font-black text-xs">{nota.correlativo}</h3>
                       </div>
                       <div className="text-right pr-4 border-r border-zinc-300 dark:border-zinc-700 mr-4">
                         <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-0.5">Cliente Atendido</span>
                         <p className="text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[9px]">{nota.cliente}</p>
                       </div>
                       <button onClick={() => ejecutarReimpresion(nota.id_venta)} disabled={cargandoDetalle} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-black text-[9px] uppercase transition-all shadow-md">
                         🖨️ Reimprimir
                       </button>
                    </div>
                    <table className="w-full text-left text-[10px]">
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                        {nota.productos.map((prod: any, pIdx: number) => (
                          <tr key={pIdx} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/30">
                            <td className="p-2 font-bold text-zinc-700 dark:text-zinc-300 uppercase pl-4">{prod.nombre}</td>
                            <td className="p-2 text-center text-zinc-500 font-black">x{prod.cantidad}</td>
                            <td className="p-2 text-right text-zinc-500">S/ {prod.precio_venta.toFixed(2)}</td>
                            <td className="p-2 text-right text-emerald-600 dark:text-emerald-400 font-black pr-4">S/ {prod.total_item.toFixed(2)}</td>
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

      {showReporteGen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
              <h2 className="font-black text-lg text-zinc-900 dark:text-white uppercase italic">Resumen Financiero</h2>
              <button onClick={() => setShowReporteGen(false)} className="text-zinc-400 hover:text-red-500 font-black">✕ CERRAR</button>
            </div>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-zinc-50 dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Efectivo Inicial</p>
                    <p className="text-lg text-zinc-900 dark:text-white font-black">S/ {resumenFinanciero?.monto_inicial.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Ventas Efectivo</p>
                    <p className="text-lg text-emerald-600 dark:text-emerald-400 font-black">S/ {resumenFinanciero?.ventas_por_metodo.EFECTIVO.toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-[10px]">
                    <div className="flex justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700 uppercase text-zinc-600 dark:text-zinc-400"><span className="font-black">Yape:</span> <span className="text-zinc-900 dark:text-white font-bold">S/ {resumenFinanciero?.ventas_por_metodo.YAPE.toFixed(2)}</span></div>
                    <div className="flex justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700 uppercase text-zinc-600 dark:text-zinc-400"><span className="font-black">Plin:</span> <span className="text-zinc-900 dark:text-white font-bold">S/ {resumenFinanciero?.ventas_por_metodo.PLIN.toFixed(2)}</span></div>
                    <div className="flex justify-between uppercase text-zinc-600 dark:text-zinc-400"><span className="font-black">Transferencias:</span> <span className="text-zinc-900 dark:text-white font-bold">S/ {resumenFinanciero?.ventas_por_metodo.TRANSFERENCIA.toFixed(2)}</span></div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}