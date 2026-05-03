'use client';

import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';

/**
 * COMPONENTE: MODAL DE GESTIÓN Y SELECCIÓN DE CLIENTES
 * Funcionalidad: Permite identificar clientes por DNI/RUC, seleccionar "Público General"
 * o capturar datos de clientes nuevos antes de emitir la Nota de Pedido.
 */

interface ClienteModalProps {
  isOpen: boolean;           // Estado de visibilidad desde el padre
  onClose: () => void;       // Cerrar sin procesar
  onConfirm: (data: any) => void; // Retorna el cliente seleccionado al POS
  procesandoVenta: boolean;  // Estado de carga del botón final
}

export default function ClienteModal({ isOpen, onClose, onConfirm, procesandoVenta }: ClienteModalProps) {
  // --- ESTADOS LOCALES PARA BÚSQUEDA Y EDICIÓN ---
  const [docBusqueda, setDocBusqueda] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');

  // Limpiar campos internos cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      setDocBusqueda('');
      setClienteEncontrado(null);
      setError('');
    }
  }, [isOpen]);

  // 1. LÓGICA DE BÚSQUEDA EN SUPABASE (VÍA API)
  const handleBuscar = async () => {
    if (!docBusqueda || docBusqueda.length < 8) {
      setError('INGRESE UN DNI O RUC VÁLIDO');
      return;
    }

    setBuscando(true);
    setError('');
    try {
      const res = await apiService.buscarCliente(docBusqueda);
      if (res) {
        setClienteEncontrado(res);
        setError('');
      } else {
        // Preparar estructura para cliente nuevo si no existe
        setClienteEncontrado({
          id: null, // Indica que se creará en el backend
          numero_documento: docBusqueda,
          nombre_razon_social: '',
          direccion: '',
          celular: '',
          tipo_documento: docBusqueda.length === 8 ? 'DNI' : 'RUC'
        });
        setError('CLIENTE NO REGISTRADO: COMPLETE LOS DATOS');
      }
    } catch (e) {
      setError('FALLO EN LA CONEXIÓN CON EL SERVIDOR');
    } finally {
      setBuscando(false);
    }
  };

  // 2. ATAJO: SELECCIÓN RÁPIDA DE PÚBLICO GENERAL (VARIOS)
  const seleccionarVarios = () => {
    onConfirm({
      id: null,
      nombre_razon_social: "VARIOS / PÚBLICO GENERAL",
      numero_documento: "00000000",
      direccion: "TRUJILLO",
      tipo_documento: "VARIOS" // SOLUCIÓN AL ERROR 422: Campo obligatorio en el Backend
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300">
        
        {/* CABECERA DEL MODAL */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Identificar Cliente</h2>
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mt-1 italic">Paso Requerido para Nota de Pedido</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-90"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          
          {/* ZONA DE BÚSQUEDA INTELIGENTE */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-zinc-500 uppercase ml-3">Documento de Identidad (DNI/RUC)</label>
            <div className="flex gap-2">
              <input 
                autoFocus
                placeholder="00000000" 
                value={docBusqueda}
                onChange={(e) => setDocBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                className="flex-1 bg-black border border-zinc-800 p-5 rounded-2xl text-xl font-black text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-zinc-900"
              />
              <button 
                onClick={handleBuscar}
                disabled={buscando}
                className="px-6 bg-zinc-800 rounded-2xl hover:bg-zinc-700 transition-colors flex items-center justify-center"
              >
                {buscando ? <span className="animate-spin text-xl">⏳</span> : <span className="text-xl">🔍</span>}
              </button>
            </div>
            {error && <p className="text-[9px] text-amber-500 font-bold uppercase ml-3 italic">{error}</p>}
          </div>

          {/* ACCIÓN RÁPIDA: PÚBLICO GENERAL */}
          <button 
            onClick={seleccionarVarios}
            className="w-full py-4 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
          >
            👥 Usar Cliente "VARIOS / PÚBLICO GENERAL"
          </button>

          {/* FORMULARIO DINÁMICO (SE ACTIVA AL ENCONTRAR O CREAR) */}
          {clienteEncontrado && (
            <div className="p-6 bg-black/40 border border-emerald-500/20 rounded-[2.5rem] space-y-4 animate-in slide-in-from-top duration-500">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-emerald-600 uppercase ml-2">Nombre Completo / Razón Social</label>
                <input 
                  placeholder="DIGITE NOMBRE..." 
                  value={clienteEncontrado.nombre_razon_social}
                  onChange={(e) => setClienteEncontrado({...clienteEncontrado, nombre_razon_social: e.target.value.toUpperCase()})}
                  className="w-full bg-transparent border-b border-zinc-800 p-2 text-sm font-black text-white outline-none uppercase placeholder:text-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-zinc-500 uppercase ml-2">Dirección</label>
                  <input 
                    placeholder="TRUJILLO..." 
                    value={clienteEncontrado.direccion || ''}
                    onChange={(e) => setClienteEncontrado({...clienteEncontrado, direccion: e.target.value.toUpperCase()})}
                    className="w-full bg-transparent border-b border-zinc-800 p-2 text-[11px] font-bold text-zinc-400 outline-none uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-zinc-500 uppercase ml-2">Celular</label>
                  <input 
                    placeholder="900..." 
                    value={clienteEncontrado.celular || ''}
                    onChange={(e) => setClienteEncontrado({...clienteEncontrado, celular: e.target.value})}
                    className="w-full bg-transparent border-b border-zinc-800 p-2 text-[11px] font-bold text-zinc-400 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ACCIÓN FINAL: PROCESAR VENTA + NOTA DE PEDIDO */}
          <button 
            disabled={!clienteEncontrado || procesandoVenta}
            onClick={() => onConfirm(clienteEncontrado)}
            className={`w-full py-7 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
              !clienteEncontrado ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {procesandoVenta ? (
              <>
                <span className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></span>
                GENERANDO DOCUMENTO...
              </>
            ) : (
              <>🚀 FINALIZAR Y EMITIR NOTA</>
            )}
          </button>
        </div>

        <p className="text-[8px] text-zinc-600 font-bold uppercase text-center mt-6 tracking-tighter">
          Jean Nails Store - Sistema de Auditoría Trujillo
        </p>
      </div>
    </div>
  );
}