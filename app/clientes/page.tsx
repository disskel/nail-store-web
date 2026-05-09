'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
// IMPORTACIÓN DEL COMPONENTE DE FORMULARIO PARA REGISTRO/EDICIÓN
import ClienteForm from './components/ClienteForm';

/**
 * MÓDULO DE GESTIÓN Y SEGUIMIENTO DE CLIENTES (CRM) - VERSIÓN 1.0.36
 * Propósito: Listar clientes registrados, realizar búsquedas dinámicas,
 * registrar nuevos perfiles y visualizar el historial de ventas (Hoja de Vida).
 * Actualización: Soporte para Modo Claro/Oscuro y optimización de contraste CRM.
 */

export default function ModuloClientes() {
  // --- 1. ESTADOS DE CARGA Y DATOS GLOBALES ---
  const [clientes, setClientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // --- 2. ESTADOS PARA VISTA DE DETALLE (TRAZABILIDAD) ---
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [historialCompras, setHistorialCompras] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // --- 3. ESTADO PARA CONTROL DE MODAL DE REGISTRO ---
  const [showForm, setShowForm] = useState(false);

  // --- 4. CARGA INICIAL DE CLIENTES DESDE EL BACKEND ---
  async function cargarDatos() {
    try {
      setCargando(true);
      // Consumo de endpoint en backend v1.0.13
      const data = await apiService.getClientes(); 
      setClientes(data);
    } catch (error) {
      setMensaje({ texto: '❌ ERROR AL CARGAR LISTADO DE CLIENTES', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  }

  // Disparo automático de carga al montar el componente
  useEffect(() => { cargarDatos(); }, []);

  // --- 5. FILTRADO INTELIGENTE (OPTIMIZADO EN FRONTEND) ---
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => 
      c.nombre_razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.numero_documento.includes(busqueda)
    );
  }, [busqueda, clientes]);

  // --- 6. LÓGICA DE SEGUIMIENTO: HOJA DE VIDA DEL CLIENTE ---
  const verDetalleCliente = async (cliente: any) => {
    setClienteSeleccionado(cliente);
    setHistorialCompras([]);
    setCargandoHistorial(true);
    try {
      // Obtiene todas las ventas previas vinculadas al ID único en Supabase
      const historial = await apiService.getHistorialCliente(cliente.id);
      setHistorialCompras(historial);
    } catch (error) {
      console.error("Fallo al obtener historial:", error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // --- 7. MANEJADORES DE ÉXITO PARA REGISTROS ---
  const manejarExitoRegistro = () => {
    setShowForm(false);
    cargarDatos(); // Refrescar lista para incluir al nuevo cliente
    setMensaje({ texto: '✅ OPERACIÓN REALIZADA CON ÉXITO', tipo: 'success' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  // Pantalla de carga profesional mientras se sincroniza con Trujillo
  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 text-emerald-600 dark:text-emerald-500 font-black tracking-widest uppercase italic animate-pulse transition-colors duration-300">
      Cargando Base de Clientes...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700 transition-colors duration-300">
      
      {/* MODAL DEL FORMULARIO (SE DISPARA AL PRESIONAR "NUEVO CLIENTE") */}
      {showForm && (
        <ClienteForm 
          onSuccess={manejarExitoRegistro} 
          onCancel={() => setShowForm(false)} 
        />
      )}

      {/* CABECERA DEL MÓDULO */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic transition-colors">Gestión de Clientes</h1>
          <p className="text-emerald-600 dark:text-emerald-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic transition-colors">
            Trazabilidad y Fidelización • Jean Nails Store
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowForm(true)}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-900/20 transition-all active:scale-95"
          >
            ➕ Nuevo Cliente
          </button>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-6 py-4 rounded-2xl text-right transition-colors">
            <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest">Total Registrados</p>
            <p className="text-2xl text-zinc-900 dark:text-white font-black transition-colors">{clientes.length}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* COLUMNA IZQUIERDA: BUSCADOR Y LISTA (OCUPA 2/3 DE LA PANTALLA) */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2.5rem] backdrop-blur-xl transition-colors">
            <input 
              placeholder="BUSCAR POR NOMBRE O DNI/RUC..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full p-5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-3xl outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-zinc-900 dark:text-white uppercase transition-all shadow-inner"
            />
          </section>

          {/* LISTA DE TARJETAS DE CLIENTES CON SCROLL PERSONALIZADO */}
          <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {clientesFiltrados.map(c => (
              <button 
                key={c.id} 
                onClick={() => verDetalleCliente(c)}
                className={`p-6 border rounded-3xl text-left transition-all active:scale-[0.98] group flex justify-between items-center ${
                  clienteSeleccionado?.id === c.id 
                  ? 'bg-emerald-50 dark:bg-emerald-600/10 border-emerald-500 shadow-sm' 
                  : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[9px] font-black bg-white dark:bg-black px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors">
                      {c.tipo_documento}
                    </span>
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 transition-colors">{c.numero_documento}</span>
                  </div>
                  <h3 className="font-black text-zinc-900 dark:text-white text-lg uppercase group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {c.nombre_razon_social}
                  </h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium mt-1 transition-colors">
                    📍 {c.direccion || 'DIRECCIÓN NO REGISTRADA'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-zinc-300 dark:text-zinc-600 uppercase transition-colors">Contacto</p>
                  <p className="text-sm font-black text-zinc-900 dark:text-white transition-colors">{c.celular || 'S/N'}</p>
                </div>
              </button>
            ))}
            {clientesFiltrados.length === 0 && (
              <div className="py-20 text-center text-zinc-400 dark:text-zinc-700 font-black uppercase italic tracking-widest transition-colors">
                No se encontraron coincidencias en la base de datos
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: FICHA DE SEGUIMIENTO (OCUPA 1/3 DE LA PANTALLA) */}
        <div className="space-y-6">
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 flex flex-col min-h-[700px] shadow-2xl relative transition-colors">
            {!clienteSeleccionado ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                <div className="text-6xl">👤</div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-500 transition-colors">
                  Seleccione un cliente para ver su historial de compras
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500 space-y-8">
                {/* FICHA DE CONTACTO RÁPIDA */}
                <div className="space-y-2">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-500 transition-colors">
                    Ficha de Seguimiento
                  </h2>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white leading-tight uppercase italic tracking-tighter transition-colors">
                    {clienteSeleccionado.nombre_razon_social}
                  </p>
                  <div className="pt-4 space-y-3">
                     <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 transition-colors">
                        <span className="text-lg">📱</span>
                        <span className="text-sm font-bold">{clienteSeleccionado.celular || 'Sin celular'}</span>
                     </div>
                  </div>
                </div>

                <hr className="border-zinc-200 dark:border-zinc-800 transition-colors" />

                {/* HISTORIAL CRONOLÓGICO DE NOTAS DE PEDIDO */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition-colors">
                    Últimas Notas de Pedido
                  </h3>
                  
                  <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {cargandoHistorial ? (
                      <p className="text-center py-10 text-[10px] font-black text-zinc-400 dark:text-zinc-700 animate-pulse transition-colors">RECUPERANDO HISTORIAL...</p>
                    ) : historialCompras.map((compra, idx) => (
                      <div key={idx} className="p-4 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2 transition-colors">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black text-zinc-900 dark:text-white italic transition-colors">
                            {compra.correlativo_nota || 'S/N'}
                          </span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded transition-colors ${
                            compra.estado === 'COMPLETADA' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
                          }`}>
                            {compra.estado}
                          </span>
                        </div>
                        <div className="flex justify-between items-end">
                          <p className="text-[9px] text-zinc-400 dark:text-zinc-600 font-bold transition-colors">
                            {new Date(compra.fecha).toLocaleDateString('es-PE')}
                          </p>
                          <p className="text-lg font-black text-zinc-900 dark:text-white italic transition-colors">
                            S/ {Number(compra.monto_neto).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {!cargandoHistorial && historialCompras.length === 0 && (
                      <p className="text-center py-10 text-[9px] font-bold text-zinc-400 dark:text-zinc-700 uppercase italic transition-colors">
                        El cliente no registra compras previas
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
              <p className="text-[8px] text-zinc-400 dark:text-zinc-600 font-black uppercase text-center tracking-tighter italic">
                Módulo CRM Trujillo - Jean Nails Store
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* SISTEMA DE NOTIFICACIONES TOAST (UI FEEDBACK) */}
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