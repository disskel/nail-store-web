'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';

export default function NuevoProducto() {
  // -------------------------------------------------------------------------
  // 1. ESTADOS DEL COMPONENTE
  // -------------------------------------------------------------------------
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cargando, setCargando] = useState(false);

  // Control de Modales y Modo (Creación vs Edición)
  const [showModal, setShowModal] = useState({ open: false, tipo: '', modo: 'create' });
  const [selectedId, setSelectedId] = useState(''); // ID para editar/borrar
  const [modalData, setModalData] = useState({ name: '', info: '' });

  // Estado del Formulario de Producto
  const [formData, setFormData] = useState({
    sku: '', nombre: '', id_proveedor: '', id_categoria: '',
    costo_unidad: 0, precio_menor: 0, precio_mayor: 0, stock_actual: 0
  });

  // -------------------------------------------------------------------------
  // 2. CARGA DE DATOS MAESTROS
  // -------------------------------------------------------------------------
  async function cargarMaestros() {
    try {
      const [cats, provs] = await Promise.all([
        apiService.getCategorias(), 
        apiService.getProveedores()
      ]);
      setCategorias(cats);
      setProveedores(provs);
    } catch (error) {
      setMensaje({ texto: '❌ Error al conectar con la base de datos.', tipo: 'error' });
    }
  }

  useEffect(() => { cargarMaestros(); }, []);

  // -------------------------------------------------------------------------
  // 3. LÓGICA DE MANTENEDORES (EDITAR / ELIMINAR / CREAR)
  // -------------------------------------------------------------------------
  
  // Abre el modal para crear o editar
  const openMaestroModal = (tipo: 'cat' | 'prov', modo: 'create' | 'edit') => {
    if (modo === 'edit') {
      const item: any = tipo === 'cat' 
        ? categorias.find((c: any) => c.id === formData.id_categoria)
        : proveedores.find((p: any) => p.id === formData.id_proveedor);
      
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
        res = showModal.tipo === 'cat' 
          ? await apiService.createCategoria(modalData.name, modalData.info)
          : await apiService.createProveedor(modalData.name, modalData.info);
      } else {
        res = showModal.tipo === 'cat'
          ? await apiService.updateCategoria(selectedId, modalData.name, modalData.info)
          : await apiService.updateProveedor(selectedId, modalData.name, modalData.info);
      }

      setMensaje({ texto: `✅ ${res.message}`, tipo: 'success' });
      await cargarMaestros();
      setShowModal({ open: false, tipo: '', modo: 'create' });
    } catch (err: any) {
      setMensaje({ texto: `❌ ${err.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
    }
  };

  const handleDeleteMaestro = async (tipo: 'cat' | 'prov') => {
    const id = tipo === 'cat' ? formData.id_categoria : formData.id_proveedor;
    if (!id) return;
    if (!confirm("¿Desea eliminar este registro de la vista? (Borrado Lógico)")) return;

    setCargando(true);
    try {
      tipo === 'cat' ? await apiService.deleteCategoria(id) : await apiService.deleteProveedor(id);
      setMensaje({ texto: '✅ Eliminado correctamente', tipo: 'success' });
      
      // Limpiar selección tras borrar
      if (tipo === 'cat') setFormData({...formData, id_categoria: ''});
      else setFormData({...formData, id_proveedor: ''});
      
      await cargarMaestros();
    } catch (err: any) {
      setMensaje({ texto: '❌ Error al eliminar', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  // -------------------------------------------------------------------------
  // 4. ENVÍO DE PRODUCTO FINAL
  // -------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      await apiService.registrarProducto(formData);
      setMensaje({ texto: '✅ Registro de Producto exitoso', tipo: 'success' });
      setFormData({ sku: '', nombre: '', id_proveedor: '', id_categoria: '', costo_unidad: 0, precio_menor: 0, precio_mayor: 0, stock_actual: 0 });
    } catch (err: any) {
      setMensaje({ texto: `❌ ${err.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500 relative">
      
      {/* MODAL UNIFICADO (CREAR / EDITAR) */}
      {showModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-white tracking-tight">
              {showModal.modo === 'edit' ? 'Editar' : 'Nuevo'} {showModal.tipo === 'cat' ? 'Categoría' : 'Proveedor'}
            </h2>
            <div className="space-y-4">
              <input 
                placeholder="Nombre..."
                value={modalData.name}
                onChange={e => setModalData({...modalData, name: e.target.value})}
                className="w-full p-5 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-white font-medium"
              />
              <input 
                placeholder={showModal.tipo === 'cat' ? "Descripción..." : "Contacto..."}
                value={modalData.info}
                onChange={e => setModalData({...modalData, info: e.target.value})}
                className="w-full p-5 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-white font-medium"
              />
              <div className="flex gap-4 pt-6">
                <button onClick={() => setShowModal({ ...showModal, open: false })} className="flex-1 py-4 text-zinc-500 font-bold hover:text-white transition-colors">Cancelar</button>
                <button 
                  onClick={handleSaveMaestro}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  {showModal.modo === 'edit' ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <a href="/inventario" className="text-zinc-500 hover:text-indigo-400 mb-4 inline-flex items-center gap-2 transition-colors font-bold text-sm">
            <span>←</span> VOLVER AL INVENTARIO
          </a>
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-3xl shadow-xl shadow-indigo-600/20">✨</div>
            <div>
              <h1 className="text-5xl font-black text-white tracking-tighter">Nuevo Producto</h1>
              <p className="text-zinc-500 font-bold mt-1 uppercase text-xs tracking-widest">Gestión Profesional de Catálogo</p>
            </div>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* COLUMNA IZQUIERDA: LÓGICA DE NEGOCIO */}
        <div className="lg:col-span-2 space-y-10">
          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-8 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Información del Item
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nombre Comercial</label>
                <input required placeholder="Ej: Esmalte Gel" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Código SKU / EAN</label>
                <input required placeholder="NS-000" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold" />
              </div>
            </div>
          </section>

          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-8 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Finanzas y Márgenes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Costo (S/)</label>
                <input required type="number" step="0.01" placeholder="0.00" onChange={e => setFormData({...formData, costo_unidad: parseFloat(e.target.value)})} className="w-full p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-emerald-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">P. Menor (S/)</label>
                <input required type="number" step="0.01" placeholder="0.00" onChange={e => setFormData({...formData, precio_menor: parseFloat(e.target.value)})} className="w-full p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-emerald-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">P. Mayor (S/)</label>
                <input required type="number" step="0.01" placeholder="0.00" onChange={e => setFormData({...formData, precio_mayor: parseFloat(e.target.value)})} className="w-full p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-emerald-400" />
              </div>
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA: CLASIFICACIÓN DINÁMICA */}
        <div className="space-y-10">
          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300 mb-8 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full"></span> Clasificación
            </h3>
            <div className="space-y-8">
              {/* Proveedor con CRUD contextual */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Proveedor</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => openMaestroModal('prov', 'create')} className="text-indigo-400 text-[10px] font-black hover:text-white transition-colors">+ AÑADIR</button>
                    {formData.id_proveedor && (
                      <>
                        <button type="button" onClick={() => openMaestroModal('prov', 'edit')} className="text-amber-400 text-[10px] font-black hover:text-white transition-colors">EDITAR</button>
                        <button type="button" onClick={() => handleDeleteMaestro('prov')} className="text-red-400 text-[10px] font-black hover:text-white transition-colors">BORRAR</button>
                      </>
                    )}
                  </div>
                </div>
                <select required value={formData.id_proveedor} onChange={e => setFormData({...formData, id_proveedor: e.target.value})} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 appearance-none cursor-pointer font-bold">
                  <option value="">Seleccionar...</option>
                  {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              {/* Categoría con CRUD contextual */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Categoría</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => openMaestroModal('cat', 'create')} className="text-indigo-400 text-[10px] font-black hover:text-white transition-colors">+ AÑADIR</button>
                    {formData.id_categoria && (
                      <>
                        <button type="button" onClick={() => openMaestroModal('cat', 'edit')} className="text-amber-400 text-[10px] font-black hover:text-white transition-colors">EDITAR</button>
                        <button type="button" onClick={() => handleDeleteMaestro('cat')} className="text-red-400 text-[10px] font-black hover:text-white transition-colors">BORRAR</button>
                      </>
                    )}
                  </div>
                </div>
                <select required value={formData.id_categoria} onChange={e => setFormData({...formData, id_categoria: e.target.value})} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 appearance-none cursor-pointer font-bold">
                  <option value="">Seleccionar...</option>
                  {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300 mb-8 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full"></span> Stock Inicial
            </h3>
            <input required type="number" placeholder="0" onChange={e => setFormData({...formData, stock_actual: parseInt(e.target.value)})} className="w-full p-5 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-black text-2xl text-center" />
          </section>

          <button 
            type="submit" 
            disabled={cargando}
            className={`w-full py-7 rounded-[2rem] font-black text-xl tracking-tight shadow-2xl transition-all active:scale-95 ${
              cargando 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40'
            }`}
          >
            {cargando ? 'SINCRONIZANDO...' : '💾 GUARDAR PRODUCTO'}
          </button>

          {mensaje.texto && (
            <div className={`p-6 rounded-2xl text-center font-black text-sm border animate-in zoom-in duration-300 ${
              mensaje.tipo === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {mensaje.texto.toUpperCase()}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}