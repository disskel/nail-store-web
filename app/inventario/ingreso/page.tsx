'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
import * as XLSX from 'xlsx';

/**
 * MÓDULO DE REGISTRO DE INGRESOS - ALTA DENSIDAD PRO
 * Diseño Full-Width corporativo, Toolbar en línea y layout financiero.
 */
export default function RegistrarIngreso() {
  // --- 1. ESTADOS DEL SISTEMA ---
  const [productosFull, setProductosFull] = useState<any[]>([]);
  const [filtroBusqueda, setFiltroBusqueda] = useState(''); 
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
    }).slice(0, 50); 
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

  // --- 3. SINCRONIZACIÓN FINANCIERA ---
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

  // --- 4. LÓGICA DE DESCARGA EXCEL ---
  const descargarReporteExcel = async () => {
    setExportando(true);
    try {
      const data = await apiService.getReporteCompleto();
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario Nail-Store");
      XLSX.writeFile(workbook, `Inventario_NailStore_${new Date().toLocaleDateString()}.xlsx`);
      setMensaje({ texto: '✅ REPORTE EXPORTADO CORRECTAMENTE', tipo: 'success' });
    } catch (error: any) { 
      setMensaje({ texto: '❌ ERROR: NO AUTORIZADO', tipo: 'error' }); 
    } finally { setExportando(false); setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000); }
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
      setMensaje({ texto: `✅ STOCK ACTUALIZADO CON ÉXITO`, tipo: 'success' });
      setFormData({ ...formData, id_producto: '', cantidad: 1, documento_referencia: '', costo_nuevo: 0, costo_total_lote: 0 });
      setProductoSeleccionado(null); setPreciosConfirmados(false); setFiltroBusqueda('');
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
    } catch (err: any) { setMensaje({ texto: `❌ ERROR SERVIDOR`, tipo: 'error' }); } 
    finally { setCargando(false); }
  };

  return (
    <div className="p-4 lg:p-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500 text-xs transition-colors duration-300">
      
      {/* CABECERA CORPORATIVA */}
      <header className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 text-white p-4 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">Registrar Ingreso</h1>
          <p className="text-emerald-500 font-bold uppercase text-[9px] tracking-widest mt-1">Módulo de Compras • Ingreso de Mercadería</p>
        </div>
        
        <button type="button" onClick={descargarReporteExcel} disabled={exportando} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 border border-emerald-500/30 rounded-lg text-emerald-500 font-black text-[9px] uppercase hover:bg-emerald-600 hover:text-white transition-all">
          📊 {exportando ? 'EXPORTANDO...' : 'DESCARGAR REPORTE EXCEL'}
        </button>
      </header>

      {/* BARRA DE BÚSQUEDA (TOOLBAR) IN-LINE */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl mb-4 shadow-sm flex flex-col lg:flex-row gap-3 items-end transition-colors">
        <div className="w-full lg:w-1/4">
           <label className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1 mb-1 block">Filtrar Proveedor</label>
           <select value={proveedorFiltro} onChange={(e) => { setProveedorFiltro(e.target.value); manejarCambioProducto(''); }} className="w-full p-2 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white font-bold text-[10px] outline-none focus:border-indigo-500 transition-colors">
              <option value="">TODOS</option>
              {proveedoresUnicos.map(prov => <option key={prov} value={prov}>{prov}</option>)}
           </select>
        </div>
        <div className="w-full lg:w-1/3">
           <label className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1 mb-1 block">Buscar Producto</label>
           <input placeholder="ESCRIBA SKU O NOMBRE..." value={filtroBusqueda} onChange={(e) => setFiltroBusqueda(e.target.value)} className="w-full p-2 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white font-bold text-[10px] outline-none focus:border-indigo-500 uppercase transition-colors" />
        </div>
        <div className="w-full lg:flex-1">
           <label className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ml-1 mb-1 block">Seleccionar Ítem ({productosFiltrados.length} resultados)</label>
           <select required value={formData.id_producto} onChange={(e) => manejarCambioProducto(e.target.value)} className="w-full p-2 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-emerald-600 dark:text-emerald-400 font-black text-[10px] outline-none focus:border-emerald-500 transition-colors">
              <option value="">-- SELECCIONE UN PRODUCTO DE LA LISTA --</option>
              {productosFiltrados.map(p => ( <option key={p.id} value={p.id}>{p.nombre.toUpperCase()}</option> ))}
           </select>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* COLUMNA IZQUIERDA: OPERACIONES (75%) */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* PANEL DE HISTORIAL (COMPACTO) */}
          {productoSeleccionado && historialCorto.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 p-3 rounded-xl transition-colors">
              <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 ml-1">Referencia Histórica (Últimas Compras)</p>
              <div className="flex flex-wrap gap-2">
                {historialCorto.map((h, idx) => (
                  <div key={idx} className="flex-1 min-w-[150px] bg-white dark:bg-black/30 p-2 rounded-lg border border-indigo-100 dark:border-zinc-800/50 flex justify-between items-center transition-colors">
                    <div>
                      <p className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase">{new Date(h.fecha_cambio).toLocaleDateString()}</p>
                      <p className="text-[10px] font-black text-zinc-900 dark:text-white">S/ {Number(h.costo_nuevo || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-500 uppercase">Men: S/ {Number(h.precio_nuevo_menor || 0).toFixed(2)}</p>
                      <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-500 uppercase">May: S/ {Number(h.precio_nuevo_mayor || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PANEL MIXTO: DETALLE FACTURA + AJUSTE PRECIOS */}
          {productoSeleccionado && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* BLOQUE A: DETALLE FACTURA */}
              <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm transition-colors">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <span className="w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 rounded-full"></span> 2. Detalle de Factura
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 mb-1 block">Unidades</label>
                      <input required type="number" min="1" value={formData.cantidad == 0 ? '' : formData.cantidad} onChange={e => manejarCambioUnidadOCosto(parseInt(e.target.value) || 0, formData.costo_nuevo)} className="w-full p-2 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg font-black text-sm text-center text-zinc-900 dark:text-white transition-colors outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 mb-1 block">Costo Unit (S/)</label>
                      <input required type="number" step="0.01" value={formData.costo_nuevo === 0 ? '' : formData.costo_nuevo} onChange={e => manejarCambioUnidadOCosto(formData.cantidad, parseNum(e.target.value))} className="w-full p-2 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg font-black text-sm text-center text-emerald-600 dark:text-emerald-400 transition-colors outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase ml-1 mb-1 block">Costo Total Lote (S/)</label>
                    <input required type="number" step="0.01" value={formData.costo_total_lote === 0 ? '' : formData.costo_total_lote} onChange={e => manejarCambioTotalLote(parseNum(e.target.value))} className="w-full p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg font-black text-xl text-center text-emerald-700 dark:text-emerald-400 outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                </div>
              </section>

              {/* BLOQUE B: AJUSTE PRECIOS */}
              <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm transition-colors">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <span className="w-1.5 h-1.5 bg-amber-600 dark:bg-amber-400 rounded-full"></span> 3. Ajuste de Precios
                </h3>
                <div className="space-y-3">
                   {/* PRECIO MENOR */}
                   <div className="flex flex-col gap-1 p-2 bg-zinc-50 dark:bg-black/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black text-zinc-500 uppercase">Margen Menor (%)</label>
                        <input type="number" value={formData.margen_menor} onChange={e => manejarCambioMargen('menor', parseNum(e.target.value))} className="w-12 bg-transparent text-right font-black text-amber-600 dark:text-amber-500 outline-none text-[10px]" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-zinc-400 pl-1">S/</span>
                        <input type="number" step="0.01" value={formData.precio_menor_nuevo === 0 ? '' : formData.precio_menor_nuevo} onChange={e => recalcarMargenDesdePrecio('menor', parseNum(e.target.value))} className="flex-1 bg-transparent text-right text-lg font-black text-zinc-900 dark:text-white outline-none pr-1" />
                      </div>
                   </div>

                   {/* PRECIO MAYOR */}
                   <div className="flex flex-col gap-1 p-2 bg-zinc-50 dark:bg-black/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black text-zinc-500 uppercase">Margen Mayor (%)</label>
                        <input type="number" value={formData.margen_mayor} onChange={e => manejarCambioMargen('mayor', parseNum(e.target.value))} className="w-12 bg-transparent text-right font-black text-amber-600 dark:text-amber-500 outline-none text-[10px]" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-zinc-400 pl-1">S/</span>
                        <input type="number" step="0.01" value={formData.precio_mayor_nuevo === 0 ? '' : formData.precio_mayor_nuevo} onChange={e => recalcarMargenDesdePrecio('mayor', parseNum(e.target.value))} className="flex-1 bg-transparent text-right text-lg font-black text-zinc-900 dark:text-white outline-none pr-1" />
                      </div>
                   </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: ACCIONES (25% - STICKY) */}
        <div className="lg:col-span-3 lg:sticky lg:top-4 space-y-4">
          
          {productoSeleccionado && (
            <div className="p-3 bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center transition-colors">
              <p className="text-[8px] font-black text-zinc-500 uppercase mb-0.5 tracking-widest">En Edición</p>
              <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-300 uppercase truncate">{productoSeleccionado.nombre}</p>
            </div>
          )}

          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm transition-colors flex flex-col gap-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500 mb-1 ml-1 block">Ref. Documental</label>
              <input placeholder="EJ: FACTURA F-102" value={formData.documento_referencia} onChange={e => setFormData({...formData, documento_referencia: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-indigo-500 font-bold text-zinc-900 dark:text-white uppercase text-[10px] transition-colors" />
            </div>
            
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
               <button type="button" disabled={!productoSeleccionado} onClick={() => setPreciosConfirmados(true)} className={`w-full py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${preciosConfirmados ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700'}`}>
                 {preciosConfirmados ? '✅ PRECIOS VALIDADOS' : '💾 VALIDAR PRECIOS'}
               </button>
               
               <button type="submit" disabled={cargando || !preciosConfirmados || !formData.id_producto} className={`w-full py-3 rounded-lg font-black text-[10px] tracking-widest shadow-md transition-all uppercase ${cargando || !preciosConfirmados || !formData.id_producto ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'}`}>
                {cargando ? 'PROCESANDO...' : '🚀 ACTUALIZAR STOCK'}
              </button>
            </div>
          </section>

        </div>
      </form>

      {/* NOTIFICACIONES TOAST */}
      {mensaje.texto && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-center font-black text-[9px] uppercase tracking-widest shadow-2xl z-[100] transition-all animate-in slide-in-from-bottom duration-300 ${mensaje.tipo === 'success' ? 'bg-emerald-500 border border-emerald-400 text-white' : 'bg-red-500 border border-red-400 text-white'}`}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}