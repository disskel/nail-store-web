'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';

export default function RegistrarIngreso() {
  // ... (Estados permanecen iguales hasta el handleSubmit)
  const [productosFull, setProductosFull] = useState<any[]>([]);
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [preciosConfirmados, setPreciosConfirmados] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [formData, setFormData] = useState({
    id_producto: '',
    cantidad: 1,
    costo_nuevo: 0,
    costo_total_lote: 0, 
    margen_menor: 30,
    margen_mayor: 15,
    precio_menor_nuevo: 0,
    precio_mayor_nuevo: 0,
    documento_referencia: ''
  });

  // --- (Lógica de filtros y sincronización bidireccional igual a la versión anterior) ---
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
    const unit = Number((total / cant).toFixed(4));
    const nuevosPrecios = syncMargenAPrecio(unit, formData.margen_menor, formData.margen_mayor);
    setFormData(prev => ({ ...prev, costo_total_lote: total, costo_nuevo: unit, ...nuevosPrecios }));
    setPreciosConfirmados(false);
  };

  const recalcarMargenDesdePrecio = (tipo: 'menor' | 'mayor', nuevoPrecio: number) => {
    const costo = formData.costo_nuevo || 1;
    const nuevoMargen = Number((((nuevoPrecio / costo) - 1) * 100).toFixed(2));
    setFormData(prev => ({
      ...prev,
      [tipo === 'menor' ? 'precio_menor_nuevo' : 'precio_mayor_nuevo']: nuevoPrecio,
      [tipo === 'menor' ? 'margen_menor' : 'margen_mayor']: nuevoMargen
    }));
    setPreciosConfirmados(false);
  };

  const manejarCambioProducto = (id: string) => {
    const prod = productosFull.find(p => p.id === id);
    setProductoSeleccionado(prod);
    setPreciosConfirmados(false);
    if (prod) {
      const costoInicial = prod.costo || 0;
      manejarCambioUnidadOCosto(1, costoInicial);
      setFormData(prev => ({ ...prev, id_producto: id }));
    }
  };

  // -------------------------------------------------------------------------
  // 4. LÓGICA DE ENVÍO CORREGIDA (LIMPIEZA DE PAYLOAD)
  // -------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preciosConfirmados) return;
    
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      // CRÍTICO: Enviamos solo lo que el servidor espera recibir
      const payloadLimpio = {
        id_producto: formData.id_producto,
        cantidad: formData.cantidad,
        costo_nuevo: formData.costo_nuevo, // El backend debe mapear esto a costo_unidad
        precio_menor_nuevo: formData.precio_menor_nuevo,
        precio_mayor_nuevo: formData.precio_mayor_nuevo,
        documento_referencia: formData.documento_referencia
      };

      await apiService.registrarIngreso(payloadLimpio);
      
      setMensaje({ texto: `✅ STOCK ACTUALIZADO CORRECTAMENTE`, tipo: 'success' });
      setFormData({ ...formData, id_producto: '', cantidad: 1, documento_referencia: '', costo_nuevo: 0, costo_total_lote: 0 });
      setProductoSeleccionado(null);
      setPreciosConfirmados(false);
    } catch (err: any) {
      // Capturamos el error 500 y mostramos el detalle si es posible
      setMensaje({ texto: `❌ ERROR SERVIDOR: ${err.message || 'Verificar Backend'}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  // ... (El resto del JSX permanece igual)
  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-700">
      <header className="mb-10">
        <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Registrar Ingreso</h1>
        <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic text-emerald-500/80">Calculadora Mayorista Activa</p>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-3">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span> 1. Localización del Producto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest text-indigo-300/50">Filtrar Proveedor</label>
                <select value={proveedorFiltro} onChange={(e) => { setProveedorFiltro(e.target.value); manejarCambioProducto(''); }} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer">
                  <option value="">TODOS LOS PROVEEDORES</option>
                  {proveedoresUnicos.map(prov => <option key={prov} value={prov}>{prov}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest text-indigo-300/50">Seleccionar Producto</label>
                <select required value={formData.id_producto} onChange={(e) => manejarCambioProducto(e.target.value)} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer">
                  <option value="">-- SELECCIONE UN ÍTEM --</option>
                  {productosFiltrados.map(p => ( <option key={p.id} value={p.id}>{p.nombre.toUpperCase()}</option> ))}
                </select>
              </div>
            </div>
          </section>

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
                  <input required type="number" min="1" value={formData.cantidad} onChange={e => manejarCambioUnidadOCosto(parseInt(e.target.value) || 0, formData.costo_nuevo)} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl font-black text-3xl text-center text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Costo Unidad (S/)</label>
                  <input required type="number" step="0.0001" value={formData.costo_nuevo} onChange={e => manejarCambioUnidadOCosto(formData.cantidad, parseFloat(e.target.value) || 0)} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl font-black text-3xl text-center text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-500/50 uppercase ml-2 tracking-widest">Costo Total Lote (S/)</label>
                  <input type="number" step="0.01" value={formData.costo_total_lote} onChange={e => manejarCambioTotalLote(parseFloat(e.target.value) || 0)} className="w-full p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl font-black text-3xl text-center text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
            </section>
          )}

          {productoSeleccionado && (
            <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-8 flex items-center gap-3">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span> 3. Ajuste de Precios Finales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-8 bg-black/40 rounded-[2rem] border border-zinc-800 space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase">Margen Menor (%)</label>
                    <input type="number" value={formData.margen_menor} onChange={e => manejarCambioUnidadOCosto(formData.cantidad, formData.costo_nuevo)} className="w-20 bg-transparent text-right font-black text-amber-400 outline-none text-lg" />
                  </div>
                  <input type="number" step="0.01" value={formData.precio_menor_nuevo} onChange={e => recalcarMargenDesdePrecio('menor', parseFloat(e.target.value) || 0)} className="w-full p-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-3xl font-black text-white text-center focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
                <div className="p-8 bg-black/40 rounded-[2rem] border border-zinc-800 space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase">Margen Mayor (%)</label>
                    <input type="number" value={formData.margen_mayor} onChange={e => manejarCambioUnidadOCosto(formData.cantidad, formData.costo_nuevo)} className="w-20 bg-transparent text-right font-black text-amber-400 outline-none text-lg" />
                  </div>
                  <input type="number" step="0.01" value={formData.precio_mayor_nuevo} onChange={e => recalcarMargenDesdePrecio('mayor', parseFloat(e.target.value) || 0)} className="w-full p-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-3xl font-black text-white text-center focus:ring-2 focus:ring-amber-500 outline-none" />
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

        <div className="space-y-8">
          <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">Referencia Documental</h3>
            <input placeholder="EJ: FACTURA F-102" value={formData.documento_referencia} onChange={e => setFormData({...formData, documento_referencia: e.target.value.toUpperCase()})} className="w-full p-6 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-white uppercase" />
          </section>
          <button type="submit" disabled={cargando || !preciosConfirmados || !formData.id_producto} className={`w-full py-8 rounded-[2.25rem] font-black text-xl tracking-tighter shadow-2xl transition-all active:scale-95 uppercase ${cargando || !preciosConfirmados || !formData.id_producto ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40'}`}>
            {cargando ? 'SINCRONIZANDO...' : '🚀 ACTUALIZAR STOCK'}
          </button>
          
          {mensaje.texto && (
            <div className={`p-4 rounded-xl text-center font-bold text-xs uppercase ${mensaje.tipo === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {mensaje.texto}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}