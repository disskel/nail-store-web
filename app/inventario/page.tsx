'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';

/**
 * MÓDULO DE INVENTARIO - ALTA DENSIDAD PRO (CON PAGINACIÓN)
 * Diseño Full-Width corporativo, filtros en línea, tabla compacta y paginación.
 */
export default function InventarioDetallado() {
  const [productos, setProductos] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [productoSel, setProductoSel] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  // --- NUEVO: ESTADOS DE PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 12; // Cantidad de productos visibles por página

  // ESTADOS MODAL DE AJUSTE RÁPIDO
  const [showAjuste, setShowAjuste] = useState(false);
  const [itemAjuste, setItemAjuste] = useState<any>(null);
  const [ajusteForm, setAjusteForm] = useState({ costo: 0, menor: 0, mayor: 0 });
  const [guardando, setGuardando] = useState(false);

  // FILTROS EN LÍNEA Y ESTADO
  const [busqueda, setBusqueda] = useState(''); 
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS'); 
  const [filtroProveedor, setFiltroProveedor] = useState('TODOS'); 
  const [soloBajoStock, setSoloBajoStock] = useState(false); 
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  async function cargarDatos() {
    try {
      const data = await apiService.getProductosConMargen(mostrarInactivos);
      setProductos(data);
    } catch (error) {
      setMensaje('❌ ERROR AL SINCRONIZAR EL INVENTARIO');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarDatos(); }, [mostrarInactivos]);

  const categoriasUnicas = useMemo(() => ['TODAS', ...Array.from(new Set(productos.map(p => p.categoria).filter(Boolean)))], [productos]);
  const proveedoresUnicos = useMemo(() => ['TODOS', ...Array.from(new Set(productos.map(p => p.proveedor).filter(Boolean)))], [productos]);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchesTexto = p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.sku?.toLowerCase().includes(busqueda.toLowerCase()) || p.proveedor?.toLowerCase().includes(busqueda.toLowerCase());
      const matchesCategoria = filtroCategoria === 'TODAS' || p.categoria === filtroCategoria;
      const matchesProveedor = filtroProveedor === 'TODOS' || p.proveedor === filtroProveedor;
      const matchesStock = !soloBajoStock || (p.stock || 0) < 10;
      return matchesTexto && matchesCategoria && matchesProveedor && matchesStock;
    });
  }, [productos, busqueda, filtroCategoria, filtroProveedor, soloBajoStock]);

  // --- LÓGICA DE PAGINACIÓN ---
  // Si el usuario escribe en el buscador o usa un filtro, lo regresamos a la página 1 automáticamente
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroCategoria, filtroProveedor, soloBajoStock, mostrarInactivos]);

  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);
  const productosPaginados = productosFiltrados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  const toggleEstado = async (id: string, estadoActual: boolean) => {
    try {
      await apiService.updateProducto(id, { activo: !estadoActual });
      cargarDatos(); 
    } catch (error) { alert("Error al cambiar estado del producto"); }
  };

  const editarNombre = async (id: string, nombreActual: string) => {
    const nuevoNombre = prompt("CORREGIR NOMBRE DEL PRODUCTO:", nombreActual);
    if (nuevoNombre && nuevoNombre.trim() !== "" && nuevoNombre !== nombreActual) {
      try {
        await apiService.updateProducto(id, { nombre: nuevoNombre.trim().toUpperCase() });
        cargarDatos();
      } catch (error) { alert("Error al actualizar el nombre"); }
    }
  };

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
    } catch (e) { alert("Error al actualizar precios"); } 
    finally { setGuardando(false); }
  };

  const verTrazabilidad = async (prod: any) => {
    try {
      setProductoSel(prod);
      const data = await apiService.getHistorialProducto(prod.id);
      setHistorial(data);
    } catch (error) { alert("Error al cargar historial"); }
  };

  if (cargando) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-indigo-500 font-black tracking-widest uppercase animate-pulse">Sincronizando Catálogo...</div>;

  return (
    <div className="p-4 lg:p-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500 text-xs transition-colors duration-300">
      
      {/* MODAL DE AJUSTE RÁPIDO COMPACTO */}
      {showAjuste && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter">Ajuste Rápido</h2>
              <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mt-0.5">{itemAjuste?.nombre}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 block mb-1">Costo Unidad (S/)</label>
                <input type="number" step="0.01" value={ajusteForm.costo === 0 ? '' : ajusteForm.costo} onChange={e => setAjusteForm({...ajusteForm, costo: parseInput(e.target.value)})} className="w-full p-3 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-emerald-600 dark:text-emerald-400 font-black text-lg text-center outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 block mb-1">P. Menor (S/)</label>
                  <input type="number" step="0.01" value={ajusteForm.menor === 0 ? '' : ajusteForm.menor} onChange={e => setAjusteForm({...ajusteForm, menor: parseInput(e.target.value)})} className="w-full p-3 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white font-black text-center outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 block mb-1">P. Mayor (S/)</label>
                  <input type="number" step="0.01" value={ajusteForm.mayor === 0 ? '' : ajusteForm.mayor} onChange={e => setAjusteForm({...ajusteForm, mayor: parseInput(e.target.value)})} className="w-full p-3 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white font-black text-center outline-none focus:border-indigo-500 transition-colors" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAjuste(false)} className="flex-1 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black rounded-lg uppercase text-[10px] hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                <button disabled={guardando} onClick={guardarCambiosPrecio} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-lg uppercase text-[10px] shadow-md transition-all">{guardando ? '...' : 'Actualizar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA CORPORATIVA Y TOOLBAR DE FILTROS IN-LINE */}
      <header className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 text-white p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Inventario Maestro</h1>
            <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-widest mt-1">Control de Existencias • Catálogo</p>
          </div>
          <button onClick={() => setMostrarInactivos(!mostrarInactivos)} className={`hidden md:block px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${mostrarInactivos ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-md' : 'bg-black border-zinc-700 text-zinc-400 hover:text-white'}`}>
            {mostrarInactivos ? '👁️ Viendo Inactivos' : '🙈 Ocultando Inactivos'}
          </button>
        </div>
        
        {/* BARRA DE HERRAMIENTAS DE FILTRADO */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <input 
            type="text" placeholder="🔍 BUSCAR PRODUCTO O SKU..." value={busqueda} onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
            className="flex-1 md:w-56 bg-black border border-zinc-700 px-3 py-2 rounded-lg text-white font-black text-[10px] outline-none focus:border-indigo-500 uppercase placeholder:text-zinc-600"
          />
          <select 
            value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}
            className="bg-black border border-zinc-700 px-2 py-2 rounded-lg text-white font-black text-[10px] outline-none cursor-pointer max-w-[140px] truncate"
          >
            {proveedoresUnicos.map(prov => <option key={prov} value={prov}>{prov.toUpperCase()}</option>)}
          </select>
          <button onClick={() => setSoloBajoStock(!soloBajoStock)} className={`px-3 py-2 rounded-lg font-black uppercase text-[9px] border transition-all ${soloBajoStock ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-black border-zinc-700 text-zinc-400 hover:text-white'}`}>
            {soloBajoStock ? '⚠️ Críticos' : '📦 Todos'}
          </button>
          
          <div className="bg-zinc-800 px-3 py-1 rounded-lg text-right hidden lg:block">
            <span className="text-[8px] text-zinc-400 font-black uppercase block">Resultados</span>
            <span className="text-sm text-white font-black">{productosFiltrados.length}</span>
          </div>
        </div>
      </header>

      {/* GRID DE ALTA DENSIDAD (TABLA + TRAZABILIDAD) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* COLUMNA IZQUIERDA (75%): TABLA DE PRODUCTOS */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-140px)]">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
              <thead className="bg-zinc-100 dark:bg-black/60 sticky top-0 z-10 text-[9px] font-black uppercase text-zinc-500 tracking-widest border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3 w-1/2">Producto y Detalles</th>
                  <th className="p-3 text-center">Stock</th>
                  <th className="p-3 text-right">Análisis Financiero</th>
                  <th className="p-3 text-center">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-[10px]">
                {productosPaginados.map((p) => (
                  <tr key={p.id} className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${!p.activo ? 'opacity-40 bg-zinc-50 dark:bg-zinc-950' : ''} ${productoSel?.id === p.id ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}>
                    
                    {/* PRODUCTO Y SKU */}
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.activo ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'}`}></div>
                        <div>
                          <div className="font-black text-zinc-900 dark:text-white text-xs uppercase leading-tight truncate max-w-[200px] md:max-w-md" title={p.nombre}>{p.nombre}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1 rounded uppercase">🏷️ {p.categoria}</span>
                            <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase truncate max-w-[100px]">📦 {p.proveedor}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* STOCK ALERTA */}
                    <td className="p-2.5 text-center align-middle">
                      <div className={`px-2 py-1 rounded font-black inline-block text-[10px] ${ (p.stock || 0) < 10 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300' }`}>
                        {p.stock || 0} UNID
                      </div>
                    </td>

                    {/* FINANZAS COMPACTAS */}
                    <td className="p-2.5 text-right align-middle">
                      <div className="flex flex-col items-end">
                        <div className="font-black text-zinc-900 dark:text-white text-sm">
                          S/ {Number(p.costo || 0).toFixed(2)}
                        </div>
                        <div className="flex gap-2 text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mt-0.5">
                          <span>Men: <span className="text-zinc-700 dark:text-zinc-300">S/{Number(p.precio || 0).toFixed(2)}</span></span>
                          <span>May: <span className="text-zinc-700 dark:text-zinc-300">S/{Number(p.precio_mayor || 0).toFixed(2)}</span></span>
                        </div>
                      </div>
                    </td>

                    {/* BOTONES DE ACCIÓN */}
                    <td className="p-2.5 text-center align-middle">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => editarNombre(p.id, p.nombre)} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded transition-colors" title="Editar Nombre">✏️</button>
                        <button onClick={() => abrirAjuste(p)} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded transition-colors" title="Ajustar Precio">🏷️</button>
                        <button onClick={() => toggleEstado(p.id, p.activo)} className={`p-1.5 rounded transition-colors ${p.activo ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 text-zinc-400' : 'bg-emerald-600 text-white shadow-sm'}`} title={p.activo ? "Ocultar" : "Activar"}>
                          {p.activo ? '🗑️' : '✅'}
                        </button>
                        <button onClick={() => verTrazabilidad(p)} className={`p-1.5 rounded transition-colors ${productoSel?.id === p.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`} title="Ver Trazabilidad">🔍</button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
            {productosFiltrados.length === 0 && (
              <div className="text-center py-10 text-[10px] font-black text-zinc-400 uppercase italic">No se encontraron productos con estos filtros</div>
            )}
          </div>

          {/* --- CONTROLES DE PAGINACIÓN --- */}
          {productosFiltrados.length > 0 && (
            <div className="bg-zinc-50 dark:bg-black border-t border-zinc-200 dark:border-zinc-800 p-3 flex justify-between items-center text-[10px]">
              <span className="font-black text-zinc-500 uppercase tracking-widest hidden md:inline">
                Mostrando {(paginaActual - 1) * itemsPorPagina + 1} - {Math.min(paginaActual * itemsPorPagina, productosFiltrados.length)} de {productosFiltrados.length}
              </span>
              <div className="flex gap-2 items-center w-full md:w-auto justify-between md:justify-end">
                <button disabled={paginaActual === 1} onClick={() => setPaginaActual(p => p - 1)} className="px-3 py-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-black uppercase disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Anterior</button>
                <span className="font-black text-zinc-900 dark:text-white px-2">Pág. {paginaActual} de {totalPaginas || 1}</span>
                <button disabled={paginaActual >= totalPaginas} onClick={() => setPaginaActual(p => p + 1)} className="px-3 py-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-black uppercase disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Siguiente</button>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (25%): PANEL DE TRAZABILIDAD (STICKY) */}
        <div className="lg:col-span-1 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col h-[calc(100vh-140px)] shadow-inner">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-pulse"></span> 
            Trazabilidad del Ítem
          </h3>
          
          {productoSel ? (
            <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="mb-4">
                <div className="text-sm font-black text-zinc-900 dark:text-white uppercase leading-tight">{productoSel.nombre}</div>
                <div className="text-[9px] font-bold text-zinc-500 mt-1 uppercase">SKU: {productoSel.sku || 'S/N'}</div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {historial.map((m, i) => (
                  <div key={i} className="p-3 bg-white dark:bg-black/40 rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-[10px]">
                    <div>
                      <div className={`font-black ${m.tipo_movimiento === 'ENTRADA' ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>{m.tipo_movimiento}</div>
                      <div className="font-bold text-zinc-400 mt-0.5">{new Date(m.fecha).toLocaleDateString()}</div>
                    </div>
                    <div className="text-lg font-black text-zinc-900 dark:text-white">
                      {m.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                    </div>
                  </div>
                ))}
                {historial.length === 0 && (
                  <p className="text-center text-[9px] font-bold text-zinc-400 uppercase italic py-10">Sin movimientos registrados</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center">
              <div className="text-4xl mb-2 grayscale">📈</div>
              <p className="text-[9px] font-black uppercase text-zinc-900 dark:text-white">Seleccione un producto<br/>para ver su historial</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}