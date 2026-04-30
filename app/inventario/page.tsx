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

  // ESTADOS PARA EL MODAL DE AJUSTE RÁPIDO (Sincronización de UI)[cite: 19]
  const [showAjuste, setShowAjuste] = useState(false);
  const [itemAjuste, setItemAjuste] = useState<any>(null);
  const [ajusteForm, setAjusteForm] = useState({ costo: 0, menor: 0, mayor: 0 });
  const [guardando, setGuardando] = useState(false);

  // -------------------------------------------------------------------------
  // 2. CARGA INICIAL DE PRODUCTOS (TRUJILLO CATÁLOGO)
  // -------------------------------------------------------------------------
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

  useEffect(() => {
    cargarDatos();
  }, []);

  // -------------------------------------------------------------------------
  // 3. LÓGICA DE AJUSTE RÁPIDO Y SEGURIDAD DE DATOS[cite: 19]
  // -------------------------------------------------------------------------
  
  // Función para limpiar ceros a la izquierda y manejar vacíos (Solución 2 decimales)[cite: 18, 19]
  const parseInput = (val: string) => {
    if (val === '') return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const abrirAjuste = (p: any) => {
    setItemAjuste(p);
    // Seguridad de Datos: Fallback a 0 si los valores son indefinidos
    setAjusteForm({ 
      costo: p.costo || 0, 
      menor: p.precio || 0, 
      mayor: p.precio_mayor || 0 
    });
    setShowAjuste(true);
  };

  const guardarCambiosPrecio = async () => {
    setGuardando(true);
    try {
      // Sincronización con el backend usando la precisión requerida[cite: 18, 19]
      await apiService.actualizarPreciosProducto(itemAjuste.id, {
        costo_unidad: ajusteForm.costo, 
        precio_menor: ajusteForm.menor,
        precio_mayor: ajusteForm.mayor
      });
      setShowAjuste(false);
      await cargarDatos(); // Refrescar tabla principal
    } catch (e) {
      alert("Error al actualizar precios en la base de datos");
    } finally {
      setGuardando(false);
    }
  };

  // -------------------------------------------------------------------------
  // 4. LÓGICA DE TRAZABILIDAD (HOJA DE VIDA DEL PRODUCTO)
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
      
      {/* MODAL DE GESTIÓN DE PRECIOS (Ajuste 2 decimales y limpieza de ceros)[cite: 18, 19] */}
      {showAjuste && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Ajuste Rápido</h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Sincronización Manual de Precios</p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Costo Unidad (S/)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={ajusteForm.costo === 0 ? '' : ajusteForm.costo} 
                  onChange={e => setAjusteForm({...ajusteForm, costo: parseInput(e.target.value)})} 
                  className="w-full p-5 bg-black border border-zinc-800 rounded-2xl text-emerald-400 font-black text-2xl text-center outline-none focus:ring-2 focus:ring-emerald-600 transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">P. Menor (S/)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={ajusteForm.menor === 0 ? '' : ajusteForm.menor} 
                    onChange={e => setAjusteForm({...ajusteForm, menor: parseInput(e.target.value)})} 
                    className="w-full p-5 bg-black border border-zinc-800 rounded-2xl text-white font-black text-xl text-center outline-none focus:ring-2 focus:ring-indigo-600" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">P. Mayor (S/)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={ajusteForm.mayor === 0 ? '' : ajusteForm.mayor} 
                    onChange={e => setAjusteForm({...ajusteForm, mayor: parseInput(e.target.value)})} 
                    className="w-full p-5 bg-black border border-zinc-800 rounded-2xl text-white font-black text-xl text-center outline-none focus:ring-2 focus:ring-indigo-600" 
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button onClick={() => setShowAjuste(false)} className="flex-1 py-4 text-zinc-500 font-bold hover:text-white transition-colors uppercase text-[10px] tracking-widest">Cancelar</button>
                <button 
                  disabled={guardando} 
                  onClick={guardarCambiosPrecio} 
                  className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                >
                  {guardando ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <th className="p-8 text-center">Gestión</th>
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
                        (p.stock || 0) <= 0 ? 'bg-red-500/20 text-red-500 animate-pulse' : 
                        (p.stock || 0) < 10 ? 'bg-amber-500/20 text-amber-500' : 
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {p.stock || 0} UNID
                      </div>
                    </td>

                    <td className="p-8 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="font-mono font-black text-white text-xl">
                          S/ {Number(p.costo || 0).toFixed(2)}
                        </div>
                        
                        {Number(p.costo_maximo || 0) > Number(p.costo || 0) && (
                          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg animate-in zoom-in duration-300">
                            <span className="text-[8px] text-emerald-500 font-black uppercase tracking-tighter">¡Mejor Precio!</span>
                            <span className="text-[10px] text-zinc-600 font-bold line-through">S/ {Number(p.costo_maximo || 0).toFixed(2)}</span>
                          </div>
                        )}

                        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest opacity-60">
                          Techo Histórico: S/ {Number(p.costo_maximo || p.costo || 0).toFixed(2)}
                        </div>
                      </div>
                    </td>

                    <td className="p-8 text-center">
                      <div className="flex justify-center gap-3">
                        <button 
                          onClick={() => abrirAjuste(p)}
                          className="p-3 bg-zinc-800 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg"
                          title="Ajuste Rápido de Precios"
                        >
                          🏷️
                        </button>
                        <button 
                          onClick={() => verTrazabilidad(p)}
                          className={`p-3 rounded-xl transition-all shadow-lg ${
                            productoSel?.id === p.id ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-indigo-600 hover:text-white'
                          }`}
                          title="Ver Trazabilidad"
                        >
                          🔍
                        </button>
                      </div>
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
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-black ${
                            m.tipo_movimiento === 'ENTRADA' ? 'text-white' : 'text-zinc-400'
                          }`}>
                            {m.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-black tracking-tighter">
                            S/ {Number(m.precio_momento || 0).toFixed(2)}
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