'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
// IMPORTAMOS EL COMPONENTE DE IMPRESIÓN (EL MISMO QUE USAS EN VENTAS)
import NotaPedidoPrint from '../ventas/components/NotaPedidoPrint';

/**
 * MÓDULO DE GESTIÓN DE CAJAS PRO (v1.1.1)
 * Actualización: Soporte para Modo Claro/Oscuro y Sistema de reimpresión atómico.
 * Propósito: Auditoría avanzada y recuperación de documentos históricos.
 */
export default function HistorialCajas() {
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [mostrarSoloDescuadres, setMostrarSoloDescuadres] = useState(false); 
  
  // --- ESTADOS PARA REPORTES ---
  const [showReporteProd, setShowReporteProd] = useState(false);
  const [showReporteGen, setShowReporteGen] = useState(false);
  const [reporteAgrupado, setReporteAgrupado] = useState<any[]>([]);
  const [resumenFinanciero, setResumenFinanciero] = useState<any>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // --- ESTADO PARA MOTOR DE REIMPRESIÓN (AISLADO) ---
  const [datosImpresion, setDatosImpresion] = useState<any>(null);

  // --- 1. CARGA DE DATOS (HISTORIAL GENERAL) ---
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

  // --- 2. FILTRADO INTELIGENTE (AUDITORÍA) ---
  const historialFiltrado = useMemo(() => {
    return historial.filter(item => {
      const coincideBusqueda = item.fecha_apertura.includes(filtro) || item.estado.toLowerCase().includes(filtro.toLowerCase());
      if (mostrarSoloDescuadres) {
        return coincideBusqueda && Math.abs(item.descuadre_total || 0) > 0.01;
      }
      return coincideBusqueda;
    });
  }, [filtro, historial, mostrarSoloDescuadres]);

  // --- 3. LÓGICA DE REPORTES DETALLADOS ---
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

  // --- 4. MOTOR DE REIMPRESIÓN ATÓMICA ---
  // Esta función resuelve el problema de la "captura de pantalla" al aislar los datos.
  const ejecutarReimpresion = async (idVenta: string) => {
    try {
      // 1. Recuperamos la data limpia del servidor (Cabecera + Items + Cliente)
      const data = await apiService.getDetalleVenta(idVenta);
      
      // 2. Cargamos el estado de impresión con el mapeo correcto
      setDatosImpresion({
        items: data.items.map((i: any) => ({
          codigo: i.productos?.sku || 'S/C',
          cantidad: i.cantidad,
          descripcion: i.productos?.nombre || 'Producto Desconocido',
          precio_unitario: i.precio_momento,
          total: i.precio_momento * i.cantidad
        })),
        cliente: data.venta.clientes || { nombre_razon_social: "PÚBLICO GENERAL", numero_documento: "0" },
        correlativo: data.venta.correlativo_nota || "P001-XXXXXXX",
        total_letras: data.venta.total_letras || "COPIA DE NOTA DE VENTA",
        subtotal: data.venta.monto_bruto,
        descuento_global: data.venta.monto_descuento,
        total_pagar: data.venta.monto_neto,
        fecha: new Date(data.venta.fecha).toLocaleDateString('es-PE'),
        vendedor: "Auditoría / Reimpresión"
      });

      // 3. Disparamos la impresión. El CSS de NotaPedidoPrint se encargará
      // de ocultar el resto del sistema (incluyendo modales) durante el proceso.
      setTimeout(() => { 
        window.print(); 
        setDatosImpresion(null); // Limpiamos para evitar mezclas en la siguiente impresión
      }, 700); 

    } catch (error) { 
      console.error(error);
      alert("No se pudo recuperar la información de la venta seleccionada"); 
    }
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-indigo-500 font-black tracking-widest uppercase animate-pulse">
      Sincronizando Auditoría Trujillo...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700 relative transition-colors duration-300 print:p-0 print:m-0">
      
      {/* CAPA DE IMPRESIÓN (TOTALMENTE AISLADA PARA PDF) */}
      {/* CIRUGÍA: Eliminamos 'absolute inset-0' para arreglar el bug de celulares.
          Usamos 'hidden print:block' igual que en el módulo de Ventas para asegurar 
          la paginación múltiple y destruir los "fantasmas" de los inputs. */}
      {datosImpresion && (
        <div className="hidden print:block print:w-full print:bg-white">
           <NotaPedidoPrint data={datosImpresion} />
        </div>
      )}

      {/* CABECERA (ESTILO TRUJILLO) */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic transition-colors">Control de Cajas</h1>
          <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic transition-colors">Auditoría de Turnos • v1.1.1</p>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-8 py-5 rounded-3xl text-right transition-colors">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest">Registros Totales</p>
          <p className="text-2xl text-zinc-900 dark:text-white font-black italic transition-colors">{historial.length} TURNOS</p>
        </div>
      </header>

      {/* SECCIÓN DE FILTROS */}
      <section className="bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2.5rem] mb-10 flex flex-wrap gap-4 print:hidden shadow-inner transition-colors">
        <input type="date" onChange={(e) => setFiltro(e.target.value)} className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-zinc-900 dark:text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all cursor-pointer" />
        <input placeholder="BUSCAR POR ESTADO O FECHA..." value={filtro} onChange={(e) => setFiltro(e.target.value.toUpperCase())} className="flex-1 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-zinc-900 dark:text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all uppercase placeholder:text-zinc-300 dark:placeholder:text-zinc-800" />
        
        <button 
          onClick={() => setMostrarSoloDescuadres(!mostrarSoloDescuadres)}
          className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${
            mostrarSoloDescuadres 
            ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-500/20' 
            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 border-zinc-300 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {mostrarSoloDescuadres ? '🔔 VIENDO DESCUADRES' : 'MOSTRAR TODO'}
        </button>
      </section>

      {/* TABLA DE AUDITORÍA */}
      <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl print:hidden transition-colors">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-100 dark:bg-black/60 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Apertura / Cierre</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Inicial</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Final (Sistema)</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Diferencia</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Estado</th>
              <th className="p-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {historialFiltrado.map((caja) => {
              const diferencia = Number(caja.descuadre_total || 0);
              const esFaltante = diferencia < -0.01;
              const esSobrante = diferencia > 0.01;
              /**
               * SOLUCIÓN DE AUDITORÍA TRUJILLO:
               * Reemplazamos el parseo simple por uno que respete la cadena literal 
               * enviada por nuestra Vista SQL (que ya está en hora de Lima).
               */
              const formatearFechaLocal = (fechaStr: string) => {
                if (!fechaStr) return null;
                // Quitamos el indicador de zona '+00' o 'Z' para que el navegador 
                // lo trate como hora local de la computadora del usuario.
                const fechaLimpia = fechaStr.replace('Z', '').replace(/\+00$/, '');
                return new Date(fechaLimpia).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                });
              };
              return (
                <tr key={caja.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-500/5 transition-all group">
                  {/* 1. APERTURA / CIERRE */}
                  <td className="p-8">
                    <p className="text-sm font-black text-zinc-900 dark:text-white transition-colors">{new Date(caja.fecha_apertura).toLocaleString('es-PE')}</p>
                    <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-600 mt-2 uppercase italic tracking-tighter transition-colors">
                      {caja.fecha_cierre ? `Cierre: ${new Date(caja.fecha_cierre).toLocaleString('es-PE')}` : '🔓 TURNO ABIERTO'}
                    </p>
                  </td>
                  {/* 2. INICIAL (Dinero físico al abrir) */}
                  <td className="p-8 text-center font-mono text-zinc-400 dark:text-zinc-500">
                    S/ {Number(caja.monto_inicial || 0).toFixed(2)}
                  </td>

                  {/* 3. FINAL SISTEMA (Total Consolidado: Efectivo + Digital) */}
                  <td className="p-8 text-center font-mono text-zinc-900 dark:text-zinc-300 font-bold italic bg-zinc-50/50 dark:bg-white/5 transition-colors">
                    S/ {Number(caja.monto_total_sistema || 0).toFixed(2)}
                  </td>

                  {/* 4. DIFERENCIA (Cruce global de arqueo) */}
                  <td className={`p-8 text-center font-mono font-black text-sm transition-all`}>
                    <div className={`px-4 py-2 rounded-xl inline-block ${
                      esFaltante ? 'bg-red-500/10 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-500/20' : 
                       esSobrante ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20' : 
                      'text-zinc-400 dark:text-zinc-500'
                    }`}>
                      {esSobrante ? '+' : ''} S/ {diferencia.toFixed(2)}
                    </div>
                  </td>

                  {/* 5. ESTADO */}
                  <td className="p-8 text-center">
                    <span className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                      caja.estado === 'CERRADA' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-200 dark:border-emerald-500/20 animate-pulse'
                    }`}>
                      {caja.estado}
                    </span>
                  </td>
                  
                  <td className="p-8 text-center space-x-3">
                    <button onClick={() => verReporteProductos(caja.id)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black rounded-xl uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-95">📦 Productos</button>
                    <button onClick={() => verReporteGeneral(caja.id)} className="px-5 py-2.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-[9px] font-black rounded-xl uppercase transition-all">📊 General</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DETALLE DE VENTAS --- */}
      {showReporteProd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-900/90 dark:bg-black/90 backdrop-blur-xl p-4 print:hidden transition-colors">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-5xl shadow-2xl animate-in zoom-in duration-300 transition-colors">
            <div className="flex justify-between items-start mb-10 text-zinc-900 dark:text-white font-black uppercase italic text-4xl transition-colors">
              <h2>Detalle de Ventas</h2>
              <button onClick={() => setShowReporteProd(false)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="space-y-6 max-h-[550px] overflow-y-auto pr-4 custom-scrollbar">
                {reporteAgrupado.map((nota, idx) => (
                  <div key={idx} className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden group mb-6 transition-colors">
                    <div className="p-6 bg-zinc-100 dark:bg-zinc-800/20 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center transition-colors">
                       <div>
                         <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-500 uppercase tracking-widest block mb-1 transition-colors">Nota de Venta</span>
                         <h3 className="text-zinc-900 dark:text-white font-black italic tracking-tighter transition-colors">{nota.correlativo}</h3>
                       </div>
                       <div className="text-center">
                         <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1 transition-colors">Cliente Atendido</span>
                         <p className="text-zinc-600 dark:text-zinc-300 font-bold uppercase text-[11px] transition-colors">{nota.cliente}</p>
                       </div>
                       {/* BOTÓN DE REIMPRESIÓN ATÓMICO */}
                       <button 
                        onClick={() => ejecutarReimpresion(nota.id_venta)} 
                        disabled={cargandoDetalle}
                        className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl transition-all font-black text-[10px] uppercase flex items-center gap-2"
                       >
                         🖨️ {cargandoDetalle ? '...' : 'Reimprimir'}
                       </button>
                    </div>
                    <table className="w-full text-left text-xs">
                      <tbody>
                        {nota.productos.map((prod: any, pIdx: number) => (
                          <tr key={pIdx} className="border-b border-zinc-100 dark:border-zinc-800/50 transition-colors">
                            <td className="p-5 font-bold text-zinc-500 dark:text-zinc-400 uppercase transition-colors">{prod.nombre}</td>
                            <td className="p-5 text-center text-zinc-400 dark:text-zinc-500 font-black transition-colors">x{prod.cantidad}</td>
                            <td className="p-5 text-center text-zinc-500 dark:text-zinc-600 transition-colors">S/ {prod.precio_venta.toFixed(2)}</td>
                            <td className="p-5 text-right text-emerald-600 dark:text-emerald-400 font-black italic transition-colors">S/ {prod.total_item.toFixed(2)}</td>
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

      {/* --- MODAL REPORTE GENERAL FINANCIERO --- */}
      {showReporteGen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-900/90 dark:bg-black/90 backdrop-blur-xl p-4 print:hidden transition-colors">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 transition-colors">
            <div className="flex justify-between items-start mb-10 text-zinc-900 dark:text-white font-black text-4xl transition-colors">
              <h2>Resumen Financiero</h2>
              <button onClick={() => setShowReporteGen(false)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors text-3xl">✕</button>
            </div>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-zinc-50 dark:bg-black rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-inner transition-colors">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase mb-2 italic transition-colors">Efectivo Inicial</p>
                    <p className="text-2xl text-zinc-900 dark:text-white font-black transition-colors">S/ {resumenFinanciero?.monto_inicial.toFixed(2)}</p>
                  </div>
                  <div className="p-6 bg-zinc-50 dark:bg-black rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-inner transition-colors">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase mb-2 italic transition-colors">Ventas Efectivo</p>
                    <p className="text-2xl text-emerald-600 dark:text-emerald-400 font-black transition-colors">S/ {resumenFinanciero?.ventas_por_metodo.EFECTIVO.toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-8 bg-zinc-100 dark:bg-zinc-800/20 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 space-y-4 text-zinc-900 dark:text-white text-xs transition-colors">
                    <div className="flex justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 uppercase text-zinc-500 transition-colors"><span>Yape:</span> <span className="text-zinc-900 dark:text-white font-bold transition-colors">S/ {resumenFinanciero?.ventas_por_metodo.YAPE.toFixed(2)}</span></div>
                    <div className="flex justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 uppercase text-zinc-500 transition-colors"><span>Plin:</span> <span className="text-zinc-900 dark:text-white font-bold transition-colors">S/ {resumenFinanciero?.ventas_por_metodo.PLIN.toFixed(2)}</span></div>
                    <div className="flex justify-between uppercase text-zinc-500 transition-colors"><span>Transferencias:</span> <span className="text-zinc-900 dark:text-white font-bold transition-colors">S/ {resumenFinanciero?.ventas_por_metodo.TRANSFERENCIA.toFixed(2)}</span></div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}