'use client';

import { useEffect, useState } from 'react';
import { obtenerCategorias, crearProducto } from '@/services/productService';
import { listarProveedores } from '@/services/inventoryService';

export default function NuevoProducto() {
  // -------------------------------------------------------------------------
  // 1. ESTADOS DEL COMPONENTE
  // -------------------------------------------------------------------------
  
  // Estado para las listas desplegables (Maestros) para alimentar los selectores
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  
  // Estados de control de la interfaz para feedback al usuario
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cargando, setCargando] = useState(false);

  // Estado del formulario vinculado al ProductoCreateRequest del backend
  const [formData, setFormData] = useState({
    sku: '',
    nombre: '',
    id_proveedor: '',
    id_categoria: '',
    costo_unidad: 0,
    precio_menor: 0,
    precio_mayor: 0,
    stock_actual: 0
  });

  // -------------------------------------------------------------------------
  // 2. EFECTOS Y CARGA DE DATOS
  // -------------------------------------------------------------------------

  // Carga inicial de datos maestros al montar el componente mediante Promise.all
  useEffect(() => {
    async function cargarMaestros() {
      try {
        const [cats, provs] = await Promise.all([
          obtenerCategorias(), 
          listarProveedores()
        ]);
        setCategorias(cats);
        setProveedores(provs);
      } catch (error) {
        console.error("Error al cargar datos maestros:", error);
        setMensaje({ texto: '❌ Error al conectar con la base de datos.', tipo: 'error' });
      }
    }
    cargarMaestros();
  }, []);

  // -------------------------------------------------------------------------
  // 3. MANEJADORES DE EVENTOS (LÓGICA DE NEGOCIO)
  // -------------------------------------------------------------------------

  // Manejador del envío del formulario con validaciones y manejo de errores
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      // Validación básica de selección obligatoria antes de realizar el fetch
      if (!formData.id_proveedor || !formData.id_categoria) {
        throw new Error("Debe seleccionar un proveedor y una categoría.");
      }

      // Llamada al servicio para persistir el producto en Supabase
      await crearProducto(formData);
      setMensaje({ texto: '✅ Producto registrado exitosamente en el catálogo.', tipo: 'success' });
      
      // Limpiar formulario tras éxito para permitir un nuevo registro inmediato
      setFormData({
        sku: '', nombre: '', id_proveedor: '', id_categoria: '',
        costo_unidad: 0, precio_menor: 0, precio_mayor: 0, stock_actual: 0
      });
    } catch (err: any) {
      // Captura de errores tanto de red como validaciones del backend
      setMensaje({ texto: `❌ Error: ${err.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  // -------------------------------------------------------------------------
  // 4. RENDERIZADO (INTERFAZ VISUAL PROFESIONAL)
  // -------------------------------------------------------------------------

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {/* Cabecera de Navegación */}
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <a href="/inventario" className="inline-flex items-center text-zinc-500 hover:text-indigo-400 transition-colors group">
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Volver al Inventario
          </a>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">
            ✨
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Nuevo Producto</h1>
            <p className="text-zinc-500 font-medium">Añade ítems al sistema Nail-Store con control total de márgenes.</p>
          </div>
        </div>
      </header>

      {/* Formulario Estilizado sin simplificación de lógica */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: INFORMACIÓN Y COSTOS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Tarjeta 1: Información Básica */}
          <section className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <h3 className="text-lg font-bold mb-6 text-indigo-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
              Información Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-zinc-500 ml-1">Nombre del Producto</label>
                <input 
                  required
                  type="text"
                  placeholder="Ej: Esmalte Gel UV 15ml"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="p-4 bg-black/50 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all placeholder:text-zinc-700"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-zinc-500 ml-1">Código SKU / Barras</label>
                <input 
                  required
                  type="text"
                  placeholder="NS-001"
                  value={formData.sku}
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                  className="p-4 bg-black/50 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all placeholder:text-zinc-700"
                />
              </div>
            </div>
          </section>

          {/* Tarjeta 2: Costos y Precios */}
          <section className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <h3 className="text-lg font-bold mb-6 text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
              Estructura Financiera (S/)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-zinc-500 ml-1">Costo Unidad</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  value={formData.costo_unidad}
                  onChange={e => setFormData({...formData, costo_unidad: parseFloat(e.target.value)})}
                  className="p-4 bg-black/50 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-zinc-500 ml-1">Venta Menor</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  value={formData.precio_menor}
                  onChange={e => setFormData({...formData, precio_menor: parseFloat(e.target.value)})}
                  className="p-4 bg-black/50 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-zinc-500 ml-1">Venta Mayor</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  value={formData.precio_mayor}
                  onChange={e => setFormData({...formData, precio_mayor: parseFloat(e.target.value)})}
                  className="p-4 bg-black/50 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA: CLASIFICACIÓN Y ACCIÓN */}
        <div className="space-y-8">
          
          {/* Tarjeta 3: Clasificación */}
          <section className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <h3 className="text-lg font-bold mb-6 text-zinc-300">📁 Clasificación</h3>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-zinc-500 ml-1">Proveedor</label>
                <select 
                  required
                  value={formData.id_proveedor}
                  onChange={e => setFormData({...formData, id_proveedor: e.target.value})}
                  className="p-4 bg-black/50 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Seleccionar Proveedor...</option>
                  {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-zinc-500 ml-1">Categoría</label>
                <select 
                  required
                  value={formData.id_categoria}
                  onChange={e => setFormData({...formData, id_categoria: e.target.value})}
                  className="p-4 bg-black/50 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Seleccionar Categoría...</option>
                  {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Tarjeta 4: Inventario Inicial */}
          <section className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <h3 className="text-lg font-bold mb-6 text-zinc-300">📦 Inventario</h3>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-zinc-500 ml-1">Stock Inicial</label>
              <input 
                required
                type="number"
                value={formData.stock_actual}
                onChange={e => setFormData({...formData, stock_actual: parseInt(e.target.value)})}
                className="p-4 bg-black/50 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
              />
            </div>
          </section>

          {/* Botón de Acción Principal */}
          <button 
            type="submit" 
            disabled={cargando}
            className={`w-full py-6 rounded-3xl font-black text-xl tracking-wide shadow-2xl transition-all active:scale-95 ${
              cargando 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            }`}
          >
            {cargando ? 'Sincronizando...' : '💾 GUARDAR PRODUCTO'}
          </button>

          {/* Alertas dinámicas */}
          {mensaje.texto && (
            <div className={`p-5 rounded-2xl text-center font-bold animate-pulse border ${
              mensaje.tipo === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
              {mensaje.texto}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}