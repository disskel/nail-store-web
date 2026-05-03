'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';

/**
 * MÓDULO DE GESTIÓN Y SEGUIMIENTO DE CLIENTES (CRM)
 * Propósito: Listar clientes, realizar búsquedas por DNI/Nombre y
 * visualizar la "Hoja de Vida" de compras de cada usuario.
 */

export default function ModuloClientes() {
  // --- 1. ESTADOS DE CARGA Y DATOS ---
  const [clientes, setClientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // --- 2. ESTADOS PARA VISTA DE DETALLE (SEGUIMIENTO) ---
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [historialCompras, setHistorialCompras] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // --- 3. CARGA INICIAL DE CLIENTES ---
  async function cargarDatos() {
    try {
      setCargando(true);
      const data = await apiService.getClientes(); // Consumo de nuevo endpoint en v1.0.13
      setClientes(data);
    } catch (error) {
      setMensaje({ texto: '❌ ERROR AL CARGAR LISTADO DE CLIENTES', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarDatos(); }, []);

  // --- 4. FILTRADO INTELIGENTE (FRONTEND) ---
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => 
      c.nombre_razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.numero_documento.includes(busqueda)
    );
  }, [busqueda, clientes]);

  // --- 5. LÓGICA DE SEGUIMIENTO DE COMPRAS ---
  const verDetalleCliente = async (cliente: any) => {
    setClienteSeleccionado(cliente);
    setHistorialCompras([]);
    setCargandoHistorial(true);
    try {
      // Obtiene todas las Notas de Pedido vinculadas a este ID
      const historial = await apiService.getHistorialCliente(cliente.id);
      setHistorialCompras(historial);
    } catch (error) {
      console.error("Fallo al obtener historial:", error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-emerald-500 font-black tracking-widest uppercase italic animate-pulse">
      Cargando Base de Clientes...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* CABECERA DEL MÓDULO */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Gestión de Clientes</h1>
          <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">
            Trazabilidad y Fidelización • Jean Nails Store
          </p>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 px-6 py-4 rounded-2xl text-right">
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Total Registrados</p>
          <p className="text-2xl text-white font-black">{clientes.length}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* COLUMNA IZQUIERDA: BUSCADOR Y LISTA (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] backdrop-blur-xl">
            <input 
              placeholder="BUSCAR POR NOMBRE O DNI/RUC..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full p-5 bg-black border border-zinc-800 rounded-3xl outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-white uppercase transition-all shadow-inner"
            />
          </section>

          <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {clientesFiltrados.map(c => (
              <button 
                key={c.id} 
                onClick={() => verDetalleCliente(c)}
                className={`p-6 border rounded-3xl text-left transition-all active:scale-[0.98] group flex justify-between items-center ${
                  clienteSeleccionado?.id === c.id 
                  ? 'bg-emerald-600/10 border-emerald-500' 
                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[9px] font-black bg-black px-2 py-0.5 rounded border border-zinc-800 text-zinc-400">
                      {c.tipo_documento}
                    </span>
                    <span className="text-xs font-bold text-zinc-500">{c.numero_documento}</span>
                  </div>
                  <h3 className="font-black text-white text-lg uppercase group-hover:text-emerald-400 transition-colors">
                    {c.nombre_razon_social}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-medium mt-1">
                    📍 {c.direccion || 'DIRECCIÓN NO REGISTRADA'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-zinc-600 uppercase">Contacto</p>
                  <p className="text-sm font-black text-white">{c.celular || 'S/N'}</p>
                </div>
              </button>
            ))}
            {clientesFiltrados.length === 0 && (
              <div className="py-20 text-center text-zinc-700 font-black uppercase italic tracking-widest">
                No se encontraron coincidencias
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: HOJA DE VIDA / SEGUIMIENTO (1/3) */}
        <div className="space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 flex flex-col min-h-[700px] shadow-2xl relative">
            {!clienteSeleccionado ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                <div className="text-6xl">👤</div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                  Seleccione un cliente para ver su seguimiento
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500 space-y-8">
                {/* INFO DE CONTACTO RÁPIDA */}
                <div className="space-y-2">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">
                    Ficha de Seguimiento
                  </h2>
                  <p className="text-2xl font-black text-white leading-tight uppercase italic tracking-tighter">
                    {clienteSeleccionado.nombre_razon_social}
                  </p>
                  <div className="pt-4 space-y-3">
                     <div className="flex items-center gap-3 text-zinc-400">
                        <span className="text-lg">📱</span>
                        <span className="text-sm font-bold">{clienteSeleccionado.celular || 'Sin celular'}</span>
                     </div>
                     <div className="flex items-center gap-3 text-zinc-400">
                        <span className="text-lg">📩</span>
                        <span className="text-xs font-medium">{clienteSeleccionado.contacto_nombre || 'Sin contacto alterno'}</span>
                     </div>
                  </div>
                </div>

                <hr className="border-zinc-800" />

                {/* HISTORIAL DE COMPRAS */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Historial de Notas de Pedido
                  </h3>
                  
                  <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {cargandoHistorial ? (
                      <p className="text-center py-10 text-[10px] font-black text-zinc-700 animate-pulse">CARGANDO HISTORIAL...</p>
                    ) : historialCompras.map((compra, idx) => (
                      <div key={idx} className="p-4 bg-black/40 border border-zinc-800 rounded-2xl space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black text-white italic">
                            {compra.correlativo_nota || 'PEDIDO S/N'}
                          </span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded ${
                            compra.estado === 'COMPLETADA' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {compra.estado}
                          </span>
                        </div>
                        <div className="flex justify-between items-end">
                          <p className="text-[9px] text-zinc-600 font-bold">
                            {new Date(compra.fecha).toLocaleDateString('es-PE')}
                          </p>
                          <p className="text-lg font-black text-white italic">
                            S/ {Number(compra.monto_neto).toFixed(2)}
                          </p>
                        </div>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase">
                          Pago: {compra.medio_pago}
                        </p>
                      </div>
                    ))}
                    {!cargandoHistorial && historialCompras.length === 0 && (
                      <p className="text-center py-10 text-[9px] font-bold text-zinc-700 uppercase italic">
                        No registra compras anteriores
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-zinc-800">
              <p className="text-[8px] text-zinc-600 font-black uppercase text-center tracking-tighter">
                Módulo CRM Trujillo - Jean Nails Store
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* NOTIFICACIONES */}
      {mensaje.texto && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 p-6 rounded-2xl text-center font-black text-sm border animate-in slide-in-from-bottom duration-300 shadow-2xl z-[100] ${
          mensaje.tipo === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'
        }`}>
          {mensaje.texto.toUpperCase()}
        </div>
      )}
    </div>
  );
}