'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
import * as XLSX from 'xlsx';

export default function RegistrarIngreso() {
  // -------------------------------------------------------------------------
  // 1. ESTADOS DEL SISTEMA
  // -------------------------------------------------------------------------
  const [productosFull, setProductosFull] = useState<any[]>([]);
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

  // -------------------------------------------------------------------------
  // 2. LÓGICA DE FILTROS CRUZADOS
  // -------------------------------------------------------------------------
  const proveedoresUnicos = useMemo(() => {
    const provs = productosFull.map(p => p.proveedor?.toUpperCase() || 'SIN PROVEEDOR');
    return Array.from(new Set(provs)).sort();
  }, [productosFull]);

  const productosFiltrados = useMemo(() => {
    if (!proveedorFiltro) return productosFull;
    return productosFull.filter(p => p.proveedor?.toUpperCase() === proveedorFiltro);
  }, [proveedorFiltro, productosFull]);

  useEffect(() => {
    async function cargarCatalogo() {
      try {
        const data = await apiService.getProductosParaIngreso();
        setProductosFull(data);
      } catch (error) { setMensaje({ texto: '❌ ERROR DE CONEXIÓN', tipo: 'error' }); }
    }
    cargarCatalogo();
  }, []);

  // -------------------------------------------------------------------------
  // 3. SINCRONIZACIÓN FINANCIERA (Unidad <-> Lote <-> Margen <-> Precio)
  // -------------------------------------------------------------------------
  
  // Limpiador para inputs numéricos (evita ceros a la izquierda y NaN)[cite: 14]
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
    const unit = Number((total / cant).toFixed(2)); // CAMBIO: Precisión ajustada de 4 a 2 decimales[cite: 14]
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.endsWith('/api') ? process.env.NEXT_PUBLIC_API_URL : `${process.env.NEXT_PUBLIC_API_URL}/api`;
      const response = await fetch(`${baseUrl}/productos/reporte-completo`);
      const data = await response.json();
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario Nail-Store");
      XLSX.writeFile(workbook, `Inventario_NailStore.xlsx`);
    } catch (error: any) { setMensaje({ texto: '❌ ERROR AL EXPORTAR', tipo: 'error' }); } 
    finally { setExportando(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preciosConfirmados) return;
    setCargando(true);
    try {
      await apiService.registrarIngreso({ 
        id_producto: formData.id_producto, 
        cantidad: formData.cantidad, 
        costo_nuevo: formData.costo_nuevo, 
        precio_menor_nuevo: formData.precio_menor_nuevo, 
        precio_mayor_nuevo: formData.precio_mayor_nuevo, 
        documento_referencia: formData.documento_referencia 
      });
      setMensaje({ texto: `✅ STOCK ACTUALIZADO CORRECTAMENTE`, tipo: 'success' });
      setFormData({ ...formData, id_producto: '', cantidad: 1, documento_referencia: '', costo_nuevo: 0, costo_total_lote: 0 });
      setProductoSeleccionado(null);
      setPreciosConfirmados(false);
    } catch (err: any) { setMensaje({ texto: `❌ ERROR SERVIDOR`, tipo: 'error' }); } 
    finally { setCargando(false); }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-700">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Registrar Ingreso</h1>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic text-emerald-500/80">Calculadora Mayorista Activa</p>
        </div>
        <button type="button" onClick={descargarReporteExcel} disabled={exportando} className="flex items-center gap-3 px-6 py-4 bg-emerald-600/10 border border-emerald-500/30 rounded-2xl text-emerald-500 font-black text-xs uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl">
          📊 Descargar Reporte Excel
        </button>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* PASO 1: LOCALIZACIÓN */}
          <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-3">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span> 1. Localización del Producto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <select value={proveedorFiltro} onChange={(e) => { setProveedorFiltro(e.target.value); manejarCambioProducto(''); }} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer">
                <option value="">TODOS LOS PROVEEDORES</option>
                {proveedoresUnicos.map(prov => <option key={prov} value={prov}>{prov}</option>)}
              </select>
              <select required value={formData.id_producto} onChange={(e) => manejarCambioProducto(e.target.value)} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer">
                <option value="">-- SELECCIONE UN ÍTEM --</option>
                {productosFiltrados.map(p => ( <option key={p.id} value={p.id}>{p.nombre.toUpperCase()}</option> ))}
              </select>
            </div>
          </section>

          {/* PANEL DE REFERENCIA HISTÓRICA */}
          {productoSeleccionado && historialCorto.length > 0 && (
            <div className="bg-indigo-600/5 border border-indigo-500/20 p-6 rounded-[2rem] animate-in slide-in-from-top-2 duration-500">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4 ml-2">Referencia de Últimas Compras</p>
              <div className="space-y-2">
                {historialCorto.map((h, idx) => (
                  <div key={idx} className="bg-black/30 p-3 px-5 rounded-xl border border-zinc-800/50 flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                    <div className="text-[10px] font-bold text-zinc-400">
                      <span className="text-zinc-500 font-black mr-2">{new Date(h.fecha_cambio).toLocaleDateString()}:</span>
                      Costo <span className="text-white font-black">S/ {Number(h.costo_nuevo || 0).toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500">
                      Precio <span className="text-emerald-400">S/ {Number(h.precio_nuevo_menor || 0).toFixed(2)} (men)</span> / <span className="text-amber-400">S/ {Number(h.precio_nuevo_mayor || 0).toFixed(2)} (may)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: DETALLE DE LA FACTURA ACTUALIZADO CON 2 DECIMALES[cite: 14] */}
          {productoSeleccionado && (
            <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-3">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span> 2. Detalle de la Factura
                </h3>
                <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-tighter">Sincronización Automática</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Unidades</label>
                  <input required type="number" min="1" value={formData.cantidad === 0 ? '' : formData.cantidad} onChange={e => manejarCambioUnidadOCosto(parseInt(e.target.value) || 0, formData.costo_nuevo)} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl font-black text-3xl text-center text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Costo Unidad (S/)</label>
                  <input required type="number" step="0.01" value={formData.costo_nuevo === 0 ? '' : formData.costo_nuevo} onChange={e => manejarCambioUnidadOCosto(formData.cantidad, parseNum(e.target.value))} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl font-black text-3xl text-center text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-500/50 uppercase ml-2 tracking-widest">Costo Total Lote (S/)</label>
                  <input required type="number" step="0.01" value={formData.costo_total_lote === 0 ? '' : formData.costo_total_lote} onChange={e => manejarCambioTotalLote(parseNum(e.target.value))} className="w-full p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl font-black text-3xl text-center text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
            </section>
          )}

          {/* PASO 3: AJUSTE DE PRECIOS */}
          {productoSeleccionado && (
            <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-8 flex items-center gap-3">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span> 3. Ajuste de Precios Finales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-8 bg-black/40 rounded-[2rem] border border-zinc-800 space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase">Margen Menor (%)</label>
                    <input type="number" step="1" value={formData.margen_menor === 0 ? '' : formData.margen_menor} onChange={e => manejarCambioMargen('menor', parseNum(e.target.value))} className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg p-1 px-3 text-right font-black text-amber-400 outline-none text-lg focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <input type="number" step="0.01" value={formData.precio_menor_nuevo === 0 ? '' : formData.precio_menor_nuevo} onChange={e => recalcarMargenDesdePrecio('menor', parseNum(e.target.value))} className="w-full p-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-3xl font-black text-white text-center focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
                <div className="p-8 bg-black/40 rounded-[2rem] border border-zinc-800 space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase">Margen Mayor (%)</label>
                    <input type="number" step="1" value={formData.margen_mayor === 0 ? '' : formData.margen_mayor} onChange={e => manejarCambioMargen('mayor', parseNum(e.target.value))} className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg p-1 px-3 text-right font-black text-amber-400 outline-none text-lg focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <input type="number" step="0.01" value={formData.precio_mayor_nuevo === 0 ? '' : formData.precio_mayor_nuevo} onChange={e => recalcarMargenDesdePrecio('mayor', parseNum(e.target.value))} className="w-full p-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-3xl font-black text-white text-center focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
              </div>
              <div className="mt-8 flex justify-center">
                <button type="button" onClick={() => setPreciosConfirmados(true)} className={`px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl ${preciosConfirmados ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                  {preciosConfirmados ? '✅ PRECIOS VALIDADOS' : '💾 VALIDAR PRECIOS FINAL'}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-8">
          <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">Referencia Documental</h3>
            <input placeholder="EJ: FACTURA F-102" value={formData.documento_referencia} onChange={e => setFormData({...formData, documento_referencia: e.target.value.toUpperCase()})} className="w-full p-6 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-white uppercase" />
          </section>
          <button type="submit" disabled={cargando || !preciosConfirmados || !formData.id_producto} className={`w-full py-8 rounded-[2.25rem] font-black text-xl tracking-tighter shadow-2xl transition-all active:scale-95 uppercase ${cargando || !preciosConfirmados || !formData.id_producto ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40'}`}>
            {cargando ? 'SINCRONIZANDO...' : '🚀 ACTUALIZAR STOCK'}
          </button>
        </div>
      </form>
      {mensaje.texto && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 p-6 rounded-2xl text-center font-black text-sm border animate-in slide-in-from-bottom duration-300 shadow-2xl z-[100] ${mensaje.tipo === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'}`}>
          {mensaje.texto.toUpperCase()}
        </div>
      )}
    </div>
  );
}