'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';

/**
 * COMPONENTE: Inventario Detallado - JEAN NAILS STORE
 * Versión 1.0.14: Incluye Edición de Nombre y Borrado Lógico.
 * Propósito: Control maestro de existencias, auditoría de stock y gestión de catálogo.
 */

export default function InventarioDetallado() {
  // -------------------------------------------------------------------------
  // 1. ESTADOS DEL COMPONENTE: Memoria reactiva de la interfaz
  // -------------------------------------------------------------------------
  const [productos, setProductos] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [productoSel, setProductoSel] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  // ESTADOS PARA EL MODAL DE AJUSTE RÁPIDO DE PRECIOS
  const [showAjuste, setShowAjuste] = useState(false);
  const [itemAjuste, setItemAjuste] = useState<any>(null);
  const [ajusteForm, setAjusteForm] = useState({ costo: 0, menor: 0, mayor: 0 });
  const [guardando, setGuardando] = useState(false);

  // ESTADOS PARA FILTROS AVANZADOS Y GESTIÓN DE ESTADO (BORRADO LÓGICO)
  const [showFiltros, setShowFiltros] = useState(false); 
  const [busqueda, setBusqueda] = useState(''); 
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS'); 
  const [filtroProveedor, setFiltroProveedor] = useState('TODOS'); 
  const [soloBajoStock, setSoloBajoStock] = useState(false); 
  const [mostrarInactivos, setMostrarInactivos] = useState(false); // Switch maestro para ver "basura" o inactivos

  // -------------------------------------------------------------------------
  // 2. CARGA DINÁMICA DE PRODUCTOS: Sincronización con el Backend v1.0.14
  // -------------------------------------------------------------------------
  async function cargarDatos() {
    try {
      // Se pasa el parámetro al backend para decidir si incluir productos archivados
      const data = await apiService.getProductosConMargen(mostrarInactivos);
      setProductos(data);
    } catch (error) {
      setMensaje('❌ ERROR AL SINCRONIZAR EL INVENTARIO');
    } finally {
      setCargando(false);
    }
  }

  // Recarga automática cuando el usuario cambia el filtro de inactivos
  useEffect(() => { cargarDatos(); }, [mostrarInactivos]);

  // -------------------------------------------------------------------------
  // 3. LÓGICA DE FILTRADO INTELIGENTE: Procesamiento en cliente para velocidad
  // -------------------------------------------------------------------------
  const categoriasUnicas = useMemo(() => 
    ['TODAS', ...Array.from(new Set(productos.map(p => p.categoria).filter(Boolean)))], 
  [productos]);

  const proveedoresUnicos = useMemo(() => 
    ['TODOS', ...Array.from(new Set(productos.map(p => p.proveedor).filter(Boolean)))], 
  [productos]);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchesTexto = 
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.sku?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.proveedor?.toLowerCase().includes(busqueda.toLowerCase());
      
      const matchesCategoria = filtroCategoria === 'TODAS' || p.categoria === filtroCategoria;
      const matchesProveedor = filtroProveedor === 'TODOS' || p.proveedor === filtroProveedor;
      const matchesStock = !soloBajoStock || (p.stock || 0) < 10;

      return matchesTexto && matchesCategoria && matchesProveedor && matchesStock;
    });
  }, [productos, busqueda, filtroCategoria, filtroProveedor, soloBajoStock]);

  // -------------------------------------------------------------------------
  // 4. LÓGICA DE GESTIÓN: Edición rápida y Borrado Lógico
  // -------------------------------------------------------------------------
  
  // Función para alternar entre Activo e Inactivo (Ocultar "Basura")
  const toggleEstado = async (id: string, estadoActual: boolean) => {
    try {
      await apiService.updateProducto(id, { activo: !estadoActual });
      cargarDatos(); // Refrescar lista para aplicar el borrado lógico en la vista
    } catch (error) {
      alert("Error al cambiar estado del producto");
    }
  };

  // Función para corregir errores tipográficos en el nombre directamente
  const editarNombre = async (id: string, nombreActual: string) => {
    const nuevoNombre = prompt("CORREGIR NOMBRE DEL PRODUCTO:", nombreActual);
    if (nuevoNombre && nuevoNombre.trim() !== "" && nuevoNombre !== nombreActual) {
      try {
        await apiService.updateProducto(id, { nombre: nuevoNombre.trim().toUpperCase() });
        cargarDatos();
      } catch (error) {
        alert("Error al actualizar el nombre");
      }
    }
  };

  // Lógica de Precios
  const parseInput = (val: string) => {
    if (val === '') return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const abrirAjuste = (p: any) => {
    setItemAjuste(p);
    setAjusteForm({ costo: p.costo || 0, menor: p.precio || 0, mayor: p.precio_mayor || 0 });
    setShowAjuste(true);
  };

  const guardarCambiosPrecio = async () => {
    setGuardando(true);
    try {
      await apiService.actualizarPreciosProducto(itemAjuste.id, {
        costo_unidad: ajusteForm.costo, 
        precio_menor: ajusteForm.menor,
        precio_mayor: ajusteForm.mayor
      });
      setShowAjuste(false);
      await cargarDatos(); 
    } catch (e) {
      alert("Error al actualizar precios");
    } finally {
      setGuardando(false);
    }
  };

  // -------------------------------------------------------------------------
  // 5. LÓGICA DE TRAZABILIDAD: Auditoría histórica de movimientos
  // -------------------------------------------------------------------------
  const verTrazabilidad = async (prod: any) => {
    try {
      setProductoSel(prod);
      const data = await apiService.getHistorialProducto(prod.id);
      setHistorial(data);
    } catch (error) {
      alert("Error al cargar historial");
    }
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* MODAL DE AJUSTE RÁPIDO DE PRECIOS */}
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
                <input type="number" step="0.01" value={ajusteForm.costo === 0 ? '' : ajusteForm.costo} onChange={e => setAjusteForm({...ajusteForm, costo: parseInput(e.target.value)})} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl text-emerald-400 font-black text-2xl text-center outline-none focus:ring-2 focus:ring-emerald-600 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">P. Menor (S/)</label>
                  <input type="number" step="0.01" value={ajusteForm.menor === 0 ? '' : ajusteForm.menor} onChange={e => setAjusteForm({...ajusteForm, menor: parseInput(e.target.value)})} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl text-white font-black text-xl text-center outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">P. Mayor (S/)</label>
                  <input type="number" step="0.01" value={ajusteForm.mayor === 0 ? '' : ajusteForm.mayor} onChange={e => setAjusteForm({...ajusteForm, mayor: parseInput(e.target.value)})} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl text-white font-black text-xl text-center outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button onClick={() => setShowAjuste(false)} className="flex-1 py-4 text-zinc-500 font-bold hover:text-white transition-colors uppercase text-[10px]">Cancelar</button>
                <button disabled={guardando} onClick={guardarCambiosPrecio} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 shadow-xl transition-all uppercase text-[10px]">{guardando ? 'Guardando...' : 'Actualizar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA RESPONSIVA */}
      <header className="mb-8 flex flex-col gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Inventario</h1>
          <div className="flex flex-wrap gap-2 mt-4">
             <button onClick={() => setShowFiltros(!showFiltros)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${showFiltros ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              {showFiltros ? '✕ Filtros' : '⚡ Filtros'}
             </button>
             <button onClick={() => setMostrarInactivos(!mostrarInactivos)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${mostrarInactivos ? 'bg-amber-500 text-white' : 'bg-zinc-900 text-zinc-600'}`}>
              {mostrarInactivos ? '👁️ Inactivos' : '🙈 Activos'}
             </button>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase">Resultados</p>
          <p className="text-xl font-black text-white">{productosFiltrados.length} ÍTEMS</p>
        </div>
      </header>

      {/* PANEL DE FILTROS MÓVIL */}
      {showFiltros && (
        <div className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded-3xl space-y-4">
          <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white font-bold" />
          <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white font-bold">
            {proveedoresUnicos.map(prov => <option key={prov} value={prov}>{prov.toUpperCase()}</option>)}
          </select>
          <button onClick={() => setSoloBajoStock(!soloBajoStock)} className={`w-full p-4 rounded-2xl font-black uppercase text-[10px] border ${soloBajoStock ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-black border-zinc-800 text-zinc-500'}`}>
            {soloBajoStock ? '⚠️ Solo Críticos' : '📦 Todo el Stock'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] overflow-hidden">
            <table className="w-full">
              {/* HEADERS: Ocultos en móvil */}
              <thead className="hidden md:table-header-group bg-black/40 text-[10px] font-black uppercase text-zinc-500">
                <tr>
                  <th className="p-6">Producto</th>
                  <th className="p-6 text-center">Stock</th>
                  <th className="p-6 text-right">Costo</th>
                  <th className="p-6 text-center">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {productosFiltrados.map((p) => (
                  <tr key={p.id} className={`flex flex-col md:table-row transition-all ${!p.activo ? 'opacity-30' : ''} ${productoSel?.id === p.id ? 'bg-indigo-600/10' : 'hover:bg-white/5'}`}>
                    
                    {/* INFO PRINCIPAL */}
                    <td className="p-4 md:p-6">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${p.activo ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                        <div>
                          <div className="font-black text-white text-base md:text-lg uppercase leading-tight">{p.nombre}</div>
                          <div className="flex gap-2 mt-2">
                            <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded font-bold uppercase">{p.categoria}</span>
                            <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1">📦 {p.proveedor}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* STOCK: Estilo diferente en móvil */}
                    <td className="px-4 md:p-6 md:text-center flex justify-between md:table-cell border-t border-zinc-800/30 md:border-none py-3">
                      <span className="md:hidden text-[10px] font-black text-zinc-600 uppercase mt-1">Stock Actual</span>
                      <div className={`px-4 py-1 rounded-xl font-black text-xs ${ (p.stock || 0) < 10 ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400' }`}>
                        {p.stock || 0} UNID
                      </div>
                    </td>

                    {/* COSTO: Estilo diferente en móvil */}
                    <td className="px-4 md:p-6 md:text-right flex justify-between md:table-cell py-3">
                      <span className="md:hidden text-[10px] font-black text-zinc-600 uppercase mt-1">Costo Maestro</span>
                      <div className="font-mono font-black text-white text-lg">S/ {Number(p.costo || 0).toFixed(2)}</div>
                    </td>

                    {/* ACCIONES: Siempre visibles y centradas */}
                    <td className="p-4 md:p-6 text-center border-t border-zinc-800 md:border-none">
                      <div className="flex justify-center md:justify-center gap-3">
                        <button onClick={() => editarNombre(p.id, p.nombre)} className="flex-1 md:flex-none p-3 bg-zinc-800 text-white rounded-xl active:scale-90 transition-transform">✏️</button>
                        <button onClick={() => abrirAjuste(p)} className="flex-1 md:flex-none p-3 bg-zinc-800 text-white rounded-xl active:scale-90">🏷️</button>
                        <button onClick={() => toggleEstado(p.id, p.activo)} className={`flex-1 md:flex-none p-3 rounded-xl ${p.activo ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-600 text-white'}`}>
                          {p.activo ? '🗑️' : '✅'}
                        </button>
                        <button onClick={() => verTrazabilidad(p)} className={`flex-1 md:flex-none p-3 rounded-xl ${productoSel?.id === p.id ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>🔍</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DE TRAZABILIDAD (STICKY) */}
        <div className="space-y-8">
          <section className="bg-zinc-900/60 border border-zinc-800 rounded-[2.5rem] p-10 backdrop-blur-2xl shadow-2xl sticky top-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-8 flex items-center gap-3"><span className="w-2 h-2 bg-indigo-400 rounded-full"></span> Trazabilidad del Ítem</h3>
            {productoSel ? (
              <div className="space-y-8 animate-in slide-in-from-right duration-500">
                <div className="pb-6 border-b border-zinc-800"><div className="text-2xl font-black text-white uppercase tracking-tighter">{productoSel.nombre}</div></div>
                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                  {historial.map((m, i) => (
                    <div key={i} className="p-5 bg-black/40 rounded-[1.5rem] border border-zinc-800/50 flex justify-between items-center group hover:border-zinc-700 transition-all">
                      <div className="space-y-1"><div className={`text-[10px] font-black ${m.tipo_movimiento === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'}`}>{m.tipo_movimiento}</div><div className="text-xs font-black text-zinc-300">{new Date(m.fecha).toLocaleDateString()}</div></div>
                      <div className="text-xl font-black text-white">{m.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{m.cantidad}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (<div className="text-center py-32 opacity-20"><div className="text-5xl mb-4">📈</div><p className="text-[10px] font-black uppercase">Seleccione un producto</p></div>)}
          </section>
        </div>
      </div>
    </div>
  );
}