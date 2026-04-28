'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';

export default function RegistrarIngreso() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [formData, setFormData] = useState({
    id_producto: '', cantidad: 1, costo_nuevo: 0,
    precio_menor_nuevo: 0, precio_mayor_nuevo: 0, documento_referencia: ''
  });

  useEffect(() => {
    async function cargarCatalogo() {
      try {
        const data = await apiService.getProductosParaIngreso();
        setProductos(data);
      } catch (error) {
        setMensaje({ texto: '❌ Error al cargar productos', tipo: 'error' });
      }
    }
    cargarCatalogo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (!formData.id_producto) throw new Error("Debe seleccionar un producto.");
      const res = await apiService.registrarIngreso(formData);
      setMensaje({ texto: `✅ INGRESO REGISTRADO. NUEVO STOCK: ${res.stock_final}`, tipo: 'success' });
      setFormData({ id_producto: '', cantidad: 1, costo_nuevo: 0, precio_menor_nuevo: 0, precio_mayor_nuevo: 0, documento_referencia: '' });
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 5000);
    } catch (err: any) {
      setMensaje({ texto: `❌ ERROR: ${err.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="mb-12 flex items-center gap-6">
        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-4xl shadow-2xl">📦</div>
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter">Registrar Ingreso</h1>
          <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Actualización de Stock y Costos</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
            <h3 className="text-sm font-black uppercase text-indigo-400 mb-8 flex items-center gap-3">Selección de Producto</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Producto — [Proveedor]</label>
                <select 
                  required
                  value={formData.id_producto}
                  onChange={e => {
                    const sel = productos.find(p => p.id === e.target.value);
                    setFormData({...formData, id_producto: e.target.value, costo_nuevo: sel?.costo || 0, precio_menor_nuevo: sel?.precio || 0});
                  }}
                  className="w-full p-6 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-black text-white appearance-none cursor-pointer"
                >
                  <option value="">BUSCAR PRODUCTO...</option>
                  {productos.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nombre.toUpperCase()} — [{p.proveedor.toUpperCase()}]</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input required type="number" min="1" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: parseInt(e.target.value)})} className="w-full p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-black text-2xl text-center" />
                <input required type="number" step="0.01" value={formData.costo_nuevo} onChange={e => setFormData({...formData, costo_nuevo: parseFloat(e.target.value)})} className="w-full p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-2xl text-center text-emerald-400" />
              </div>
            </div>
          </section>

          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase text-emerald-400 mb-8 flex items-center gap-3">Ajuste de Precios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <input required type="number" step="0.01" value={formData.precio_menor_nuevo} onChange={e => setFormData({...formData, precio_menor_nuevo: parseFloat(e.target.value)})} className="p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
              <input required type="number" step="0.01" value={formData.precio_mayor_nuevo} onChange={e => setFormData({...formData, precio_mayor_nuevo: parseFloat(e.target.value)})} className="p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase text-zinc-300 mb-6 flex items-center gap-3">Referencia</h3>
            <input placeholder="Ej: Factura 001" value={formData.documento_referencia} onChange={e => setFormData({...formData, documento_referencia: e.target.value})} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600" />
          </section>

          <button type="submit" disabled={cargando} className={`w-full py-7 rounded-[2rem] font-black text-xl tracking-tighter shadow-2xl transition-all active:scale-95 ${cargando ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
            {cargando ? 'PROCESANDO...' : '🚀 ACTUALIZAR INVENTARIO'}
          </button>

          {mensaje.texto && (
            <div className={`p-6 rounded-2xl text-center font-black text-sm border animate-in zoom-in duration-300 ${mensaje.tipo === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {mensaje.texto.toUpperCase()}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}