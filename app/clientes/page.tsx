'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
// IMPORTACIÓN DEL COMPONENTE DE FORMULARIO PARA REGISTRO/EDICIÓN
import ClienteForm from './components/ClienteForm';
// IMPORTACIÓN DEL MANTENEDOR CENTRAL DE ACADEMIAS
import AcademiasModal from './components/AcademiasModal';

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

  // --- 3. ESTADO PARA CONTROL DE MODAL DE REGISTRO Y EDICIÓN ---
  const [showForm, setShowForm] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<any>(null);
  
  // NUEVO ESTADO: CONTROL DEL MANTENEDOR DE ACADEMIAS
  const [showAcademias, setShowAcademias] = useState(false);

  // --- NUEVO: ESTADOS PARA ANALÍTICA DE ALIANZAS ---
  const [vistaActual, setVistaActual] = useState<'DIRECTORIO' | 'ANALITICA'>('DIRECTORIO');
  const [analiticaDatos, setAnaliticaDatos] = useState<any>(null);
  const [cargandoAnalitica, setCargandoAnalitica] = useState(false);
  
  // NUEVO: Estados para los Filtros Temporales (Calendarios)
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const cargarAnalitica = async () => {
    setCargandoAnalitica(true);
    try {
      // Inyectamos las fechas en el conector. Si están vacías, viajan como undefined.
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
    if (vistaActual === 'ANALITICA' && !analiticaDatos) {
      cargarAnalitica();
    }
  }, [vistaActual]);

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
      (c.numero_documento.includes(busqueda)) ||
      (c.academias && c.academias.nombre.toLowerCase().includes(busqueda.toLocaleLowerCase()))
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

  // --- 7. MANEJADORES DE ÉXITO Y BORRADO LÓGICO ---
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

  // Pantalla de carga profesional mientras se sincroniza con Trujillo
  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 text-emerald-600 dark:text-emerald-500 font-black tracking-widest uppercase italic animate-pulse transition-colors duration-300">
      Cargando Base de Clientes...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700 transition-colors duration-300">
      
      {/* MODALES DEL MÓDULO */}
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

      {/* CABECERA DEL MÓDULO */}
      <header className="mb-10 flex flex-col md:flex-row md:items-start lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic transition-colors">Gestión de Clientes</h1>
          <p className="text-emerald-600 dark:text-emerald-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic transition-colors">
            Trazabilidad y Fidelización • Jean Nails Store
          </p>
          
          {/* NUEVO: PANEL DE CONTROLES (TOGGLE + FILTROS DE FECHA) */}
          <div className="mt-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            
            {/* TOGGLE SWITCH */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-2xl w-fit border border-zinc-200 dark:border-zinc-800 shadow-inner">
              <button 
                onClick={() => setVistaActual('DIRECTORIO')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vistaActual === 'DIRECTORIO' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                👥 Directorio CRM
              </button>
              <button 
                onClick={() => setVistaActual('ANALITICA')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vistaActual === 'ANALITICA' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                📊 Analítica de Alianzas
              </button>
            </div>

            {/* CALENDARIOS DE FILTRADO (SOLO VISIBLES EN MODO ANALÍTICA) */}
            {vistaActual === 'ANALITICA' && (
              <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-left-4 duration-300">
                <input 
                  type="date" 
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 rounded-xl text-[10px] font-black text-zinc-600 dark:text-zinc-400 outline-none focus:ring-1 focus:ring-indigo-500 uppercase transition-all shadow-sm"
                />
                <span className="text-zinc-400 text-[10px] font-black">AL</span>
                <input 
                  type="date" 
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 rounded-xl text-[10px] font-black text-zinc-600 dark:text-zinc-400 outline-none focus:ring-1 focus:ring-indigo-500 uppercase transition-all shadow-sm"
                />
                <button 
                  onClick={cargarAnalitica}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-indigo-900/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="text-xs">🔍</span> Filtrar
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 lg:gap-6 mt-4 md:mt-0">
          <button 
            onClick={() => setShowAcademias(true)}
            className="px-6 py-4 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black rounded-2xl uppercase text-[9px] tracking-widest border border-indigo-200 dark:border-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="text-sm">🎓</span> Gestionar Academias
          </button>
          <button 
            onClick={() => { setClienteAEditar(null); setShowForm(true); }}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-900/20 transition-all active:scale-95"
          >
            ➕ Nuevo Cliente
          </button>
          <div className="hidden sm:block bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-6 py-4 rounded-2xl text-right transition-colors">
            <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest">Total Registrados</p>
            <p className="text-2xl text-zinc-900 dark:text-white font-black transition-colors">{clientes.length}</p>
          </div>
        </div>
      </header>

      {vistaActual === 'DIRECTORIO' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-500">
          
          {/* COLUMNA IZQUIERDA: BUSCADOR Y LISTA (OCUPA 2/3 DE LA PANTALLA) */}
          <div className="lg:col-span-2 space-y-6">
          <section className="bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2.5rem] backdrop-blur-xl transition-colors">
            <input 
              placeholder="BUSCAR POR NOMBRE, DNI/RUC O ACADEMIA..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full p-5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-3xl outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-zinc-900 dark:text-white uppercase transition-all shadow-inner"
            />
          </section>

          {/* LISTA DE TARJETAS DE CLIENTES CON SCROLL PERSONALIZADO */}
          <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {clientesFiltrados.map(c => (
              <div 
                key={c.id} 
                onClick={() => verDetalleCliente(c)}
                className={`p-6 border rounded-3xl text-left transition-all active:scale-[0.98] group flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer ${
                  clienteSeleccionado?.id === c.id 
                  ? 'bg-emerald-50 dark:bg-emerald-600/10 border-emerald-500 shadow-sm' 
                  : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[9px] font-black bg-white dark:bg-black px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors">
                      {c.tipo_documento}
                    </span>
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 transition-colors">{c.numero_documento}</span>
                    
                    {/* ETIQUETA WOW DE ACADEMIA */}
                    {c.academias && (
                      <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20">
                        🎓 {c.academias.nombre}
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-zinc-900 dark:text-white text-lg uppercase group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {c.nombre_razon_social}
                  </h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium mt-1 transition-colors flex gap-4">
                    <span>📍 {c.direccion || 'S/D'}</span>
                    <span>📱 {c.celular || 'S/N'}</span>
                  </p>
                </div>
                
                {/* BOTONES DE ADMINISTRACIÓN (EDITAR / OCULTAR) */}
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setClienteAEditar(c); setShowForm(true); }}
                    className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); ocultarCliente(c.id, c.nombre_razon_social); }}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors"
                  >
                    Ocultar
                  </button>
                </div>
              </div>
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
      ) : (
        /* --- VISTA DE ANALÍTICA DE ALIANZAS --- */
        <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
          {cargandoAnalitica || !analiticaDatos ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-60">
              <span className="text-6xl mb-6 animate-bounce">📊</span>
              <p className="text-xs font-black text-zinc-500 tracking-widest uppercase animate-pulse">Procesando cubos de datos y rentabilidad...</p>
            </div>
          ) : (
            <>
              {/* SECCIÓN 1: RANKING DE ALIANZAS */}
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter mb-6 flex items-center gap-2 transition-colors">
                  <span className="text-indigo-500">🏆</span> Rendimiento por Academia <span className="text-[10px] text-zinc-500 font-bold tracking-widest ml-2 non-italic">({analiticaDatos.mes_analisis})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {analiticaDatos.ranking_alianzas.length === 0 ? (
                    <p className="text-zinc-500 text-xs font-bold italic col-span-full bg-zinc-100 dark:bg-zinc-900 p-6 rounded-2xl text-center">No hay ventas registradas en alianzas este mes.</p>
                  ) : (
                    analiticaDatos.ranking_alianzas.map((alianza: any, idx: number) => (
                      <div key={idx} className={`p-8 rounded-[2.5rem] border relative overflow-hidden transition-all duration-300 hover:-translate-y-2 ${idx === 0 ? 'bg-gradient-to-br from-indigo-600 to-purple-700 border-transparent text-white shadow-2xl shadow-indigo-900/30' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-xl hover:border-indigo-400 dark:hover:border-indigo-600'}`}>
                        {idx === 0 && <div className="absolute -right-8 -top-8 text-[10rem] opacity-10">🥇</div>}
                        <p className={`text-[9px] font-black uppercase tracking-widest ${idx === 0 ? 'text-indigo-200' : 'text-zinc-400'}`}>Ranking #{idx + 1}</p>
                        <h3 className="text-2xl font-black uppercase leading-tight mt-1 truncate">{alianza.academia}</h3>
                        
                        <div className="mt-8 space-y-6">
                          <div>
                            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${idx === 0 ? 'text-indigo-200' : 'text-zinc-400'}`}>Volumen de Ventas</p>
                            <p className="text-4xl font-black italic tracking-tighter">S/ {alianza.total_generado.toFixed(2)}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 border-t pt-6 border-black/5 dark:border-white/10">
                            <div>
                              <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${idx === 0 ? 'text-indigo-200' : 'text-zinc-400'}`}>Tasa Conversión</p>
                              <p className="text-lg font-black">{alianza.tasa_conversion}%</p>
                              <p className={`text-[9px] font-bold mt-1 ${idx === 0 ? 'text-indigo-300' : 'text-zinc-500'}`}>{alianza.alumnas_compradoras} de {alianza.alumnas_registradas} alumnas</p>
                            </div>
                            <div>
                              <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${idx === 0 ? 'text-indigo-200' : 'text-zinc-400'}`}>ROI (Dscto Cedido)</p>
                              <p className={`text-lg font-black ${idx === 0 ? 'text-rose-200' : 'text-rose-500'}`}>S/ {alianza.total_descuento_cedido.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SECCIÓN 2: TOP EMBAJADORAS */}
              <div className="pt-6">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter mb-6 flex items-center gap-2 transition-colors">
                  <span className="text-emerald-500">💎</span> Top Embajadoras VIP
                </h2>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-4 shadow-xl transition-colors">
                  {analiticaDatos.top_embajadoras.length === 0 ? (
                    <p className="p-10 text-zinc-500 text-xs font-bold italic text-center uppercase tracking-widest">Aún no hay datos de embajadoras para generar el ranking.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analiticaDatos.top_embajadoras.map((embajadora: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 hover:border-emerald-500/30 rounded-3xl transition-all hover:shadow-lg">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                              #{idx + 1}
                            </div>
                            <div className="truncate pr-2">
                              <p className="font-black text-sm text-zinc-900 dark:text-white uppercase truncate">{embajadora.cliente}</p>
                              <p className="text-[9px] font-black text-indigo-500 tracking-widest uppercase truncate mt-1">🎓 {embajadora.academia}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 pl-2">
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Compras</p>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 italic tracking-tighter">S/ {embajadora.total.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

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