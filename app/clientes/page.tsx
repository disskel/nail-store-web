'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
import ClienteForm from './components/ClienteForm';
import AcademiasModal from './components/AcademiasModal';

/**
 * MÓDULO DE GESTIÓN DE CLIENTES Y CRM DE ALIANZAS - ALTA DENSIDAD PRO
 * Optimizado para pantallas de escritorio de oficina y adaptabilidad móvil.
 */
export default function ModuloClientes() {
  // --- 1. ESTADOS GLOBALES ---
  const [clientes, setClientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // --- 2. TRAZABILIDAD (DETALLE LATERAL) ---
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [historialCompras, setHistorialCompras] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // --- 3. CONTROLES DE INTERFAZ Y MODALES ---
  const [showForm, setShowForm] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<any>(null);
  const [showAcademias, setShowAcademias] = useState(false);
  const [vistaActual, setVistaActual] = useState<'DIRECTORIO' | 'ANALITICA'>('DIRECTORIO');
  
  // --- 4. ANALÍTICA Y FILTROS INTERACTIVOS ---
  const [analiticaDatos, setAnaliticaDatos] = useState<any>(null);
  const [cargandoAnalitica, setCargandoAnalitica] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  // NUEVO ESTADO: Almacena la academia seleccionada para el filtro interactivo del Top VIP
  const [academiaFiltrada, setAcademiaFiltrada] = useState<string | null>(null);

  const cargarAnalitica = async () => {
    setCargandoAnalitica(true);
    try {
      const data = await apiService.getAnaliticaCRM(
        fechaDesde || undefined, 
        fechaHasta || undefined
      );
      setAnaliticaDatos(data);
    } catch (error) {
      setMensaje({ texto: '❌ ERROR AL CARGAR ANALÍTICA', tipo: 'error' });
    } finally {
      setCargandoAnalitica(false);
    }
  };

  useEffect(() => {
    if (vistaActual === 'ANALITICA') {
      cargarAnalitica();
    }
  }, [vistaActual]);

  async function cargarDatos() {
    try {
      setCargando(true);
      const data = await apiService.getClientes(); 
      setClientes(data);
    } catch (error) {
      setMensaje({ texto: '❌ ERROR AL CARGAR LISTADO DE CLIENTES', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarDatos(); }, []);

  // --- 5. FILTRADO INTELIGENTE (DIRECTORIO) ---
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => 
      c.nombre_razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.numero_documento && c.numero_documento.includes(busqueda)) ||
      (c.academias && c.academias.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    );
  }, [busqueda, clientes]);

  // --- NUEVO: FILTRADO DINÁMICO DE EMBAJADORAS (CONTRATO CLIC INTERACTIVO) ---
  const embajadorasVisualizadas = useMemo(() => {
    if (!analiticaDatos?.top_embajadoras) return [];
    
    // Si hay una academia seleccionada por clic, filtramos su top de forma atómica
    if (academiaFiltrada) {
      return analiticaDatos.top_embajadoras
        .filter((emb: any) => emb.academia.toUpperCase() === academiaFiltrada.toUpperCase())
        .slice(0, 5); // Tomamos las top 5 de esa academia
    }
    
    // Si es null, mostramos el top 5 global de toda la tienda
    return analiticaDatos.top_embajadoras.slice(0, 5);
  }, [analiticaDatos, academiaFiltrada]);

  const verDetalleCliente = async (cliente: any) => {
    setClienteSeleccionado(cliente);
    setHistorialCompras([]);
    setCargandoHistorial(true);
    try {
      const historial = await apiService.getHistorialCliente(cliente.id);
      setHistorialCompras(historial);
    } catch (error) {
      console.error("Fallo al obtener historial:", error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const manejarExitoRegistro = () => {
    setShowForm(false);
    setClienteAEditar(null);
    cargarDatos(); 
    setMensaje({ texto: '✅ OPERACIÓN REALIZADA CON ÉXITO', tipo: 'success' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  const ocultarCliente = async (id: string, nombre: string) => {
    if(!confirm(`¿Estás segura de ocultar a ${nombre}? No se borrarán sus compras.`)) return;
    try {
      await apiService.actualizarCliente(id, { activo: false });
      setMensaje({ texto: '🗑️ CLIENTE OCULTADO CORRECTAMENTE', tipo: 'success' });
      cargarDatos();
      if(clienteSeleccionado?.id === id) setClienteSeleccionado(null);
    } catch (e) {
      setMensaje({ texto: '❌ ERROR AL OCULTAR CLIENTE', tipo: 'error' });
    }
  };

  // CONTROL INTERACTIVO DE CLIC EN ACADEMIAS
  const manejarClicAcademia = (nombreAcademia: string) => {
    setAcademiaFiltrada(prev => prev === nombreAcademia ? null : nombreAcademia);
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 text-emerald-600 dark:text-emerald-500 font-black tracking-widest uppercase italic animate-pulse">
      Cargando Base de Clientes...
    </div>
  );

  return (
    <div className="p-2 lg:p-4 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500 text-xs">
      
      {/* MODALES REUTILIZABLES */}
      {showForm && (
        <ClienteForm 
          clienteInicial={clienteAEditar}
          onSuccess={manejarExitoRegistro} 
          onCancel={() => { setShowForm(false); setClienteAEditar(null); }} 
        />
      )}

      {showAcademias && (
        <AcademiasModal onClose={() => setShowAcademias(false)} />
      )}

      {/* CABECERA COMPACTA DE OFICINA */}
      <header className="mb-3 flex flex-col md:flex-row items-center justify-between bg-zinc-900 text-white p-3 rounded-xl shadow-md gap-3">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div>
            <h1 className="text-lg font-black uppercase tracking-tighter italic">Gestión de Clientes</h1>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Trazabilidad • Fidelización • Alianzas</p>
          </div>

          {/* CONTROLES DE VISTA COMPACTOS */}
          <div className="flex bg-black p-1 rounded-lg border border-zinc-800">
            <button 
              onClick={() => setVistaActual('DIRECTORIO')}
              className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${vistaActual === 'DIRECTORIO' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              👥 Directorio
            </button>
            <button 
              onClick={() => setVistaActual('ANALITICA')}
              className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${vistaActual === 'ANALITICA' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              📊 Analítica
            </button>
          </div>

          {/* FILTROS CALENDARIO COMPACTOS */}
          {vistaActual === 'ANALITICA' && (
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-zinc-800 animate-in fade-in">
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-[9px] font-black text-white outline-none" />
              <span className="text-zinc-500 font-bold text-[9px]">AL</span>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-[9px] font-black text-white outline-none" />
              <button onClick={cargarAnalitica} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-black uppercase">🔍 OK</button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button onClick={() => setShowAcademias(true)} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black rounded-lg uppercase text-[9px] tracking-wider transition-all">🎓 Academias</button>
          <button onClick={() => { setClienteAEditar(null); setShowForm(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg uppercase text-[9px] tracking-wider transition-all shadow-md">➕ Nuevo Cliente</button>
          <div className="bg-zinc-800 px-3 py-1 rounded-lg text-right hidden sm:block">
            <span className="text-[8px] text-zinc-400 font-black uppercase block">Registrados</span>
            <span className="text-sm text-white font-black">{clientes.length}</span>
          </div>
        </div>
      </header>

      {/* ======================================================================= */}
      {/* SECCIÓN VISTA 1: DIRECTORIO CRM (ALTA DENSIDAD SPLIT SCREEN) */}
      {/* ======================================================================= */}
      {vistaActual === 'DIRECTORIO' && (
        <div className="flex flex-col lg:flex-row gap-2 h-[calc(100vh-120px)]">
          
          {/* COLUMNA IZQUIERDA: BUSCADOR Y LISTA COMPACTA */}
          <div className="w-full lg:w-7/10 flex flex-col bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <input 
                placeholder="🔍 BUSCAR POR NOMBRE, DNI/RUC O ACADEMIA..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                className="w-full p-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:border-emerald-500 font-bold text-zinc-900 dark:text-white uppercase transition-all shadow-inner text-[10px]"
              />
            </div>

            {/* TABLA DE REGISTROS CON ESPACIADO CERO */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-100 dark:bg-zinc-900 sticky top-0 z-10 text-[9px] uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-2 font-black">Datos del Perfil</th>
                    <th className="p-2 font-black">Ubicación / Contacto</th>
                    <th className="p-2 font-black text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {clientesFiltrados.map(c => (
                    <tr 
                      key={c.id} onClick={() => verDetalleCliente(c)}
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer ${clienteSeleccionado?.id === c.id ? 'bg-emerald-500/10 dark:bg-emerald-500/10' : ''}`}
                    >
                      <td className="p-1.5 max-w-xs truncate">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[8px] font-black bg-zinc-200 dark:bg-zinc-800 px-1 rounded text-zinc-600 dark:text-zinc-400">{c.tipo_documento}: {c.numero_documento}</span>
                          {c.academias && (
                            <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 rounded border border-indigo-500/10">🎓 {c.academias.nombre}</span>
                          )}
                        </div>
                        <h3 className="font-black text-zinc-900 dark:text-white uppercase text-[11px] mt-0.5">{c.nombre_razon_social}</h3>
                      </td>
                      <td className="p-1.5 text-zinc-500 dark:text-zinc-400 font-medium">
                        <p className="truncate">📍 {c.direccion || 'S/D'}</p>
                        <p className="text-[9px] font-bold text-zinc-400">📱 {c.celular || 'S/N'}</p>
                      </td>
                      <td className="p-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setClienteAEditar(c); setShowForm(true); }} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded font-black text-[9px] uppercase">Editar</button>
                          <button onClick={() => ocultarCliente(c.id, c.nombre_razon_social)} className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded font-black text-[9px] uppercase">Ocultar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clientesFiltrados.length === 0 && (
                <div className="py-10 text-center text-zinc-400 dark:text-zinc-600 font-bold uppercase italic tracking-widest">No hay coincidencias en el sistema</div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: FICHA DE TRAZABILIDAD (HOJA DE VIDA) */}
          <div className="w-full lg:w-3/10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col overflow-hidden">
            {!clienteSeleccionado ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 gap-2">
                <div className="text-3xl">👤</div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Seleccione un cliente para auditar historial</p>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-between space-y-3">
                <div className="space-y-1">
                  <h2 className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Ficha de Seguimiento</h2>
                  <p className="text-sm font-black text-zinc-900 dark:text-white uppercase italic tracking-tight truncate">{clienteSeleccionado.nombre_razon_social}</p>
                  <p className="text-zinc-500 font-bold text-[10px]">📱 {clienteSeleccionado.celular || 'Sin celular'}</p>
                </div>
                <hr className="border-zinc-200 dark:border-zinc-800" />
                
                <div className="flex-1 flex flex-col overflow-hidden">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Últimas Notas de Pedido</h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {cargandoHistorial ? (
                      <p className="text-center py-5 font-black text-zinc-400 animate-pulse text-[9px]">RECUPERANDO HISTORIAL...</p>
                    ) : historialCompras.map((compra, idx) => (
                      <div key={idx} className="p-2 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-lg flex justify-between items-center text-[10px]">
                        <div>
                          <span className="font-black text-zinc-900 dark:text-white block">{compra.correlativo_nota || 'S/N'}</span>
                          <span className="text-[8px] font-bold text-zinc-400">{new Date(compra.fecha).toLocaleDateString('es-PE')}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-zinc-900 dark:text-white block">S/ {Number(compra.monto_neto).toFixed(2)}</span>
                          <span className={`text-[7px] font-black px-1 rounded ${compra.estado === 'COMPLETADA' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{compra.estado}</span>
                        </div>
                      </div>
                    ))}
                    {!cargandoHistorial && historialCompras.length === 0 && (
                      <p className="text-center py-5 text-[9px] font-bold text-zinc-400 uppercase italic">Sin compras registradas</p>
                    )}
                  </div>
                </div>
                <div className="text-center border-t border-zinc-200 dark:border-zinc-800 pt-2 text-[8px] font-black text-zinc-400 uppercase italic">CRM Trujillo • Nails Pro</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SECCIÓN VISTA 2: ANALÍTICA DE ALIANZAS (INTERACTIVA DE ALTA DENSIDAD) */}
      {/* ======================================================================= */}
      {vistaActual === 'ANALITICA' && (
        <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col overflow-hidden">
          {cargandoAnalitica || !analiticaDatos ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-60">
              <span className="text-3xl mb-2 animate-bounce">📊</span>
              <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase animate-pulse">Procesando métricas de alianzas...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 overflow-hidden">
              
              {/* IZQUIERDA (2/3): TABLA COMPACTA DE RENDIMIENTO POR ACADEMIA */}
              <div className="lg:col-span-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-zinc-900 text-white p-2 font-black uppercase text-[9px] tracking-wider flex justify-between items-center">
                  <span>🏆 RENDIMIENTO POR ACADEMIA ({analiticaDatos.mes_analisis})</span>
                  {academiaFiltrada && (
                    <button onClick={() => setAcademiaFiltrada(null)} className="bg-red-600 hover:bg-red-500 px-2 py-0.5 rounded text-[8px] font-black text-white transition-all">❌ QUITAR FILTRO</button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-[9px] uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 sticky top-0">
                      <tr>
                        <th className="p-2 font-black">Academia / Alianza</th>
                        <th className="p-2 font-black text-right">Vol. Ventas</th>
                        <th className="p-2 font-black text-center">Conversión</th>
                        <th className="p-2 font-black text-right">ROI (Dscto)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[11px]">
                      {analiticaDatos.ranking_alianzas.map((alianza: any, idx: number) => {
                        const estaSeleccionada = academiaFiltrada?.toUpperCase() === alianza.academia.toUpperCase();
                        return (
                          <tr 
                            key={idx} onClick={() => manejarClicAcademia(alianza.academia)}
                            className={`cursor-pointer transition-colors ${estaSeleccionada ? 'bg-indigo-600/10 dark:bg-indigo-600/20 font-black' : idx === 0 ? 'bg-emerald-500/5 dark:bg-emerald-500/5 hover:bg-zinc-100 dark:hover:bg-zinc-900/40' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900/40'}`}
                          >
                            <td className="p-2 flex items-center gap-2 max-w-xs truncate">
                              <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-black ${idx === 0 ? 'bg-amber-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>{idx + 1}</span>
                              <span className="uppercase">{alianza.academia}</span>
                            </td>
                            <td className="p-2 text-right font-black text-zinc-900 dark:text-white">S/ {alianza.total_generado.toFixed(2)}</td>
                            <td className="p-2 text-center">
                              <span className="font-bold">{alianza.tasa_conversion}%</span>
                              <span className="text-[8px] text-zinc-400 block font-normal">{alianza.alumnas_compradoras} de {alianza.alumnas_registradas} alumnas</span>
                            </td>
                            <td className="p-2 text-right font-black text-red-500">S/ {alianza.total_descuento_cedido.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DERECHA (1/3): TOP EMBAJADORAS VIP DINÁMICO */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-emerald-600 text-white p-2 font-black uppercase text-[9px] tracking-wider flex justify-between items-center">
                  <span>💎 TOP EMBAJADORAS VIP</span>
                  <span className="bg-emerald-700 px-2 py-0.5 rounded text-[8px] font-black">{academiaFiltrada ? 'FILTRADO' : 'GLOBAL'}</span>
                </div>
                
                <div className="p-2 bg-zinc-50 dark:bg-zinc-950/40 text-[9px] border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 uppercase">
                  {academiaFiltrada ? `Mostrando compras de: ${academiaFiltrada}` : 'Mostrando las alumnas con mayor compra del mes general'}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {embajadorasVisualizadas.map((embajadora: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px]">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[9px] ${idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>#{idx + 1}</span>
                        <div className="truncate">
                          <p className="font-black text-zinc-900 dark:text-white uppercase truncate">{embajadora.cliente}</p>
                          <p className="text-[8px] font-bold text-indigo-500 uppercase truncate">🎓 {embajadora.academia}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-1">
                        <span className="text-[8px] text-zinc-400 block font-bold">COMPRADO</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 italic">S/ {embajadora.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  {embajadorasVisualizadas.length === 0 && (
                    <div className="text-center text-zinc-400 py-10 uppercase italic font-bold text-[9px]">No hay compras registradas para esta academia en el rango seleccionado</div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* TOAST NOTIFICACIONES */}
      {mensaje.texto && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-center font-black text-[9px] uppercase border shadow-2xl z-[200] animate-in slide-in-from-bottom duration-300 ${mensaje.tipo === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'}`}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}