'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';

export default function PaginaCompras() {
  // -------------------------------------------------------------------------
  // 1. ESTADOS (Con tipado para evitar fallos en Vercel)
  // -------------------------------------------------------------------------
  const [productos, setProductos] = useState<any[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Estado del formulario (id_producto empieza vacío para forzar selección)
  const [formData, setFormData] = useState({
    id_producto: '',
    cantidad: 1,
    costo_nuevo: 0,
    precio_menor_nuevo: 0,
    precio_mayor_nuevo: 0,
    documento_referencia: ''
  });

  // -------------------------------------------------------------------------
  // 2. CARGA DE CATÁLOGO DESDE TRUJILLO
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function cargarCatalogo() {
      try {
        const data = await apiService.getProductosParaIngreso();
        setProductos(data);
      } catch (error) {
        setMensaje({ texto: '❌ FALLO AL CONECTAR CON EL CATÁLOGO', tipo: 'error' });
      }
    }
    cargarCatalogo();
  }, []);

  // -------------------------------------------------------------------------
  // 3. LÓGICA DE SELECCIÓN DINÁMICA
  // -------------------------------------------------------------------------
  const manejarCambioProducto = (id: string) => {
    const prod = productos.find(p => p.id === id);
    setProductoSeleccionado(prod);
    
    if (prod) {
      setFormData(prev => ({
        ...prev,
        id_producto: id,
        costo_nuevo: prod.costo || 0,
        precio_menor_nuevo: prod.precio || 0,
        precio_mayor_nuevo: prod.precio_mayor || prod.precio || 0
      }));
    } else {
      setProductoSeleccionado(null);
      setFormData(prev => ({ ...prev, id_producto: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      if (!formData.id_producto) throw new Error("Debe seleccionar un producto del catálogo.");
      
      // Enviamos el registro al backend v1.0.10[cite: 12]
      const res = await apiService.registrarIngreso(formData);
      
      setMensaje({ 
        texto: `✅ INGRESO EXITOSO. NUEVO STOCK DISPONIBLE: ${res.stock_final} UNIDADES`, 
        tipo: 'success' 
      });

      // Resetear para nueva operación
      setFormData({ id_producto: '', cantidad: 1, costo_nuevo: 0, precio_menor_nuevo: 0, precio_mayor_nuevo: 0, documento_referencia: '' });
      setProductoSeleccionado(null);
      
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 6000);
    } catch (err: any) {
      setMensaje({ texto: `❌ ERROR EN EL PROCESO: ${err.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-700">
      
      {/* CABECERA PROFESIONAL */}
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-[1.75rem] flex items-center justify-center text-4xl shadow-2xl shadow-indigo-600/30">
            📦
          </div>
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Registrar Ingreso</h1>
            <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Suministro de Mercancía Nail-Store</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        <div className="lg:col-span-2 space-y-10">
          
          {/* SECCIÓN 1: SELECTOR DE PRODUCTO (ADIÓS AL ID) */}
          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span> 1. Selección de Producto
            </h3>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">¿Qué producto ingresó al almacén?</label>
                <select 
                  required
                  value={formData.id_producto}
                  onChange={(e) => manejarCambioProducto(e.target.value)}
                  className="w-full p-6 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-black text-white appearance-none cursor-pointer text-lg transition-all"
                >
                  <option value="">-- SELECCIONE POR NOMBRE O PROVEEDOR --</option>
                  {productos.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre.toUpperCase()} — [{p.proveedor.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              {/* CARD DE CONTEXTO (Muestra datos actuales de la DB) */}
              {productoSeleccionado && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] animate-in zoom-in duration-300">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Stock en Trujillo</p>
                    <p className="text-2xl font-black text-white">{productoSeleccionado.stock} UDS</p>
                  </div>
                  <div className="space-y-1 border-l border-zinc-800 pl-6">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Último Costo</p>
                    <p className="text-2xl font-black text-white">S/ {productoSeleccionado.costo.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1 border-l border-zinc-800 pl-6">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Proveedor</p>
                    <p className="text-sm font-black text-white uppercase truncate">{productoSeleccionado.proveedor}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECCIÓN 2: DATOS DE LA COMPRA */}
          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> 2. Detalles del Abastecimiento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Unidades Entrantes</label>
                <input required type="number" min="1" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: parseInt(e.target.value) || 0})} className="w-full p-6 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-black text-4xl text-center text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Costo Unidad (S/)</label>
                <input required type="number" step="0.01" value={formData.costo_nuevo} onChange={e => setFormData({...formData, costo_nuevo: parseFloat(e.target.value) || 0})} className="w-full p-6 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-4xl text-center text-emerald-400" />
              </div>
            </div>
          </section>
        </div>

        {/* COLUMNA 3: ACCIONES Y MENSAJES */}
        <div className="space-y-10">
          <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">📂 Documentación</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-600 uppercase ml-2 tracking-widest">Nro de Factura / Guía</label>
                <input placeholder="EJ: F-105 / GUIA-01" value={formData.documento_referencia} onChange={e => setFormData({...formData, documento_referencia: e.target.value.toUpperCase()})} className="w-full p-6 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-white uppercase shadow-inner" />
              </div>
            </div>
          </section>

          <button 
            type="submit" 
            disabled={cargando || !formData.id_producto}
            className={`w-full py-8 rounded-[2.25rem] font-black text-xl tracking-tighter shadow-2xl transition-all active:scale-95 uppercase ${
              cargando || !formData.id_producto
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40'
            }`}
          >
            {cargando ? 'PROCESANDO...' : '🚀 ACTUALIZAR STOCK'}
          </button>

          {mensaje.texto && (
            <div className={`p-8 rounded-[2.25rem] text-center font-black text-xs border animate-in zoom-in duration-300 shadow-2xl ${
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