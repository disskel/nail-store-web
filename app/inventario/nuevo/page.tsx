'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';

export default function NuevoProducto() {
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cargando, setCargando] = useState(false);

  const [showModal, setShowModal] = useState({ open: false, tipo: '', modo: 'create' });
  const [selectedId, setSelectedId] = useState('');
  const [modalData, setModalData] = useState({ name: '', info: '' });

  const [formData, setFormData] = useState({
    sku: '', nombre: '', id_proveedor: '', id_categoria: '',
    costo_unidad: 0, precio_menor: 0, precio_mayor: 0, stock_actual: 0
  });

  // -------------------------------------------------------------------------
  // 1. CARGA DE MAESTROS (PROVEEDORES Y CATEGORÍAS)
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
  // 2. GESTIÓN DE MODALES PARA CREACIÓN RÁPIDA
  // -------------------------------------------------------------------------
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

      setMensaje({ texto: `✅ ${res.message || 'Operación exitosa'}`, tipo: 'success' });
      await cargarMaestros();
      setShowModal({ open: false, tipo: '', modo: 'create' });
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
    } catch (err: any) {
      setMensaje({ texto: `❌ ${err.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  const handleDeleteMaestro = async (tipo: 'cat' | 'prov') => {
    const id = tipo === 'cat' ? formData.id_categoria : formData.id_proveedor;
    if (!id) return;
    if (!confirm("¿Desea eliminar este registro de la vista? (Borrado Lógico)")) return;

    setCargando(true);
    try {
      tipo === 'cat' ? await apiService.deleteCategoria(id) : await apiService.deleteProveedor(id);
      setMensaje({ texto: '✅ Registro deshabilitado correctamente', tipo: 'success' });
      if (tipo === 'cat') setFormData({...formData, id_categoria: ''});
      else setFormData({...formData, id_proveedor: ''});
      await cargarMaestros();
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
    } catch (err: any) {
      setMensaje({ texto: '❌ Error al eliminar', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  // -------------------------------------------------------------------------
  // 3. LÓGICA DE ENVÍO DEL PRODUCTO
  // -------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });
    try {
      // Enviamos el formData. El backend forzará stock_actual a 0 por seguridad[cite: 21]
      await apiService.registrarProducto(formData);
      setMensaje({ texto: '✅ REGISTRO DE PRODUCTO EXITOSO EN NAIL-STORE', tipo: 'success' });
      setFormData({ sku: '', nombre: '', id_proveedor: '', id_categoria: '', costo_unidad: 0, precio_menor: 0, precio_mayor: 0, stock_actual: 0 });
      // Limpiar mensaje tras 5 segundos
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 5000);
    } catch (err: any) {
      setMensaje({ texto: `❌ ERROR AL GUARDAR: ${err.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500 relative">
      
      {/* MODAL DE MAESTROS */}
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

      <header className="mb-12">
        <a href="/inventario" className="text-zinc-500 hover:text-indigo-400 mb-4 inline-flex items-center gap-2 transition-colors font-bold text-sm">
          <span>←</span> VOLVER AL INVENTARIO
        </a>
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-3xl shadow-xl shadow-indigo-600/20">✨</div>
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter">Nuevo Producto</h1>
            <p className="text-zinc-500 font-bold mt-1 uppercase text-xs tracking-widest">Catálogo Maestro de Trujillo</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        <div className="lg:col-span-2 space-y-10">
          {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
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

          {/* SECCIÓN 2: FINANZAS (SOPORTA VALORES EN 0) */}
          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-8 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Finanzas y Márgenes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Costo (S/)</label>
                <input required type="number" step="0.01" value={formData.costo_unidad} onChange={e => setFormData({...formData, costo_unidad: parseFloat(e.target.value)})} className="w-full p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-emerald-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">P. Menor (S/)</label>
                <input required type="number" step="0.01" value={formData.precio_menor} onChange={e => setFormData({...formData, precio_menor: parseFloat(e.target.value)})} className="w-full p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-emerald-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">P. Mayor (S/)</label>
                <input required type="number" step="0.01" value={formData.precio_mayor} onChange={e => setFormData({...formData, precio_mayor: parseFloat(e.target.value)})} className="w-full p-5 bg-black/40 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-emerald-400" />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-10">
          {/* SECCIÓN 3: CLASIFICACIÓN (OBLIGATORIA) */}
          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300 mb-8 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full"></span> Clasificación
            </h3>
            <div className="space-y-8">
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

          {/* SECCIÓN 4: STOCK (BLOQUEADO A 0) */}
          <section className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300 mb-8 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full"></span> Stock Inicial
            </h3>
            {/* Campo bloqueado: El stock inicial siempre debe ser 0 para forzar Registrar Ingreso */}
            <input 
              readOnly 
              type="number" 
              value={0} 
              className="w-full p-5 bg-black/20 border border-zinc-800/50 rounded-2xl outline-none font-black text-2xl text-center text-zinc-600 cursor-not-allowed" 
            />
            <p className="text-[9px] text-zinc-500 font-bold uppercase mt-4 text-center tracking-tighter">
              El stock se habilita desde el menú "Registrar Ingreso"
            </p>
          </section>

          <button type="submit" disabled={cargando} className={`w-full py-7 rounded-[2rem] font-black text-xl tracking-tight shadow-2xl transition-all active:scale-95 ${cargando ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40'}`}>
            {cargando ? 'GUARDANDO...' : '💾 GUARDAR PRODUCTO'}
          </button>

          {mensaje.texto && (
            <div className={`p-6 rounded-2xl text-center font-black text-sm border animate-in slide-in-from-bottom duration-300 shadow-xl ${mensaje.tipo === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {mensaje.texto.toUpperCase()}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}