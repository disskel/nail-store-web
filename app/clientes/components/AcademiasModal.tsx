'use client';

import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';

interface AcademiasModalProps {
  onClose: () => void;
}

export default function AcademiasModal({ onClose }: AcademiasModalProps) {
  // -------------------------------------------------------------------------
  // 1. ESTADOS GLOBALES DEL MÓDULO
  // -------------------------------------------------------------------------
  const [academias, setAcademias] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // Para notificaciones
  
  // -------------------------------------------------------------------------
  // 2. ESTADOS: EDICIÓN EN LÍNEA
  // Controlan qué fila de la tabla se está editando y sus datos temporales
  // -------------------------------------------------------------------------
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ nombre: '', descuento_sugerido: 0 });

  // -------------------------------------------------------------------------
  // 3. ESTADOS: CREACIÓN ADMINISTRATIVA (NUEVO REQUERIMIENTO)
  // Controlan el despliegue de la fila superior verde para agregar diccionarios
  // -------------------------------------------------------------------------
  const [modoCrear, setModoCrear] = useState(false);
  const [nuevaData, setNuevaData] = useState({ nombre: '', descuento_sugerido: 0 });

  // -------------------------------------------------------------------------
  // 4. FUNCIONES PRINCIPALES (CRUD)
  // -------------------------------------------------------------------------

  // [READ] - Carga la lista de academias activas desde el backend
  const cargarAcademias = async () => {
    try {
      setCargando(true);
      const data = await apiService.getAcademias();
      setAcademias(data);
    } catch (error) {
      mostrarMensaje('❌ ERROR AL CARGAR ACADEMIAS', 'error');
    } finally {
      setCargando(false);
    }
  };

  // Disparo automático al montar el modal
  useEffect(() => {
    cargarAcademias();
  }, []);

  // Función utilitaria para los "toasts" (notificaciones temporales)
  const mostrarMensaje = (texto: string, tipo: string) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  // [CREATE] - Ejecuta la inyección de una nueva academia en Supabase
  const handleCrear = async () => {
    if (!nuevaData.nombre.trim()) return; // Evita enviar datos en blanco
    try {
      await apiService.crearAcademia({
        nombre: nuevaData.nombre.toUpperCase(),
        descuento_sugerido: nuevaData.descuento_sugerido
      });
      mostrarMensaje('✅ ACADEMIA CREADA', 'success');
      setModoCrear(false); // Cierra la fila de creación
      setNuevaData({ nombre: '', descuento_sugerido: 0 }); // Limpia el formulario
      cargarAcademias(); // Refresca la tabla para mostrar la nueva
    } catch (error) {
      mostrarMensaje('❌ ERROR AL CREAR', 'error');
    }
  };

  // [DELETE LÓGICO] - Oculta la academia sin destruir las relaciones previas
  const handleOcultar = async (id: string, nombre: string) => {
    if (!confirm(`¿Ocultar la academia ${nombre}? No se borrará el historial de sus clientas.`)) return;
    try {
      // Enviamos el flag activo: false al endpoint PATCH
      await apiService.actualizarAcademia(id, { activo: false });
      mostrarMensaje('🗑️ ACADEMIA OCULTADA', 'success');
      cargarAcademias();
    } catch (error) {
      mostrarMensaje('❌ ERROR AL OCULTAR', 'error');
    }
  };

  // Activa la visualización de los inputs en una fila existente
  const iniciarEdicion = (academia: any) => {
    setEditandoId(academia.id);
    setEditData({ 
      nombre: academia.nombre, 
      descuento_sugerido: Number(academia.descuento_sugerido) 
    });
  };

  // [UPDATE] - Guarda los cambios del modo edición
  const guardarEdicion = async (id: string) => {
    try {
      await apiService.actualizarAcademia(id, {
        nombre: editData.nombre.toUpperCase(),
        descuento_sugerido: editData.descuento_sugerido
      });
      mostrarMensaje('✅ ACADEMIA ACTUALIZADA', 'success');
      setEditandoId(null); // Sale del modo edición
      cargarAcademias();
    } catch (error) {
      mostrarMensaje('❌ ERROR AL ACTUALIZAR', 'error');
    }
  };

  // -------------------------------------------------------------------------
  // 5. RENDERIZADO VISUAL (UI)
  // -------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-zinc-900/80 dark:bg-black/80 backdrop-blur-sm p-4 transition-colors duration-300 animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 transition-colors">
        
        {/* --- SECCIÓN A: CABECERA DEL PANEL --- */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter transition-colors">
              Gestión de Academias
            </h2>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1 transition-colors">
              Administración Central del CRM
            </p>
          </div>
          {/* BOTONES SUPERIORES (NUEVA y CERRAR) */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setModoCrear(true)} 
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-900/20 hidden sm:block"
            >
              ➕ Nueva
            </button>
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors font-black"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* BOTÓN "NUEVA" VERSIÓN MÓVIL (Visible solo en pantallas estrechas) */}
        <button 
          onClick={() => setModoCrear(true)} 
          className="w-full mb-4 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md sm:hidden"
        >
          ➕ Nueva Academia
        </button>

        {/* --- SECCIÓN B: ÁREA DE LISTA Y CREACIÓN --- */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          
          {/* FILA DESPLEGABLE DE CREACIÓN (Se muestra solo si modoCrear es TRUE) */}
          {modoCrear && (
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors mb-2 animate-in slide-in-from-top-2">
              <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                {/* Input del Nombre */}
                <input 
                  autoFocus
                  value={nuevaData.nombre} 
                  onChange={e => setNuevaData({...nuevaData, nombre: e.target.value})}
                  className="flex-1 bg-white dark:bg-black border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl text-sm font-black text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 uppercase placeholder:text-emerald-300 dark:placeholder:text-emerald-700"
                  placeholder="NOMBRE DE NUEVA ACADEMIA..."
                />
                {/* Input del Descuento */}
                <div className="flex items-center gap-2 bg-white dark:bg-black border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl w-full sm:w-32 focus-within:ring-1 focus-within:ring-emerald-500">
                  <span className="text-[10px] font-black text-emerald-600/50 dark:text-emerald-400/50">S/</span>
                  <input 
                    type="number"
                    value={nuevaData.descuento_sugerido === 0 ? '' : nuevaData.descuento_sugerido} 
                    onChange={e => setNuevaData({...nuevaData, descuento_sugerido: parseFloat(e.target.value) || 0})}
                    className="w-full bg-transparent text-sm font-black text-emerald-600 dark:text-emerald-400 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {/* Botones de acción de la fila de creación */}
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={handleCrear} className="flex-1 sm:flex-none px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md">Guardar</button>
                <button onClick={() => setModoCrear(false)} className="flex-1 sm:flex-none px-4 py-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Cancelar</button>
              </div>
            </div>
          )}

          {/* LISTA PRINCIPAL DE ACADEMIAS EXISTENTES */}
          {cargando ? (
            <div className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 animate-pulse">
              Cargando catálogo...
            </div>
          ) : academias.length === 0 && !modoCrear ? (
            <div className="text-center py-10 text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">
              No hay academias registradas activas.
            </div>
          ) : (
            academias.map(a => (
              <div key={a.id} className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                
                {editandoId === a.id ? (
                  /* MODO EDICIÓN (Se muestran Inputs) */
                  <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                    <input 
                      value={editData.nombre} 
                      onChange={e => setEditData({...editData, nombre: e.target.value})}
                      className="flex-1 bg-white dark:bg-black border border-indigo-200 dark:border-indigo-800/50 p-3 rounded-xl text-sm font-black text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                      placeholder="NOMBRE DE ACADEMIA"
                    />
                    <div className="flex items-center gap-2 bg-white dark:bg-black border border-indigo-200 dark:border-indigo-800/50 p-3 rounded-xl w-full sm:w-32">
                      <span className="text-[10px] font-black text-zinc-400">S/</span>
                      <input 
                        type="number"
                        value={editData.descuento_sugerido === 0 ? '' : editData.descuento_sugerido} 
                        onChange={e => setEditData({...editData, descuento_sugerido: parseFloat(e.target.value) || 0})}
                        className="w-full bg-transparent text-sm font-black text-indigo-600 dark:text-indigo-400 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ) : (
                  /* MODO LECTURA (Se muestra texto estático) */
                  <div className="flex-1">
                    <h3 className="font-black text-zinc-900 dark:text-white text-lg uppercase transition-colors">
                      🎓 {a.nombre}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                      Descuento Global: <span className="text-indigo-600 dark:text-indigo-400 italic">S/ {Number(a.descuento_sugerido).toFixed(2)}</span>
                    </p>
                  </div>
                )}

                {/* BOTONES DE ACCIÓN POR FILA */}
                <div className="flex gap-2 w-full sm:w-auto">
                  {editandoId === a.id ? (
                    <>
                      <button onClick={() => guardarEdicion(a.id)} className="flex-1 sm:flex-none px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Guardar</button>
                      <button onClick={() => setEditandoId(null)} className="flex-1 sm:flex-none px-4 py-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => iniciarEdicion(a)} className="flex-1 sm:flex-none px-4 py-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Editar</button>
                      <button onClick={() => handleOcultar(a.id, a.nombre)} className="flex-1 sm:flex-none px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Ocultar</button>
                    </>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

        {/* --- SECCIÓN C: NOTIFICACIONES (TOAST) --- */}
        {mensaje.texto && (
          <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 p-4 rounded-xl text-center font-black text-[10px] uppercase tracking-widest border shadow-xl z-[310] animate-in slide-in-from-bottom-2 ${
            mensaje.tipo === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'
          }`}>
            {mensaje.texto}
          </div>
        )}
      </div>
    </div>
  );
}