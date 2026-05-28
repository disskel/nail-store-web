'use client';

import React, { useState } from 'react';
import { apiService } from '@/services/apiService';

/**
 * COMPONENTE: FORMULARIO DE REGISTRO/EDICIÓN DE CLIENTES
 * Propósito: Capturar datos maestros de clientes cumpliendo con los
 * requerimientos de mayúsculas y validación de documentos de Trujillo.
 */

interface ClienteFormProps {
  clienteInicial?: any;       // Opcional: para modo edición
  onSuccess: () => void;      // Callback al guardar con éxito
  onCancel: () => void;       // Callback para cerrar el formulario
}

export default function ClienteForm({ clienteInicial, onSuccess, onCancel }: ClienteFormProps) {
  
  // --- 1. ESTADO INICIAL DEL FORMULARIO ---
  const [formData, setFormData] = useState({
    tipo_documento: clienteInicial?.tipo_documento || 'DNI',
    numero_documento: clienteInicial?.numero_documento || '',
    nombre_razon_social: clienteInicial?.nombre_razon_social || '',
    direccion: clienteInicial?.direccion || '',
    celular: clienteInicial?.celular || '',
    contacto_nombre: clienteInicial?.contacto_nombre || '',
    id_academia: clienteInicial?.id_academia || '' // NUEVO: Relación Academia
  });

  const [academias, setAcademias] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  
  // NUEVO ESTADO: QUICK-ADD ACADEMIA
  const [modoCrearAcademia, setModoCrearAcademia] = useState(false);
  const [nuevaAcademiaNombre, setNuevaAcademiaNombre] = useState('');

  // CARGAMOS LAS ACADEMIAS AL ABRIR EL MODAL
  const cargarAcademias = () => {
    apiService.getAcademias().then(data => setAcademias(data)).catch(console.error);
  };

  React.useEffect(() => {
    cargarAcademias();
  }, []);

  const handleCrearAcademiaRapida = async () => {
    if (!nuevaAcademiaNombre.trim()) return;
    setGuardando(true);
    try {
      const res = await apiService.crearAcademia({ nombre: nuevaAcademiaNombre.trim(), descuento_sugerido: 0 });
      await cargarAcademias();
      setFormData(prev => ({ ...prev, id_academia: res.data.id })); // Auto-selecciona la nueva academia
      setModoCrearAcademia(false);
      setNuevaAcademiaNombre('');
    } catch (err: any) {
      setError('ERROR AL CREAR ACADEMIA: VERIFIQUE QUE NO EXISTA EL NOMBRE');
    } finally {
      setGuardando(false);
    }
  };

  // --- 2. MANEJADOR DE CAMBIOS CON FORMATEO ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convertir a mayúsculas campos críticos para el PDF de Trujillo
    const formattedValue = (name === 'nombre_razon_social' || name === 'direccion') 
      ? value.toUpperCase() 
      : value;

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  // --- 3. VALIDACIÓN DE DOCUMENTO ---
  const esDocumentoValido = () => {
    if (formData.tipo_documento === 'DNI' && formData.numero_documento.length !== 8) return false;
    if (formData.tipo_documento === 'RUC' && formData.numero_documento.length !== 11) return false;
    return formData.numero_documento.length > 0;
  };

  // --- 4. ENVÍO DE DATOS AL BACKEND ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esDocumentoValido()) {
      setError('LONGITUD DE DOCUMENTO INVÁLIDA');
      return;
    }

    setGuardando(true);
    setError('');

    try {
      // Limpiamos la academia si seleccionó "NINGUNA"
      const payload = { 
        ...formData, 
        id_academia: formData.id_academia === '' ? null : formData.id_academia 
      };

      if (clienteInicial?.id) {
        // MODO EDICIÓN
        await apiService.actualizarCliente(clienteInicial.id, payload);
      } else {
        // MODO NUEVO REGISTRO
        await apiService.registrarCliente(payload);
      }
      onSuccess();
    } catch (err: any) {
      setError('ERROR AL GUARDAR: VERIFIQUE LOS DATOS O EL DNI');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-zinc-900/80 dark:bg-black/80 backdrop-blur-sm p-4 transition-colors duration-300">
      <form 
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-6 animate-in zoom-in duration-300 transition-colors"
      >
        <div className="text-center">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter transition-colors">
            {clienteInicial ? 'Editar Cliente' : 'Nuevo Registro'}
          </h2>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1 transition-colors">Maestro de Clientes Jean Nails</p>
        </div>

        <div className="space-y-4">
          {/* TIPO Y NÚMERO DE DOCUMENTO */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase ml-2 transition-colors">Tipo</label>
              <select 
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleChange}
                className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="VARIOS">VAR</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase ml-2 transition-colors">Documento</label>
              <input 
                name="numero_documento"
                placeholder="00000000"
                value={formData.numero_documento}
                onChange={handleChange}
                className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl text-sm font-black text-emerald-600 dark:text-emerald-400 outline-none transition-colors"
              />
            </div>
          </div>

          {/* NOMBRE O RAZÓN SOCIAL */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase ml-2 transition-colors">Nombre / Razón Social</label>
            <input 
              name="nombre_razon_social"
              placeholder="NOMBRE COMPLETO..."
              value={formData.nombre_razon_social}
              onChange={handleChange}
              required
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl text-sm font-bold text-zinc-900 dark:text-white outline-none uppercase placeholder:text-zinc-300 dark:placeholder:text-zinc-800 transition-colors"
            />
          </div>

          {/* DIRECCIÓN */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase ml-2 transition-colors">Dirección</label>
            <input 
              name="direccion"
              placeholder="CALLE, DISTRITO..."
              value={formData.direccion}
              onChange={handleChange}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 outline-none uppercase placeholder:text-zinc-300 dark:placeholder:text-zinc-800 transition-colors"
            />
          </div>

          {/* CELULAR */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase ml-2 transition-colors">Celular de Contacto</label>
            <input 
              name="celular"
              placeholder="900000000"
              value={formData.celular}
              onChange={handleChange}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl text-sm font-bold text-zinc-900 dark:text-white outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-800 transition-colors"
            />
          </div>
          {/* NUEVO: SELECTOR DE ACADEMIA CON QUICK-ADD */}
          <div className="space-y-1 relative">
            <div className="flex justify-between items-end mb-1">
              <label className="text-[9px] font-black text-indigo-400 dark:text-indigo-500 uppercase ml-2 transition-colors">Academia Vinculada (Opcional)</label>
              {!modoCrearAcademia && (
                <button 
                  type="button" 
                  onClick={() => setModoCrearAcademia(true)} 
                  className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
                >
                  [+ Nueva]
                </button>
              )}
            </div>

            {modoCrearAcademia ? (
              <div className="flex gap-2 animate-in zoom-in-95 duration-200">
                <input 
                  autoFocus
                  placeholder="NOMBRE DE LA ACADEMIA..."
                  value={nuevaAcademiaNombre}
                  onChange={e => setNuevaAcademiaNombre(e.target.value.toUpperCase())}
                  className="flex-1 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/50 p-3 rounded-xl text-sm font-bold text-indigo-900 dark:text-indigo-300 outline-none uppercase transition-colors"
                />
                <button type="button" onClick={handleCrearAcademiaRapida} disabled={guardando} className="px-4 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-indigo-500 transition-all">✓</button>
                <button type="button" onClick={() => setModoCrearAcademia(false)} className="px-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-xs font-black transition-all hover:bg-zinc-300 dark:hover:bg-zinc-700">✕</button>
              </div>
            ) : (
              <select 
                name="id_academia"
                value={formData.id_academia}
                onChange={handleChange}
                className="w-full bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/50 p-3 rounded-xl text-sm font-bold text-indigo-900 dark:text-indigo-300 outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="">-- NINGUNA ACADEMIA --</option>
                {academias.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre} (S/ {Number(a.descuento_sugerido).toFixed(2)})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {error && <p className="text-[10px] text-red-500 font-black text-center uppercase animate-pulse">{error}</p>}

        <div className="flex gap-3 pt-4">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={guardando}
            className="flex-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
          >
            {guardando ? 'PROCESANDO...' : 'GUARDAR CLIENTE'}
          </button>
        </div>
      </form>
    </div>
  );
}