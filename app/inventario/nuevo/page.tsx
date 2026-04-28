'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';

export default function NuevoProducto() {
  // -------------------------------------------------------------------------
  // 1. ESTADOS DEL COMPONENTE (MANTENIDOS Y EXTENDIDOS)
  // -------------------------------------------------------------------------
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cargando, setCargando] = useState(false);

  // Control de Modales para Mantenedores
  const [showCatModal, setShowCatModal] = useState(false);
  const [showProvModal, setShowProvModal] = useState(false);
  const [newData, setNewData] = useState({ name: '', info: '' });

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
      setMensaje({ texto: '❌ Error al cargar datos maestros.', tipo: 'error' });
    }
  }

  useEffect(() => { cargarMaestros(); }, []);

  // -------------------------------------------------------------------------
  // 3. LÓGICA DE MANTENEDORES (NUEVO)
  // -------------------------------------------------------------------------
  const handleQuickCreate = async (tipo: 'cat' | 'prov') => {
    setCargando(true);
    try {
      if (tipo === 'cat') {
        await apiService.createCategoria(newData.name, newData.info);
      } else {
        await apiService.createProveedor(newData.name, newData.info);
      }
      await cargarMaestros(); // Refrescar listas
      setNewData({ name: '', info: '' });
      setShowCatModal(false);
      setShowProvModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargando(false);
    }
  };

  // -------------------------------------------------------------------------
  // 4. MANEJADOR DE ENVÍO (MANTENIDO ÍNTEGRO)
  // -------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      if (!formData.id_proveedor || !formData.id_categoria) {
        throw new Error("Debe seleccionar un proveedor y una categoría.");
      }
      await apiService.registrarProducto(formData);
      setMensaje({ texto: '✅ Producto registrado exitosamente.', tipo: 'success' });
      setFormData({
        sku: '', nombre: '', id_proveedor: '', id_categoria: '',
        costo_unidad: 0, precio_menor: 0, precio_mayor: 0, stock_actual: 0
      });
    } catch (err: any) {
      setMensaje({ texto: `❌ Error: ${err.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500 relative">
      
      {/* MODAL GENÉRICO PARA MANTENEDORES */}
      {(showCatModal || showProvModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-white">
              {showCatModal ? 'Nueva Categoría' : 'Nuevo Proveedor'}
            </h2>
            <div className="space-y-4">
              <input 
                placeholder="Nombre..."
                value={newData.name}
                onChange={e => setNewData({...newData, name: e.target.value})}
                className="w-full p-4 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <input 
                placeholder={showCatModal ? "Descripción..." : "Contacto..."}
                value={newData.info}
                onChange={e => setNewData({...newData, info: e.target.value})}
                className="w-full p-4 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <div className="flex gap-4 pt-4">
                <button onClick={() => {setShowCatModal(false); setShowProvModal(false);}} className="flex-1 py-4 text-zinc-500 font-bold hover:text-white transition-colors">Cancelar</button>
                <button 
                  onClick={() => handleQuickCreate(showCatModal ? 'cat' : 'prov')}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cabecera (Mantener estilo original) */}
      <header className="mb-10">
        <a href="/inventario" className="text-zinc-500 hover:text-indigo-400 mb-4 inline-block transition-colors">← Volver al Inventario</a>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">✨</div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Nuevo Producto</h1>
            <p className="text-zinc-500 font-medium">Añade ítems con control total de maestros.</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* INFORMACIÓN BÁSICA (Mantenido) */}
          <section className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <h3 className="text-lg font-bold mb-6 text-indigo-400 flex items-center gap-2">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input required placeholder="Nombre del Producto" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="p-4 bg-black/50 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600" />
              <input required placeholder="SKU / Barras" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="p-4 bg-black/50 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600" />
            </div>
          </section>

          {/* ESTRUCTURA FINANCIERA (Mantenido) */}
          <section className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <h3 className="text-lg font-bold mb-6 text-emerald-400 flex items-center gap-2">Estructura Financiera (S/)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input required type="number" step="0.01" placeholder="Costo" onChange={e => setFormData({...formData, costo_unidad: parseFloat(e.target.value)})} className="p-4 bg-black/50 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500" />
              <input required type="number" step="0.01" placeholder="P. Menor" onChange={e => setFormData({...formData, precio_menor: parseFloat(e.target.value)})} className="p-4 bg-black/50 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500" />
              <input required type="number" step="0.01" placeholder="P. Mayor" onChange={e => setFormData({...formData, precio_mayor: parseFloat(e.target.value)})} className="p-4 bg-black/50 border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* CLASIFICACIÓN CON BOTONES DE CREACIÓN RÁPIDA (Mejorado) */}
          <section className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <h3 className="text-lg font-bold mb-6 text-zinc-300">📁 Clasificación</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase text-zinc-500">Proveedor</label>
                  <button type="button" onClick={() => setShowProvModal(true)} className="text-indigo-400 text-xs font-bold hover:underline">+ Añadir</button>
                </div>
                <select required value={formData.id_proveedor} onChange={e => setFormData({...formData, id_proveedor: e.target.value})} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 appearance-none cursor-pointer">
                  <option value="">Seleccionar...</option>
                  {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase text-zinc-500">Categoría</label>
                  <button type="button" onClick={() => setShowCatModal(true)} className="text-indigo-400 text-xs font-bold hover:underline">+ Añadir</button>
                </div>
                <select required value={formData.id_categoria} onChange={e => setFormData({...formData, id_categoria: e.target.value})} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 appearance-none cursor-pointer">
                  <option value="">Seleccionar...</option>
                  {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* INVENTARIO E INFORME (Mantenido) */}
          <section className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <h3 className="text-lg font-bold mb-6 text-zinc-300">📦 Inventario</h3>
            <input required type="number" placeholder="Stock Inicial" onChange={e => setFormData({...formData, stock_actual: parseInt(e.target.value)})} className="w-full p-4 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600" />
          </section>

          <button type="submit" disabled={cargando} className={`w-full py-6 rounded-3xl font-black text-xl tracking-wide shadow-2xl transition-all active:scale-95 ${cargando ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}>
            {cargando ? 'Sincronizando...' : '💾 GUARDAR PRODUCTO'}
          </button>

          {mensaje.texto && (
            <div className={`p-5 rounded-2xl text-center font-bold border ${mensaje.tipo === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
              {mensaje.texto}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}