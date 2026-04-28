'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';

export default function RegistrarIngreso() {
  // -------------------------------------------------------------------------
  // 1. ESTADOS DEL COMPONENTE
  // -------------------------------------------------------------------------
  // FIX: Se añade <any[]> para evitar el error 'never' en la compilación de Vercel[cite: 20]
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [formData, setFormData] = useState({
    id_producto: '',
    cantidad: 1,
    costo_nuevo: 0,
    precio_menor_nuevo: 0,
    precio_mayor_nuevo: 0,
    documento_referencia: ''
  });

  // -------------------------------------------------------------------------
  // 2. CARGA DE CATÁLOGO (NOMBRE + PROVEEDOR)
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function cargarCatalogo() {
      try {
        // Se usa el servicio actualizado que ya tenemos en memoria[cite: 21]
        const data = await apiService.getProductosParaIngreso();
        setProductos(data);
      } catch (error) {
        setMensaje({ texto: '❌ ERROR AL CARGAR EL CATÁLOGO DE TRUJILLO', tipo: 'error' });
      }
    }
    cargarCatalogo();
  }, []);

  // -------------------------------------------------------------------------
  // 3. LÓGICA DE REGISTRO
  // -------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      if (!formData.id_producto) throw new Error("Debe seleccionar un producto del catálogo.");

      const res = await apiService.registrarIngreso(formData);
      
      setMensaje({ 
        texto: `✅ INGRESO REGISTRADO. NUEVO STOCK DISPONIBLE: ${res.stock_final} UNIDADES`, 
        tipo: 'success' 
      });

      // Limpiar formulario tras éxito
      setFormData({
        id_producto: '',
        cantidad: 1,
        costo_nuevo: 0,
        precio_menor_nuevo: 0,
        precio_mayor_nuevo: 0,
        documento_referencia: ''
      });
      
      // El mensaje se mantiene 6 segundos para confirmación visual
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 6000);
    } catch (err: any) {
      setMensaje({ texto: `❌ ERROR EN EL PROCESO: ${err.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      
      <header className="mb-12 flex items-center gap-6">
        <div className="w-16 h-16 bg-indigo-600 rounded-[1.75rem] flex items-center justify-center text-4xl shadow-2xl">
          📦
        </div>
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase">Registrar Ingreso</h1>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Suministro de Mercancía Nail-Store</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        <div className="lg:col-span-2 space-y-10">
          
          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-indigo-400 rounded-full"></span> Selección de Mercancía
            </h3>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Producto — [Marca / Proveedor]</label>
                <select 
                  required
                  value={formData.id_producto}
                  onChange={e => {
                    // FIX: Esta línea ya no dará error TS(2339) en Vercel[cite: 20]
                    const sel = productos.find(p => p.id === e.target.value);
                    setFormData({
                      ...formData, 
                      id_producto: e.target.value,
                      costo_nuevo: sel?.costo || 0,
                      precio_menor_nuevo: sel?.precio || 0
                    });
                  }}
                  className="w-full p-6 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-black text-white appearance-none cursor-pointer text-lg"
                >
                  <option value="">BUSCAR EN EL CATÁLOGO...</option>
                  {productos.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre.toUpperCase()} — [{p.proveedor.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Cantidad Entrante</label>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    value={formData.cantidad}
                    onChange={e => setFormData({...formData, cantidad: parseInt(e.target.value)})}
                    className="w-full p-6 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-black text-3xl text-center text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Costo Unitario Compra (S/)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    value={formData.costo_nuevo}
                    onChange={e => setFormData({...formData, costo_nuevo: parseFloat(e.target.value)})}
                    className="w-full p-6 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-3xl text-center text-emerald-400" 
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span> Ajuste Sugerido de Precios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nuevo Precio Menor (S/)</label>
                <input required type="number" step="0.01" value={formData.precio_menor_nuevo} onChange={e => setFormData({...formData, precio_menor_nuevo: parseFloat(e.target.value)})} className="w-full p-6 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-xl text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nuevo Precio Mayor (S/)</label>
                <input required type="number" step="0.01" value={formData.precio_mayor_nuevo} onChange={e => setFormData({...formData, precio_mayor_nuevo: parseFloat(e.target.value)})} className="w-full p-6 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-xl text-white" />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-10">
          <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">Referencia Documental</h3>
            <input 
              placeholder="EJ: FACTURA F-102"
              value={formData.documento_referencia}
              onChange={e => setFormData({...formData, documento_referencia: e.target.value})}
              className="w-full p-6 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold uppercase text-white" 
            />
          </section>

          <button 
            type="submit" 
            disabled={cargando}
            className={`w-full py-8 rounded-[2.25rem] font-black text-xl tracking-tighter shadow-2xl transition-all active:scale-95 uppercase ${
              cargando 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40'
            }`}
          >
            {cargando ? 'Sincronizando...' : '🚀 Actualizar Inventario'}
          </button>

          {mensaje.texto && (
            <div className={`p-8 rounded-[2.25rem] text-center font-black text-xs border animate-in zoom-in duration-300 ${
              mensaje.tipo === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {mensaje.texto.toUpperCase()}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}