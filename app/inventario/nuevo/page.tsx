'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';

/**
 * MÓDULO DE CREACIÓN DE CATÁLOGO - ALTA DENSIDAD PRO
 * Diseño Full-Width corporativo, sin espacios muertos, botones en Toolbar.
 */
export default function NuevoProducto() {
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cargando, setCargando] = useState(false);

  // MODAL MAESTROS
  const [showModal, setShowModal] = useState({ open: false, tipo: '', modo: 'create' });
  const [selectedId, setSelectedId] = useState('');
  const [modalData, setModalData] = useState({ name: '', info: '' });

  // DATOS DEL PRODUCTO
  const [formData, setFormData] = useState({
    sku: '', nombre: '', id_proveedor: '', id_categoria: '',
    costo_unidad: 0, precio_menor: 0, precio_mayor: 0, stock_actual: 0 // Stock siempre viaja en 0
  });

  // --- 1. CARGA DE MAESTROS ---
  async function cargarMaestros() {
    try {
      const [cats, provs] = await Promise.all([apiService.getCategorias(), apiService.getProveedores()]);
      setCategorias(cats);
      setProveedores(provs);
    } catch (error) { setMensaje({ texto: '❌ Error al sincronizar maestros.', tipo: 'error' }); }
  }

  useEffect(() => { cargarMaestros(); }, []);

  // --- 2. GESTIÓN DE MODALES (CAT / PROV) ---
  const openMaestroModal = (tipo: 'cat' | 'prov', modo: 'create' | 'edit') => {
    if (modo === 'edit') {
      const item: any = tipo === 'cat' ? categorias.find((c: any) => c.id === formData.id_categoria) : proveedores.find((p: any) => p.id === formData.id_proveedor);
      if (!item) return alert("Seleccione un elemento primero");
      setModalData({ name: item.nombre, info: item.descripcion || item.contacto || '' });
      setSelectedId(item.id);
    } else {
      setModalData({ name: '', info: '' });
    }
    setShowModal({ open: true, tipo, modo });
  };

  const handleSaveMaestro = async () => {
    setCargando(true);
    try {
      let res;
      if (showModal.modo === 'create') {
        res = showModal.tipo === 'cat' ? await apiService.createCategoria(modalData.name, modalData.info) : await apiService.createProveedor(modalData.name, modalData.info);
      } else {
        res = showModal.tipo === 'cat' ? await apiService.updateCategoria(selectedId, modalData.name, modalData.info) : await apiService.updateProveedor(selectedId, modalData.name, modalData.info);
      }
      setMensaje({ texto: `✅ ${res.message || 'Maestro actualizado'}`, tipo: 'success' });
      await cargarMaestros();
      setShowModal({ open: false, tipo: '', modo: 'create' });
    } catch (err: any) { setMensaje({ texto: `❌ ${err.message}`, tipo: 'error' }); } 
    finally { setCargando(false); setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000); }
  };

  const handleDeleteMaestro = async (tipo: 'cat' | 'prov') => {
    const id = tipo === 'cat' ? formData.id_categoria : formData.id_proveedor;
    if (!id) return;
    if (!confirm("¿Desea eliminar este registro de la vista? (Borrado Lógico)")) return;
    setCargando(true);
    try {
      tipo === 'cat' ? await apiService.deleteCategoria(id) : await apiService.deleteProveedor(id);
      setMensaje({ texto: '✅ Registro deshabilitado', tipo: 'success' });
      if (tipo === 'cat') setFormData({...formData, id_categoria: ''});
      else setFormData({...formData, id_proveedor: ''});
      await cargarMaestros();
    } catch (err: any) { setMensaje({ texto: '❌ Error al eliminar', tipo: 'error' }); } 
    finally { setCargando(false); setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000); }
  };

  // --- 3. ENVÍO DEL PRODUCTO ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });
    try {
      await apiService.registrarProducto(formData);
      setMensaje({ texto: '✅ PRODUCTO AÑADIDO AL CATÁLOGO MAESTRO', tipo: 'success' });
      setFormData({ sku: '', nombre: '', id_proveedor: '', id_categoria: '', costo_unidad: 0, precio_menor: 0, precio_mayor: 0, stock_actual: 0 });
    } catch (err: any) { setMensaje({ texto: `❌ ERROR AL GUARDAR: ${err.message}`, tipo: 'error' }); } 
    finally { setCargando(false); setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000); }
  };

  const parseInput = (val: string) => {
    if (val === '') return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  return (
    <div className="p-4 lg:p-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500 text-xs transition-colors duration-300">
      
      {/* MODAL DE MAESTROS (COMPACTO) */}
      {showModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-lg font-black mb-4 text-zinc-900 dark:text-white uppercase italic tracking-tighter border-b border-zinc-200 dark:border-zinc-800 pb-2">
              {showModal.modo === 'edit' ? 'Editar' : 'Nuevo'} {showModal.tipo === 'cat' ? 'Categoría' : 'Proveedor'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 block mb-1">Nombre</label>
                <input value={modalData.name} onChange={e => setModalData({...modalData, name: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-indigo-500 transition-colors text-zinc-900 dark:text-white font-bold uppercase text-[10px]" />
              </div>
              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 block mb-1">{showModal.tipo === 'cat' ? "Descripción" : "Contacto"}</label>
                <input value={modalData.info} onChange={e => setModalData({...modalData, info: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-indigo-500 transition-colors text-zinc-900 dark:text-white font-bold uppercase text-[10px]" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal({ ...showModal, open: false })} className="flex-1 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black rounded-lg uppercase text-[10px] hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                <button type="button" onClick={handleSaveMaestro} className="flex-1 py-2.5 bg-indigo-600 text-white font-black rounded-lg hover:bg-indigo-500 shadow-md active:scale-95 transition-all uppercase text-[10px]">
                  {showModal.modo === 'edit' ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-100px)]">
        
        {/* CABECERA CORPORATIVA Y TOOLBAR (IN-LINE) */}
        <header className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 text-white p-4 rounded-xl shadow-md flex-shrink-0">
          <div className="flex items-center gap-4">
            <a href="/inventario" className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white font-black transition-colors" title="Volver al Inventario">←</a>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter italic">Nuevo Producto</h1>
              <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-widest mt-0.5">Catálogo Maestro • Creación de Perfil</p>
            </div>
          </div>
          
          <button type="submit" disabled={cargando} className={`w-full md:w-auto px-8 py-3 rounded-lg font-black text-[10px] tracking-widest shadow-md transition-all uppercase ${cargando ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95'}`}>
            {cargando ? 'PROCESANDO...' : '💾 GUARDAR EN CATÁLOGO'}
          </button>
        </header>

        {/* GRID DE DATOS (ALTA DENSIDAD 3 COLUMNAS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
          
          {/* BLOQUE 1: IDENTIDAD */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm h-fit transition-colors">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span> 1. Información Básica
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 block mb-1">Nombre Comercial</label>
                <input required placeholder="EJ: ESMALTE GEL BASE" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value.toUpperCase()})} className="w-full p-3 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-indigo-500 transition-colors font-bold text-zinc-900 dark:text-white text-[10px] uppercase placeholder:text-zinc-400 dark:placeholder:text-zinc-700" />
              </div>
              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 block mb-1">Código SKU / EAN</label>
                <input required placeholder="EJ: NS-0001" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} className="w-full p-3 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-indigo-500 transition-colors font-bold text-zinc-900 dark:text-white text-[10px] uppercase placeholder:text-zinc-400 dark:placeholder:text-zinc-700" />
              </div>
            </div>
          </section>

          {/* BLOQUE 2: CLASIFICACIÓN */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm h-fit transition-colors">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 mb-4 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full"></span> 2. Clasificación Logística
            </h3>
            <div className="space-y-4">
              
              {/* CAMPO PROVEEDOR */}
              <div className="bg-zinc-50 dark:bg-black p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase">Proveedor Central</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openMaestroModal('prov', 'create')} className="text-indigo-600 dark:text-indigo-400 text-[8px] font-black hover:underline uppercase">+ Añadir</button>
                    {formData.id_proveedor && (
                      <>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <button type="button" onClick={() => openMaestroModal('prov', 'edit')} className="text-amber-600 dark:text-amber-500 text-[8px] font-black hover:underline uppercase">Editar</button>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <button type="button" onClick={() => handleDeleteMaestro('prov')} className="text-red-500 dark:text-red-400 text-[8px] font-black hover:underline uppercase">Quitar</button>
                      </>
                    )}
                  </div>
                </div>
                <select required value={formData.id_proveedor} onChange={e => setFormData({...formData, id_proveedor: e.target.value})} className="w-full bg-transparent outline-none font-black text-zinc-900 dark:text-white uppercase text-[10px] cursor-pointer">
                  <option value="" className="text-zinc-400">-- SELECCIONE --</option>
                  {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              {/* CAMPO CATEGORÍA */}
              <div className="bg-zinc-50 dark:bg-black p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase">Familia / Categoría</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openMaestroModal('cat', 'create')} className="text-indigo-600 dark:text-indigo-400 text-[8px] font-black hover:underline uppercase">+ Añadir</button>
                    {formData.id_categoria && (
                      <>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <button type="button" onClick={() => openMaestroModal('cat', 'edit')} className="text-amber-600 dark:text-amber-500 text-[8px] font-black hover:underline uppercase">Editar</button>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <button type="button" onClick={() => handleDeleteMaestro('cat')} className="text-red-500 dark:text-red-400 text-[8px] font-black hover:underline uppercase">Quitar</button>
                      </>
                    )}
                  </div>
                </div>
                <select required value={formData.id_categoria} onChange={e => setFormData({...formData, id_categoria: e.target.value})} className="w-full bg-transparent outline-none font-black text-zinc-900 dark:text-white uppercase text-[10px] cursor-pointer">
                  <option value="" className="text-zinc-400">-- SELECCIONE --</option>
                  {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

            </div>
          </section>

          {/* BLOQUE 3: FINANZAS */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm h-fit transition-colors">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <span className="w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 rounded-full"></span> 3. Base Financiera
            </h3>
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/30">
                <label className="text-[9px] font-black text-emerald-700 dark:text-emerald-500 uppercase block mb-1">Costo Unitario Base (S/)</label>
                <input required type="number" step="0.01" value={formData.costo_unidad === 0 ? '' : formData.costo_unidad} onChange={e => setFormData({...formData, costo_unidad: parseInput(e.target.value)})} className="w-full bg-transparent outline-none font-black text-emerald-700 dark:text-emerald-400 text-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 dark:bg-black p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <label className="text-[9px] font-black text-zinc-500 uppercase block mb-1">P. Menor (S/)</label>
                  <input required type="number" step="0.01" value={formData.precio_menor === 0 ? '' : formData.precio_menor} onChange={e => setFormData({...formData, precio_menor: parseInput(e.target.value)})} className="w-full bg-transparent outline-none font-black text-zinc-900 dark:text-white text-base" />
                </div>
                <div className="bg-zinc-50 dark:bg-black p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <label className="text-[9px] font-black text-zinc-500 uppercase block mb-1">P. Mayor (S/)</label>
                  <input required type="number" step="0.01" value={formData.precio_mayor === 0 ? '' : formData.precio_mayor} onChange={e => setFormData({...formData, precio_mayor: parseInput(e.target.value)})} className="w-full bg-transparent outline-none font-black text-zinc-900 dark:text-white text-base" />
                </div>
              </div>
            </div>
          </section>

        </div>
      </form>

      {/* NOTIFICACIONES TOAST */}
      {mensaje.texto && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-center font-black text-[9px] uppercase tracking-widest shadow-2xl z-[100] transition-all animate-in slide-in-from-bottom duration-300 ${mensaje.tipo === 'success' ? 'bg-emerald-500 border border-emerald-400 text-white' : 'bg-red-500 border border-red-400 text-white'}`}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}