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
    contacto_nombre: clienteInicial?.contacto_nombre || ''
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

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
      // Llamada al endpoint POST /api/clientes definido en index.py
      await apiService.registrarCliente(formData);
      onSuccess();
    } catch (err: any) {
      setError('ERROR AL GUARDAR: VERIFIQUE SI EL DNI YA EXISTE');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <form 
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-6 animate-in zoom-in duration-300"
      >
        <div className="text-center">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            {clienteInicial ? 'Editar Cliente' : 'Nuevo Registro'}
          </h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Maestro de Clientes Jean Nails</p>
        </div>

        <div className="space-y-4">
          {/* TIPO Y NÚMERO DE DOCUMENTO */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase ml-2">Tipo</label>
              <select 
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleChange}
                className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="VARIOS">VAR</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase ml-2">Documento</label>
              <input 
                name="numero_documento"
                placeholder="00000000"
                value={formData.numero_documento}
                onChange={handleChange}
                className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm font-black text-emerald-400 outline-none"
              />
            </div>
          </div>

          {/* NOMBRE O RAZÓN SOCIAL */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-500 uppercase ml-2">Nombre / Razón Social</label>
            <input 
              name="nombre_razon_social"
              placeholder="NOMBRE COMPLETO..."
              value={formData.nombre_razon_social}
              onChange={handleChange}
              required
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm font-bold text-white outline-none uppercase"
            />
          </div>

          {/* DIRECCIÓN */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-500 uppercase ml-2">Dirección</label>
            <input 
              name="direccion"
              placeholder="CALLE, DISTRITO..."
              value={formData.direccion}
              onChange={handleChange}
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm font-bold text-zinc-400 outline-none uppercase"
            />
          </div>

          {/* CELULAR */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-500 uppercase ml-2">Celular de Contacto</label>
            <input 
              name="celular"
              placeholder="900000000"
              value={formData.celular}
              onChange={handleChange}
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm font-bold text-white outline-none"
            />
          </div>
        </div>

        {error && <p className="text-[10px] text-red-500 font-black text-center uppercase animate-pulse">{error}</p>}

        <div className="flex gap-3 pt-4">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all"
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