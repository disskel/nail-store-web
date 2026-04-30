'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';

export default function InventarioDetallado() {
  // -------------------------------------------------------------------------
  // 1. ESTADOS DEL COMPONENTE
  // -------------------------------------------------------------------------
  const [productos, setProductos] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [productoSel, setProductoSel] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  // -------------------------------------------------------------------------
  // 2. CARGA INICIAL DE PRODUCTOS (TRUJILLO CATÁLOGO)
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function cargarDatos() {
      try {
        // Obtenemos los productos. El backend ahora envía 'costo' y 'costo_maximo'
        const data = await apiService.getProductosParaIngreso();
        setProductos(data);
      } catch (error) {
        setMensaje('❌ ERROR AL SINCRONIZAR EL INVENTARIO');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  // -------------------------------------------------------------------------
  // 3. LÓGICA DE TRAZABILIDAD (HOJA DE VIDA DEL PRODUCTO)
  // -------------------------------------------------------------------------
  const verTrazabilidad = async (prod: any) => {
    try {
      setProductoSel(prod);
      // Consultamos el historial de movimientos de la tabla movimientos_inventario
      const data = await apiService.getHistorialProducto(prod.id);
      setHistorial(data);
    } catch (error) {
      alert("Error al cargar el historial detallado");
    }
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* CABECERA DE CONTROL */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Control de Existencias</h1>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Auditoría y Trazabilidad de Mercancía Nail-Store</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest text-right">Registros Totales</p>
          <p className="text-2xl font-black text-white text-right">{productos.length} ÍTEMS</p>
        </div>
      </header>

      {mensaje && (
        <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-500 font-black text-center uppercase tracking-widest animate-pulse">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        
        {/* COLUMNA 1 Y 2: TABLA DE ESPECIFICACIÓN DE PRODUCTOS */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
            <table className="w-full text-left">
              <thead className="bg-black/40 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="p-8">Información del Producto</th>
                  <th className="p-8 text-center">Stock Actual</th>
                  <th className="p-8 text-right">Costo Maestro</th>
                  <th className="p-8 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {productos.map((p) => (
                  <tr key={p.id} className={`transition-all group ${productoSel?.id === p.id ? 'bg-indigo-600/10' : 'hover:bg-white/5'}`}>
                    <td className="p-8">
                      <div className="font-black text-white text-lg tracking-tight uppercase">{p.nombre}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">{p.categoria}</span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">📦 {p.proveedor}</span>
                      </div>
                    </td>
                    <td className="p-8 text-center">
                      <div className={`inline-block px-5 py-2 rounded-2xl font-black text-sm shadow-inner ${
                        p.stock <= 0 ? 'bg-red-500/20 text-red-500 animate-pulse' : 
                        p.stock < 10 ? 'bg-amber-500/20 text-amber-500' : 
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {p.stock} UNID
                      </div>
                    </td>

                    {/* IMPLEMENTACIÓN DEL INDICADOR DUAL Y ALERTA DE VARIACIÓN[cite: 21] */}
                    <td className="p-8 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {/* Costo de Reposición (Principal) */}
                        <div className="font-mono font-black text-white text-xl">
                          S/ {p.costo.toFixed(2)}
                        </div>
                        
                        {/* Alerta de Variación: Se muestra si el costo bajó respecto al máximo */}
                        {p.costo_maximo > p.costo && (
                          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg animate-in zoom-in duration-300">
                            <span className="text-[8px] text-emerald-500 font-black uppercase tracking-tighter">¡Mejor Precio!</span>
                            <span className="text-[10px] text-zinc-600 font-bold line-through">S/ {p.costo_maximo.toFixed(2)}</span>
                          </div>
                        )}

                        {/* Indicador de Techo Máximo (Secundario) */}
                        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest opacity-60">
                          Techo Histórico: S/ {(p.costo_maximo || p.costo).toFixed(2)}
                        </div>
                      </div>
                    </td>

                    <td className="p-8 text-center">
                      <button 
                        onClick={() => verTrazabilidad(p)}
                        className={`p-4 rounded-2xl transition-all shadow-lg ${
                          productoSel?.id === p.id 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        <span className="text-xl">🔍</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA 3: PANEL DE TRAZABILIDAD (AUDITORÍA DE MOVIMIENTOS) */}
        <div className="space-y-8">
          <section className="bg-zinc-900/60 border border-zinc-800 rounded-[2.5rem] p-10 backdrop-blur-2xl shadow-2xl sticky top-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-indigo-400 rounded-full"></span> Trazabilidad del Ítem
            </h3>

            {productoSel ? (
              <div className="space-y-8 animate-in slide-in-from-right duration-500">
                <div className="pb-6 border-b border-zinc-800">
                  <div className="text-2xl font-black text-white uppercase leading-tight tracking-tighter">
                    {productoSel.nombre}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2">Últimos movimientos registrados</p>
                </div>

                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                  {historial.length > 0 ? (
                    historial.map((m, i) => (
                      <div key={i} className="p-5 bg-black/40 rounded-[1.5rem] border border-zinc-800/50 flex justify-between items-center group hover:border-zinc-700 transition-all">
                        <div className="space-y-1">
                          <div className={`text-[10px] font-black tracking-widest ${
                            m.tipo_movimiento === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {m.tipo_movimiento}
                          </div>
                          <div className="text-xs font-black text-zinc-300">
                            {new Date(m.fecha).toLocaleDateString()}
                          </div>
                          <div className="text-[9px] text-zinc-500 italic uppercase font-bold truncate max-w-[120px]">
                            {m.referencia || 'SIN REF.'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-black ${
                            m.tipo_movimiento === 'ENTRADA' ? 'text-white' : 'text-zinc-400'
                          }`}>
                            {m.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-black tracking-tighter">
                            S/ {m.precio_momento.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-zinc-600 font-bold text-xs uppercase tracking-widest">
                      Sin movimientos previos
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-32 space-y-4">
                <div className="text-5xl opacity-20">📈</div>
                <p className="text-zinc-600 font-black text-xs uppercase tracking-widest leading-loose">
                  Seleccione un producto<br/>del catálogo para auditar<br/>su flujo de stock
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}