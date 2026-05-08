'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
import * as XLSX from 'xlsx';

/**
 * MÓDULO DE REGISTRO DE INGRESOS PRO (v1.0.33)
 * Actualización: Layout horizontal "No-Scroll" y Buscador de búsqueda rápida.
 * Propósito: Agilizar la entrada de mercadería y el cálculo de márgenes en tiempo real.
 */
export default function RegistrarIngreso() {
  // --- 1. ESTADOS DEL SISTEMA ---
  const [productosFull, setProductosFull] = useState<any[]>([]);
  const [filtroBusqueda, setFiltroBusqueda] = useState(''); // Nuevo: Buscador de texto
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [historialCorto, setHistorialCorto] = useState<any[]>([]); 
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [preciosConfirmados, setPreciosConfirmados] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [formData, setFormData] = useState({
    id_producto: '', cantidad: 1, costo_nuevo: 0, costo_total_lote: 0, 
    margen_menor: 30, margen_mayor: 15, precio_menor_nuevo: 0, 
    precio_mayor_nuevo: 0, documento_referencia: ''
  });

  // --- 2. LÓGICA DE FILTROS INTELIGENTES ---
  const proveedoresUnicos = useMemo(() => {
    const provs = productosFull.map(p => p.proveedor?.toUpperCase() || 'SIN PROVEEDOR');
    return Array.from(new Set(provs)).sort();
  }, [productosFull]);

  const productosFiltrados = useMemo(() => {
    return productosFull.filter(p => {
      const coincideProv = !proveedorFiltro || p.proveedor?.toUpperCase() === proveedorFiltro;
      const coincideTexto = !filtroBusqueda || p.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) || p.sku?.toLowerCase().includes(filtroBusqueda.toLowerCase());
      return coincideProv && coincideTexto;
    }).slice(0, 50); // Limitamos para rendimiento
  }, [proveedorFiltro, filtroBusqueda, productosFull]);

  useEffect(() => {
    async function cargarCatalogo() {
      try {
        const data = await apiService.getProductosParaIngreso();
        setProductosFull(data);
      } catch (error) { setMensaje({ texto: '❌ ERROR DE CONEXIÓN', tipo: 'error' }); }
    }
    cargarCatalogo();
  }, []);

  // --- 3. SINCRONIZACIÓN FINANCIERA (TRUJILLO STYLE) ---
  const parseNum = (val: string) => {
    if (val === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const syncMargenAPrecio = (costoUnit: number, mMenor: number, mMayor: number) => {
    return {
      precio_menor_nuevo: Number((costoUnit * (1 + mMenor / 100)).toFixed(2)),
      precio_mayor_nuevo: Number((costoUnit * (1 + mMayor / 100)).toFixed(2))
    };
  };

  const manejarCambioUnidadOCosto = (cant: number, unit: number) => {
    const totalLote = Number((cant * unit).toFixed(2));
    const nuevosPrecios = syncMargenAPrecio(unit, formData.margen_menor, formData.margen_mayor);
    setFormData(prev => ({ ...prev, cantidad: cant, costo_nuevo: unit, costo_total_lote: totalLote, ...nuevosPrecios }));
    setPreciosConfirmados(false);
  };

   // RECALCULO DE COSTO TOTAL LOTE (Ajustado a 2 decimales para Trujillo)[cite: 14]
  const manejarCambioTotalLote = (total: number) => {
    const cant = formData.cantidad || 1;
    const unit = Number((total / cant).toFixed(2)); 
    const nuevosPrecios = syncMargenAPrecio(unit, formData.margen_menor, formData.margen_mayor);
    setFormData(prev => ({ ...prev, costo_total_lote: total, costo_nuevo: unit, ...nuevosPrecios }));
    setPreciosConfirmados(false);
  };

  const manejarCambioMargen = (tipo: 'menor' | 'mayor', nuevoMargen: number) => {
    const costo = formData.costo_nuevo || 0;
    const nuevosPrecios = tipo === 'menor' 
      ? { precio_menor_nuevo: Number((costo * (1 + nuevoMargen / 100)).toFixed(2)) }
      : { precio_mayor_nuevo: Number((costo * (1 + nuevoMargen / 100)).toFixed(2)) };
    
    setFormData(prev => ({ 
      ...prev, 
      [tipo === 'menor' ? 'margen_menor' : 'margen_mayor']: nuevoMargen,
      ...nuevosPrecios 
    }));
    setPreciosConfirmados(false);
  };

  const recalcarMargenDesdePrecio = (tipo: 'menor' | 'mayor', nuevoPrecio: number) => {
    const costo = formData.costo_nuevo || 1;
    const nuevoMargen = Number((((nuevoPrecio / costo) - 1) * 100).toFixed(2));
    setFormData(prev => ({ ...prev, [tipo === 'menor' ? 'precio_menor_nuevo' : 'precio_mayor_nuevo']: nuevoPrecio, [tipo === 'menor' ? 'margen_menor' : 'margen_mayor']: nuevoMargen }));
    setPreciosConfirmados(false);
  };

  const manejarCambioProducto = async (id: string) => {
    const prod = productosFull.find(p => p.id === id);
    setProductoSeleccionado(prod);
    setPreciosConfirmados(false);
    setHistorialCorto([]); 

    if (prod) {
      const costoInicial = prod.costo || 0;
      manejarCambioUnidadOCosto(1, costoInicial);
      setFormData(prev => ({ ...prev, id_producto: id }));
      try {
        const h = await apiService.getHistorialIngresosCorta(id);
        setHistorialCorto(h);
      } catch (err) { console.error("Fallo carga de referencia histórica"); }
    }
  };

  // -------------------------------------------------------------------------
  // 4. LÓGICA DE DESCARGA EXCEL
  // -------------------------------------------------------------------------
  const descargarReporteExcel = async () => {
    setExportando(true);
    try {
      const data = await apiService.getReporteCompleto();
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario Nail-Store");
      XLSX.writeFile(workbook, `Inventario_NailStore_${new Date().toLocaleDateString()}.xlsx`);
      setMensaje({ texto: '✅ REPORTE EXPORTADO', tipo: 'success' });
    } catch (error: any) { 
      setMensaje({ texto: '❌ ERROR: NO AUTORIZADO', tipo: 'error' }); 
    } finally { setExportando(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preciosConfirmados) return;
    setCargando(true);
    try {
      await apiService.registrarIngreso({ 
        id_producto: formData.id_producto, cantidad: formData.cantidad, 
        costo_nuevo: formData.costo_nuevo, precio_menor_nuevo: formData.precio_menor_nuevo, 
        precio_mayor_nuevo: formData.precio_mayor_nuevo, documento_referencia: formData.documento_referencia 
      });
      setMensaje({ texto: `✅ STOCK ACTUALIZADO`, tipo: 'success' });
      setFormData({ ...formData, id_producto: '', cantidad: 1, documento_referencia: '', costo_nuevo: 0, costo_total_lote: 0 });
      setProductoSeleccionado(null); setPreciosConfirmados(false); setFiltroBusqueda('');
    } catch (err: any) { setMensaje({ texto: `❌ ERROR SERVIDOR`, tipo: 'error' }); } 
    finally { setCargando(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      {/* CABECERA */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase italic">Registrar Ingreso</h1>
          <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Módulo de Compras • v1.0.33</p>
        </div>
        <button type="button" onClick={descargarReporteExcel} disabled={exportando} className="flex items-center gap-3 px-6 py-4 bg-emerald-600/10 border border-emerald-500/30 rounded-2xl text-emerald-500 font-black text-xs uppercase hover:bg-emerald-500 hover:text-white transition-all">
          📊 Descargar Reporte Excel
        </button>
      </header>

      {/* --- BARRA DE LOCALIZACIÓN RÁPIDA (HORIZONTAL) --- */}
      <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] mb-8 backdrop-blur-xl shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-3">
             <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-4 mb-2 block">Filtrar por Proveedor</label>
             <select value={proveedorFiltro} onChange={(e) => { setProveedorFiltro(e.target.value); manejarCambioProducto(''); }} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-indigo-600">
                <option value="">TODOS</option>
                {proveedoresUnicos.map(prov => <option key={prov} value={prov}>{prov}</option>)}
             </select>
          </div>
          <div className="md:col-span-4">
             <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-4 mb-2 block">Buscar Producto (SKU o Nombre)</label>
             <input placeholder="ESCRIBA PARA BUSCAR..." value={filtroBusqueda} onChange={(e) => setFiltroBusqueda(e.target.value)} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-indigo-600 uppercase" />
          </div>
          <div className="md:col-span-5">
             <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-4 mb-2 block">Seleccionar Resultado</label>
             <select required value={formData.id_producto} onChange={(e) => manejarCambioProducto(e.target.value)} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-emerald-400 font-black outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">-- {productosFiltrados.length} COINCIDENCIAS --</option>
                {productosFiltrados.map(p => ( <option key={p.id} value={p.id}>{p.nombre.toUpperCase()}</option> ))}
             </select>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUMNA IZQUIERDA: OPERACIONES (8 COLUMNAS) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* PANEL DE HISTORIAL (COMPACTO HORIZONTAL) */}
          {productoSeleccionado && historialCorto.length > 0 && (
            <div className="bg-indigo-600/5 border border-indigo-500/20 p-6 rounded-[2rem]">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4 ml-4">Referencia Histórica (Últimas 3 Compras)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {historialCorto.map((h, idx) => (
                  <div key={idx} className="bg-black/30 p-4 rounded-2xl border border-zinc-800/50">
                    <p className="text-[9px] font-black text-zinc-500 mb-1">{new Date(h.fecha_cambio).toLocaleDateString()}</p>
                    <p className="text-sm font-black text-white">S/ {Number(h.costo_nuevo || 0).toFixed(2)} <span className="text-[9px] text-zinc-500 font-normal">COSTO</span></p>
                    <p className="text-[9px] font-bold text-emerald-500 mt-1 uppercase">Venta: S/ {Number(h.precio_nuevo_menor || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PANEL MIXTO: DETALLE FACTURA + AJUSTE PRECIOS (LADO A LADO) */}
          {productoSeleccionado && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* BLOQUE A: DETALLE FACTURA */}
              <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-8 flex items-center gap-3">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span> 2. Detalle de Factura
                </h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-500 uppercase ml-4">Unidades</label>
                      <input required type="number" min="1" value={formData.cantidad} onChange={e => manejarCambioUnidadOCosto(parseInt(e.target.value) || 0, formData.costo_nuevo)} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl font-black text-2xl text-center text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-500 uppercase ml-4">Costo Unit (S/)</label>
                      <input required type="number" step="0.01" value={formData.costo_nuevo} onChange={e => manejarCambioUnidadOCosto(formData.cantidad, parseNum(e.target.value))} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl font-black text-2xl text-center text-emerald-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-emerald-500/50 uppercase ml-4">Costo Total Lote (S/)</label>
                    <input required type="number" step="0.01" value={formData.costo_total_lote} onChange={e => manejarCambioTotalLote(parseNum(e.target.value))} className="w-full p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl font-black text-4xl text-center text-emerald-500 outline-none" />
                  </div>
                </div>
              </section>

              {/* BLOQUE B: AJUSTE PRECIOS */}
              <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-8 flex items-center gap-3">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span> 3. Ajuste de Precios
                </h3>
                <div className="space-y-4">
                   <div className="p-4 bg-black/40 rounded-2xl border border-zinc-800">
                      <div className="flex justify-between items-center mb-2 px-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase">Margen Menor (%)</label>
                        <input type="number" value={formData.margen_menor} onChange={e => manejarCambioMargen('menor', parseNum(e.target.value))} className="w-16 bg-transparent text-right font-black text-amber-500 outline-none" />
                      </div>
                      <input type="number" step="0.01" value={formData.precio_menor_nuevo} onChange={e => recalcarMargenDesdePrecio('menor', parseNum(e.target.value))} className="w-full bg-transparent text-center text-3xl font-black text-white outline-none" />
                   </div>
                   <div className="p-4 bg-black/40 rounded-2xl border border-zinc-800">
                      <div className="flex justify-between items-center mb-2 px-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase">Margen Mayor (%)</label>
                        <input type="number" value={formData.margen_mayor} onChange={e => manejarCambioMargen('mayor', parseNum(e.target.value))} className="w-16 bg-transparent text-right font-black text-amber-500 outline-none" />
                      </div>
                      <input type="number" step="0.01" value={formData.precio_mayor_nuevo} onChange={e => recalcarMargenDesdePrecio('mayor', parseNum(e.target.value))} className="w-full bg-transparent text-center text-3xl font-black text-white outline-none" />
                   </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: ACCIONES (STICKY EN ESCRITORIO) */}
        <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 ml-2">Referencia Documental</h3>
            <input required placeholder="EJ: FACTURA F-102" value={formData.documento_referencia} onChange={e => setFormData({...formData, documento_referencia: e.target.value.toUpperCase()})} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-white uppercase mb-6" />
            
            <div className="space-y-4">
               <button type="button" disabled={!productoSeleccionado} onClick={() => setPreciosConfirmados(true)} className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${preciosConfirmados ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-zinc-800 text-zinc-500 hover:text-white border border-zinc-700'}`}>
                 {preciosConfirmados ? '✅ PRECIOS VALIDADOS' : '💾 VALIDAR PRECIOS'}
               </button>
               
               <button type="submit" disabled={cargando || !preciosConfirmados || !formData.id_producto} className={`w-full py-8 rounded-[2.25rem] font-black text-xl tracking-tighter shadow-2xl transition-all active:scale-95 uppercase ${cargando || !preciosConfirmados || !formData.id_producto ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-40' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40'}`}>
                {cargando ? '...' : '🚀 ACTUALIZAR STOCK'}
              </button>
            </div>
          </section>

          {productoSeleccionado && (
            <div className="p-6 bg-black/40 border border-zinc-800 rounded-[2rem] text-center">
              <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Producto en Edición</p>
              <p className="text-xs font-black text-zinc-300 uppercase italic">{productoSeleccionado.nombre}</p>
            </div>
          )}
        </div>
      </form>

      {/* NOTIFICACIONES */}
      {mensaje.texto && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 p-6 rounded-2xl text-center font-black text-sm border animate-in slide-in-from-bottom duration-300 shadow-2xl z-[100] ${mensaje.tipo === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'}`}>
          {mensaje.texto.toUpperCase()}
        </div>
      )}
    </div>
  );
}