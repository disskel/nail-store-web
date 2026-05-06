'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
// Importamos el componente de impresión que ya usas en ventas
import NotaPedidoPrint from '../ventas/components/NotaPedidoPrint';

/**
 * MÓDULO DE GESTIÓN DE CAJAS PRO (v1.0.31)
 * Incluye: Auditoría de saldos, Reporte General y Reimpresión de documentos.
 * Propósito: Visualizar el historial de turnos, saldos y reportes de productos.
 */
export default function HistorialCajas() {
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  
  // Estados para el reporte detallado (Modal)
  const [showReporteProd, setShowReporteProd] = useState(false);
  const [showReporteGen, setShowReporteGen] = useState(false);
  const [reporteData, setReporteData] = useState<any>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // --- ESTADO PARA REIMPRESIÓN ---
  const [datosImpresion, setDatosImpresion] = useState<any>(null);

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
    setCargandoDetalle(true);
    setShowReporteProd(true);
    try {
      const data = await apiService.getReporteProductosPorTurno(sesionId);
      setReporteData(data);
    } catch (error) {
      alert("Error al cargar el detalle de productos");
    } finally {
      setCargandoDetalle(false);
    }
  };

  // --- 4. MOTOR DE REIMPRESIÓN ---
  const ejecutarReimpresion = async (idVenta: string) => {
    if (!idVenta) return;
    try {
      // Endpoint sugerido en el backend para traer cabecera + items + cliente
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
        vendedor: "Sistema Auditoría"
      });

      // Disparo de impresión
      setTimeout(() => {
        window.print();
        setDatosImpresion(null);
      }, 500);

    } catch (error) {
      alert("No se pudo recuperar la venta para reimprimir");
    }
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-indigo-500 font-black tracking-widest uppercase animate-pulse">
      Cargando Historial...
    </div>
  );

  // Reporte General: Auditoría de Arqueo (Apps vs Efectivo)
  const verReporteGeneral = async (sesionId: string) => {
    setCargandoDetalle(true);
    setShowReporteGen(true);
    try {
      // Usamos el resumen que ya calcula los 4 métodos de pago
      const data = await apiService.getResumenCaja(sesionId);
      setReporteData(data);
    } catch (error) {
      alert("Error al cargar resumen financiero");
    } finally {
      setCargandoDetalle(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* COMPONENTE DE IMPRESIÓN OCULTO (Solo se activa al reimprimir) */}
      {datosImpresion && (
        <div className="hidden print:block print:absolute print:inset-0 print:z-[500] print:bg-white">
           <NotaPedidoPrint data={datosImpresion} />
        </div>
      )}

      {/* CABECERA DE ESTADÍSTICAS (Estilo Dashboard) */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Control de Cajas</h1>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Auditoría de Turnos • Trujillo Centro</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 px-8 py-5 rounded-3xl text-right backdrop-blur-md">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Turnos en Registro</p>
          <p className="text-2xl text-white font-black italic tracking-tighter">{historial.length} SESIONES</p>
        </div>
      </header>

      {/* FILTROS Y BÚSQUEDA */}
      <section className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem] mb-8 flex gap-4 print:hidden shadow-inner">
        <input 
          type="date" 
          onChange={(e) => setFiltro(e.target.value)}
          className="bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all" 
        />
        <input 
          placeholder="BUSCAR POR ESTADO..." 
          value={filtro}
          onChange={(e) => setFiltro(e.target.value.toUpperCase())}
          className="flex-1 bg-black border border-zinc-800 p-4 rounded-2xl text-white font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all uppercase placeholder:text-zinc-700" 
        />
      </section>

      {/* TABLA DE HISTORIAL (Basada en tu imagen de referencia) */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl print:hidden">
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
          <tbody className="divide-y divide-zinc-800/50">
            {historialFiltrado.map((caja) => {
              // Lógica de saldo negativo: Si terminó con menos de lo que empezó
              const esNegativo = Number(caja.saldo_final_efectivo || 0) < Number(caja.monto_inicial);
              
              return (
                <tr key={caja.id} className="hover:bg-indigo-500/5 transition-all group">
                  <td className="p-8">
                    <p className="text-sm font-black text-white">{new Date(caja.fecha_apertura).toLocaleString('es-PE')}</p>
                    <p className="text-[10px] font-bold text-zinc-500 mt-2 uppercase italic tracking-tighter">
                      {caja.fecha_cierre ? `Cerrado: ${new Date(caja.fecha_cierre).toLocaleString('es-PE')}` : '🔓 TURNO EN CURSO'}
                    </p>
                  </td>
                  <td className="p-8 text-center font-mono text-zinc-500 text-sm">S/ {Number(caja.monto_inicial).toFixed(2)}</td>
                  <td className={`p-8 text-center font-mono font-black text-lg italic ${esNegativo ? 'text-red-500' : 'text-emerald-400'}`}>
                    {esNegativo ? '-' : ''} S/ {Math.abs(Number(caja.saldo_final_efectivo || 0)).toFixed(2)}
                  </td>
                  <td className="p-8 text-center">
                    <span className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                      caja.estado === 'CERRADA' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse'
                    }`}>
                      {caja.estado}
                    </span>
                  </td>
                  <td className="p-8 text-center space-x-3">
                    <button onClick={() => verReporteProductos(caja.id)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black rounded-xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20">📦 Productos</button>
                    <button onClick={() => verReporteGeneral(caja.id)} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] font-black rounded-xl uppercase tracking-widest transition-all active:scale-95">📊 General</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- MODAL A: REPORTE DE PRODUCTOS + REIMPRESIÓN --- */}
      {showReporteProd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-5xl shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Detalle de Ventas</h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Inventario salido y reimpresión de notas</p>
              </div>
              <button onClick={() => setShowReporteProd(false)} className="text-zinc-600 hover:text-white transition-colors text-3xl">✕</button>
            </div>

            {cargandoDetalle ? (
              <div className="text-center py-24 animate-pulse text-indigo-500 font-black tracking-widest uppercase">Consultando base de datos...</div>
            ) : (
              <div className="space-y-8">
                <div className="max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-zinc-900 z-10 border-b border-zinc-800">
                      <tr className="text-[10px] text-zinc-500 uppercase font-black">
                        <th className="pb-5">Descripción del Producto</th>
                        <th className="pb-5 text-center">Cant</th>
                        <th className="pb-5 text-center">Precio Unit.</th>
                        <th className="pb-5 text-center">Total Item</th>
                        <th className="pb-5 text-right">Cliente</th>
                        <th className="pb-5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {reporteData?.map((item: any, idx: number) => (
                        <tr key={idx} className="group hover:bg-white/5 transition-all">
                          <td className="py-5 font-bold text-white uppercase text-xs">{item.producto}</td>
                          <td className="py-5 text-center text-zinc-400 font-black text-xs">{item.cantidad}</td>
                          <td className="py-5 text-center text-zinc-500 text-xs">S/ {item.precio_venta.toFixed(2)}</td>
                          <td className="py-5 text-center text-emerald-400 font-black text-sm italic">S/ {item.total.toFixed(2)}</td>
                          <td className="py-5 text-right text-indigo-400 font-bold uppercase text-[11px]">{item.cliente}</td>
                          <td className="py-5 text-right">
                             <button onClick={() => ejecutarReimpresion(item.id_venta)} className="p-3 bg-zinc-800 rounded-xl hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100" title="REIMPRIMIR NOTA">🖨️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-8 bg-black/50 rounded-[2rem] border border-zinc-800 flex justify-between items-center shadow-inner">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Total Ventas de Productos en este Turno</p>
                    <p className="text-5xl font-black text-white italic tracking-tighter">
                        S/ {reporteData?.reduce((acc: number, cur: any) => acc + cur.total, 0).toFixed(2)}
                    </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE REPORTE DETALLADO (Productos y Clientes) */}
      {/* --- MODAL B: REPORTE GENERAL (AUDITORÍA FINANCIERA) --- */}
      {showReporteGen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-10">
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Resumen Financiero</h2>
              <button onClick={() => setShowReporteGen(false)} className="text-zinc-600 hover:text-white transition-colors text-3xl">✕</button>
            </div>

            {cargandoDetalle ? (
              <div className="text-center py-24 animate-pulse text-emerald-500 font-black uppercase">Calculando flujo de caja...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-black rounded-3xl border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 font-black uppercase mb-2">Efectivo Inicial</p>
                    <p className="text-2xl text-white font-black">S/ {reporteData?.monto_inicial.toFixed(2)}</p>
                  </div>
                  <div className="p-6 bg-black rounded-3xl border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 font-black uppercase mb-2">Ventas Efectivo</p>
                    <p className="text-2xl text-emerald-400 font-black">S/ {reporteData?.ventas_por_metodo.EFECTIVO.toFixed(2)}</p>
                  </div>
                </div>

                <div className="p-8 bg-zinc-800/30 rounded-[2.5rem] border border-zinc-800 space-y-4">
                  <div className="flex justify-between text-xs font-bold"><span className="text-zinc-500 uppercase">Recaudado Yape:</span> <span className="text-white">S/ {reporteData?.ventas_por_metodo.YAPE.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs font-bold"><span className="text-zinc-500 uppercase">Recaudado Plin:</span> <span className="text-white">S/ {reporteData?.ventas_por_metodo.PLIN.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs font-bold"><span className="text-zinc-500 uppercase">Transferencias:</span> <span className="text-white">S/ {reporteData?.ventas_por_metodo.TRANSFERENCIA.toFixed(2)}</span></div>
                  <div className="border-t border-zinc-700 pt-4 flex justify-between items-end">
                    <p className="text-zinc-400 font-black text-[10px] uppercase">Total Global en Sistema</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">S/ {reporteData?.total_general_caja_bancos.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}