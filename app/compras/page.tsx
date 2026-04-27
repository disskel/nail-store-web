'use client';

import { useState } from 'react';
import { registrarIngresoMercaderia } from '@/services/inventoryService';

export default function PaginaCompras() {
  const [formData, setFormData] = useState({
    id_producto: '23f61c1f-b288-4141-8e5d-ad54d428f058', // UUID actual del Shampoo
    cantidad: 1,
    costo_nuevo: 16.50,
    precio_menor_nuevo: 23.00,
    precio_mayor_nuevo: 19.50,
    documento_referencia: ''
  });

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      const res = await registrarIngresoMercaderia(formData);
      setMensaje({ 
        texto: `✅ Éxito: Stock actualizado. Ahora tienes ${res.stock_final} unidades.`, 
        tipo: 'success' 
      });
    } catch (error: any) {
      setMensaje({ texto: `❌ Error: ${error.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
          📦 Registrar Ingreso
        </h1>
        <p className="text-zinc-500 font-medium mt-2">Actualiza el stock y los costos tras una compra a proveedor.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario Principal */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 md:p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
            
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-zinc-500 px-1">ID Producto (Seleccionado)</label>
              <input type="text" value={formData.id_producto} disabled 
                className="w-full p-4 bg-black/50 border border-zinc-800 rounded-2xl text-zinc-500 cursor-not-allowed text-xs md:text-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-zinc-500 px-1">Cantidad entrante</label>
                <input required type="number" value={formData.cantidad} 
                  className="w-full p-4 bg-black border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                  onChange={(e) => setFormData({...formData, cantidad: parseInt(e.target.value)})} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-zinc-500 px-1">Costo de Compra (S/)</label>
                <input required type="number" step="0.01" value={formData.costo_nuevo} 
                  className="w-full p-4 bg-black border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  onChange={(e) => setFormData({...formData, costo_nuevo: parseFloat(e.target.value)})} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-zinc-500 px-1">Documento de Referencia (Factura/Guía)</label>
              <input type="text" placeholder="Ej: F-001 o Guía-023" value={formData.documento_referencia} 
                className="w-full p-4 bg-black border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                onChange={(e) => setFormData({...formData, documento_referencia: e.target.value})} />
            </div>

            <button type="submit" disabled={cargando} 
              className={`w-full py-5 rounded-2xl font-black text-lg tracking-wide shadow-2xl transition-all active:scale-95 ${
                cargando ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
              }`}>
              {cargando ? 'PROCESANDO...' : 'ACTUALIZAR INVENTARIO'}
            </button>
          </div>
        </form>

        {/* Columna Lateral de Información */}
        <div className="space-y-6">
          <div className="bg-zinc-900/20 border border-zinc-800 p-6 rounded-3xl border-dashed">
            <h3 className="font-bold text-zinc-300 mb-2">Nota Importante</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Al realizar un ingreso, el sistema actualizará automáticamente el 
              <span className="text-emerald-500 font-bold"> costo maestro </span> y sumará la cantidad al 
              <span className="text-white font-bold"> stock disponible </span>.
            </p>
          </div>

          {mensaje.texto && (
            <div className={`p-5 rounded-2xl text-center font-bold border transition-all animate-in slide-in-from-bottom ${
              mensaje.tipo === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
              {mensaje.texto}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}