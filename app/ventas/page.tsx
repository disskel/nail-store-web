'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
// IMPORTACIÓN DEL COMPONENTE DE IMPRESIÓN PROFESIONAL
import NotaPedidoPrint from './components/NotaPedidoPrint';
import ClienteModal from './components/ClienteModal';

/**
 * MÓDULO DE VENTAS (POS) - JEAN NAILS STORE (v1.0.34)
 * Propósito: Gestionar ventas con interfaz de alta densidad para escritorio (Estilo Excel).
 * Actualización: Layout Full-Width y reducción de espacios para maximizar visibilidad.
 */

export default function ModuloVentas() {
  // --- 1. ESTADOS DE SESIÓN Y CARGA ---
  const [cargando, setCargando] = useState(true);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [sesionActiva, setSesionActiva] = useState<any>(null);
  const [resumenSesion, setResumenSesion] = useState<any>(null); // Datos de arqueo multimodal (Caja + Apps)
  const [montoApertura, setMontoApertura] = useState(0);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // --- 2. ESTADOS PARA ARQUEO MULTIMODAL (CIERRE DE CAJA) ---
  const [showCierre, setShowCierre] = useState(false);
  const [montoFisico, setMontoFisico] = useState(0);
  const [montoYape, setMontoYape] = useState(0);
  const [montoPlin, setMontoPlin] = useState(0);
  const [montoTransf, setMontoTransf] = useState(0);

  // --- 3. ESTADOS DE VENTA Y CARRITO ---
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setFiltro] = useState('');
  const [carrito, setCarrito] = useState<any[]>([]);
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [descuento, setDescuento] = useState(0);

  // --- 4. NUEVOS ESTADOS: MODAL DE CLIENTE Y SEGUIMIENTO ---
  const [showClienteModal, setShowClienteModal] = useState(false); // Se activa al presionar "Generar Pedido"
  const [clienteDoc, setClienteDoc] = useState('');
  const [clienteData, setClienteData] = useState<any>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  // --- 5. ESTADO: MOTOR DE IMPRESIÓN ---
  const [datosImpresion, setDatosImpresion] = useState<any>(null);

  // --- CARGA INICIAL Y SINCRONIZACIÓN (TRUJILLO POS) ---
  async function inicializarPOS() {
    try {
      const [status, catalog] = await Promise.all([
        apiService.getEstadoCaja(),
        apiService.getProductosParaIngreso()
      ]);
      
      if (status.esta_abierta) {
        setSesionActiva(status.sesion);
        // Cargamos el resumen detallado (incluye ventas por método y total global)
        const resumen = await apiService.getResumenCaja(status.sesion.id);
        setResumenSesion(resumen);
      } else {
        setSesionActiva(null);
      }
      setProductos(catalog);
    } catch (error) {
      setMensaje({ texto: '❌ FALLO DE SINCRONIZACIÓN CON EL SERVIDOR', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { inicializarPOS(); }, []);

  // --- LÓGICA DE BÚSQUEDA FILTRADA (FRONTEND) ---
  const productosFiltrados = useMemo(() => {
    if (!busqueda) return [];
    return productos.filter(p => 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0
    ).slice(0, 8);
  }, [busqueda, productos]);

  // --- GESTIÓN AVANZADA DEL CARRITO ---
  const agregarAlCarrito = (prod: any) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === prod.id);
      if (existe) return prev; 

      return [...prev, { 
        ...prod, 
        cantidad: 1, 
        precioSeleccionado: prod.precio, 
        esPrecioMayor: false 
      }];
    });
    setFiltro('');
  };

  const actualizarCantidad = (id: string, nuevaCant: number) => {
    if (nuevaCant < 1) return;
    const prodOriginal = productos.find(p => p.id === id);
    
    if (prodOriginal && nuevaCant > prodOriginal.stock) {
      setMensaje({ texto: '⚠️ STOCK MÁXIMO ALCANZADO', tipo: 'error' });
      return;
    }

    setCarrito(prev => prev.map(item => 
      item.id === id ? { ...item, cantidad: nuevaCant } : item
    ));
  };

  const cambiarTipoPrecio = (id: string) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const estadoNuevo = !item.esPrecioMayor;
        return {
          ...item,
          esPrecioMayor: estadoNuevo,
          precioSeleccionado: estadoNuevo ? item.precio_mayor : item.precio
        };
      }
      return item;
    }));
  };

  const eliminarDelCarrito = (id: string) => {
    setCarrito(prev => prev.filter(item => item.id !== id));
  };

  // --- LÓGICA DE CLIENTES (BÚSQUEDA EN MODAL) ---
  const buscarClienteRapido = async () => {
    if (!clienteDoc) return;
    setBuscandoCliente(true);
    try {
      const res = await apiService.buscarCliente(clienteDoc);
      if (res) {
        setClienteData(res);
      } else {
        // Objeto base para cliente nuevo si no existe en Supabase
        setClienteData({ 
          numero_documento: clienteDoc, 
          nombre_razon_social: '', 
          direccion: '',
          tipo_documento: clienteDoc.length === 8 ? 'DNI' : 'RUC' 
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBuscandoCliente(false);
    }
  };

  const seleccionarPublicoGeneral = () => {
    setClienteData({ 
      id: null, // Indicamos que no es un ID existente
      nombre_razon_social: "VARIOS / PÚBLICO GENERAL", 
      numero_documento: "00000000",
      tipo_documento: "VARIOS" // SOLUCIÓN AL ERROR 422: Campo obligatorio en el Backend
    });
  };

  // --- LÓGICA DE CÁLCULOS FINANCIEROS ---
  const subtotalCarrito = useMemo(() => {
    return carrito.reduce((acc, item) => acc + (item.precioSeleccionado * item.cantidad), 0);
  }, [carrito]);

  const totalFinal = useMemo(() => {
    const calculado = subtotalCarrito - descuento;
    return calculado < 0 ? 0 : calculado; 
  }, [subtotalCarrito, descuento]);

  // --- PROCESAMIENTO FINAL: VENTA + NOTA DE PEDIDO ---
  const finalizarTransaccion = async () => {
    if (!clienteData?.nombre_razon_social) {
      setMensaje({ texto: '⚠️ IDENTIFIQUE AL CLIENTE PARA CONTINUAR', tipo: 'error' });
      return;
    }

    setProcesandoVenta(true);
    try {
      const ventaData = {
        items: carrito.map(i => ({
          id_producto: i.id,
          cantidad: i.cantidad,
          precio_unitario: i.precioSeleccionado
        })),
        tipo_documento: "NOTA_VENTA", // Siempre genera Nota de Pedido formal
        id_sesion_caja: sesionActiva.id,
        medio_pago: medioPago,
        descuento: descuento,
        cliente_data: clienteData.id ? null : clienteData, // Enviar datos si es registro nuevo
        id_cliente: clienteData.id || null
      };

      const resultado = await apiService.procesarVenta(ventaData);
      
      // PREPARACIÓN DE DATOS PARA COMPONENTE DE IMPRESIÓN
      setDatosImpresion({
        items: carrito.map(i => ({
          codigo: i.sku || 'S/C',
          cantidad: i.cantidad,
          descripcion: i.nombre,
          precio_unitario: i.precioSeleccionado,
          total: i.precioSeleccionado * i.cantidad
        })),
        cliente: clienteData,
        correlativo: resultado.correlativo,
        total_letras: resultado.total_letras,
        subtotal: subtotalCarrito,
        descuento_global: descuento,
        total_pagar: totalFinal,
        fecha: new Date().toLocaleDateString('es-PE'),
        vendedor: "Usuario Administrador"
      });

      // Disparo de impresión con delay para renderizado
      setTimeout(() => {
        window.print();
        setDatosImpresion(null);
      }, 800);

      setMensaje({ texto: '✅ PEDIDO GENERADO CON ÉXITO', tipo: 'success' });
      
      // Limpieza y refresco total
      setCarrito([]);
      setDescuento(0); 
      setClienteData(null);
      setClienteDoc('');
      setShowClienteModal(false);
      
      const resumenActualizado = await apiService.getResumenCaja(sesionActiva.id);
      setResumenSesion(resumenActualizado);

    } catch (error: any) {
      setMensaje({ texto: `❌ ERROR: ${error.message}`, tipo: 'error' });
    } finally {
      setProcesandoVenta(false);
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
    }
  };

  // --- LÓGICA DE CIERRE MULTIMODAL (CORROBORACIÓN APP/FÍSICO) ---
  const ejecutarCierre = async () => {
    try {
      setCargando(true);
      await apiService.cerrarCaja({
        id_sesion: sesionActiva.id,
        monto_fisico_efectivo: montoFisico,
        monto_yape_contado: montoYape,
        monto_plin_contado: montoPlin, // REQUERIDO POR VERCEL
        monto_transf_contado: montoTransf
      });
      window.location.reload(); // Forzamos recarga para bloquear terminal
    } catch (e) {
      alert("Error al procesar el cierre");
    } finally {
      setCargando(false);
    }
  };

  const manejarApertura = async () => {
    try {
      setCargando(true);
      const data = await apiService.abrirCaja(montoApertura, "APERTURA DESDE PANEL POS");
      setSesionActiva(data.data);
      inicializarPOS(); 
    } catch (error) {
      alert("Fallo al abrir caja");
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-emerald-500 font-black tracking-widest uppercase italic animate-pulse">Sincronizando Terminal...</div>
  );

  // INTERFAZ A: BLOQUEO DE TERMINAL (APERTURA)
  if (!sesionActiva) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] shadow-2xl animate-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Terminal Bloqueada</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Inicie caja para comenzar a vender</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-zinc-500 uppercase ml-3">Saldo Inicial (Efectivo)</label>
               <input 
                type="number" 
                value={montoApertura === 0 ? '' : montoApertura}
                onChange={(e) => setMontoApertura(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full p-6 bg-black border border-zinc-800 rounded-3xl text-center text-4xl font-black text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
            <button onClick={manejarApertura} className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 transition-all active:scale-95">🔓 Iniciar Turno</button>
          </div>
        </div>
      </div>
    );
  }

  // INTERFAZ B: PUNTO DE VENTA (ACTIVO)
  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* COMPONENTE DE IMPRESIÓN (VISIBLE SOLO AL IMPRIMIR) */}
      {datosImpresion && (
        <div className="hidden print:block print:absolute print:inset-0 print:z-[500] print:bg-white">
           <NotaPedidoPrint data={datosImpresion} />
        </div>
      )}

      {/* MODAL DE SELECCIÓN DE CLIENTE (OCULTO EN IMPRESIÓN) */}
      <div className="print:hidden">
        {showClienteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Identificar Cliente</h2>
                  <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mt-1">Requerido para Nota de Pedido</p>
                </div>
                <button onClick={() => setShowClienteModal(false)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
              </div>
              <div className="space-y-6">
                <div className="flex gap-2">
                  <input autoFocus placeholder="DNI / RUC" value={clienteDoc} onChange={e => setClienteDoc(e.target.value)} className="flex-1 bg-black border border-zinc-800 p-5 rounded-2xl text-xl font-black text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
                  <button onClick={buscarClienteRapido} className="px-6 bg-zinc-800 rounded-2xl hover:bg-zinc-700 transition-colors">{buscandoCliente ? '...' : '🔍'}</button>
                </div>
                <button onClick={seleccionarPublicoGeneral} className="w-full py-3 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all">👥 Seleccionar Público General (Varios)</button>
                {clienteData && (
                  <div className="p-6 bg-black/40 border border-emerald-500/20 rounded-2xl space-y-4 animate-in slide-in-from-top duration-300">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-500 uppercase ml-2">Nombre / Razón Social</label>
                      <input placeholder="ESCRIBA EL NOMBRE..." value={clienteData.nombre_razon_social} onChange={e => setClienteData({...clienteData, nombre_razon_social: e.target.value.toUpperCase()})} className="w-full bg-transparent border-b border-zinc-800 p-2 text-sm font-black text-emerald-400 outline-none uppercase" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-500 uppercase ml-2">Dirección</label>
                        <input placeholder="TRUJILLO..." value={clienteData.direccion || ''} onChange={e => setClienteData({...clienteData, direccion: e.target.value.toUpperCase()})} className="w-full bg-transparent border-b border-zinc-800 p-2 text-[11px] font-bold text-zinc-500 outline-none uppercase" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-500 uppercase ml-2">Celular</label>
                        <input placeholder="999..." value={clienteData.celular || ''} onChange={e => setClienteData({...clienteData, celular: e.target.value})} className="w-full bg-transparent border-b border-zinc-800 p-2 text-[11px] font-bold text-zinc-500 outline-none" />
                      </div>
                    </div>
                  </div>
                )}
                <button disabled={procesandoVenta} onClick={finalizarTransaccion} className="w-full py-6 bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 active:scale-95 transition-all">{procesandoVenta ? 'PROCESANDO...' : '🚀 CONFIRMAR NOTA DE PEDIDO'}</button>
              </div>
            </div>
          </div>
        )}

        {showCierre && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6">
            <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-2xl shadow-2xl">
              <h2 className="text-4xl font-black text-white text-center uppercase italic mb-10 tracking-tighter">Arqueo de Caja y Bancos</h2>
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-4">Valores en Sistema</p>
                  <div className="space-y-3 p-6 bg-black rounded-[2rem] border border-zinc-800">
                    <div className="flex justify-between text-xs"><span className="text-zinc-500 uppercase">Efectivo + Inicial:</span> <span className="text-white font-black">S/ {resumenSesion?.saldo_esperado_efectivo.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-zinc-500 uppercase">Ventas Yape:</span> <span className="text-emerald-400 font-black">S/ {resumenSesion?.ventas_por_metodo.YAPE.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-zinc-500 uppercase">Ventas Plin:</span> <span className="text-indigo-400 font-black">S/ {resumenSesion?.ventas_por_metodo.PLIN.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-zinc-500 uppercase">Ventas Transf:</span> <span className="text-indigo-400 font-black">S/ {resumenSesion?.ventas_por_metodo.TRANSFERENCIA.toFixed(2)}</span></div>
                    <div className="border-t border-zinc-800 pt-3 flex justify-between text-xl"><span className="text-zinc-400 font-black">TOTAL:</span> <span className="text-white font-black italic">S/ {resumenSesion?.total_general_caja_bancos.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-4">Conteo Real (Manual)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="EFECTIVO" onChange={e => setMontoFisico(parseFloat(e.target.value) || 0)} className="p-4 bg-black border border-zinc-800 rounded-2xl text-white text-center font-black outline-none focus:ring-1 focus:ring-emerald-500" />
                    <input type="number" placeholder="APP YAPE" onChange={e => setMontoYape(parseFloat(e.target.value) || 0)} className="p-4 bg-black border border-zinc-800 rounded-2xl text-white text-center font-black outline-none focus:ring-1 focus:ring-emerald-500" />
                    <input type="number" placeholder="APP PLIN" onChange={e => setMontoPlin(parseFloat(e.target.value) || 0)} className="p-4 bg-black border border-zinc-800 rounded-2xl text-white text-center font-black outline-none focus:ring-1 focus:ring-emerald-500" />
                    <input type="number" placeholder="BANCO" onChange={e => setMontoTransf(parseFloat(e.target.value) || 0)} className="p-4 bg-black border border-zinc-800 rounded-2xl text-white text-center font-black outline-none focus:ring-1 focus:ring-emerald-500" />
                  </div>
                  <button onClick={ejecutarCierre} className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all">Finalizar Turno y Bloquear</button>
                </div>
              </div>
              <button onClick={() => setShowCierre(false)} className="w-full mt-8 text-zinc-500 font-bold uppercase text-[9px] tracking-tighter hover:text-white transition-colors">Volver al Panel de Ventas</button>
            </div>
          </div>
        )}
      </div>

      {/* CABECERA */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Punto de Venta</h1>
          <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Caja Activa • Trujillo Centro</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="bg-zinc-900/50 border border-zinc-800 px-8 py-5 rounded-3xl text-right border-indigo-500/30 backdrop-blur-md">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Total en Sistema (INC. INICIAL)</p>
            <p className="text-2xl text-white font-black italic tracking-tighter">S/ {Number(resumenSesion?.total_general_caja_bancos || 0).toFixed(2)}</p>
          </div>
          <button onClick={() => setShowCierre(true)} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-red-600/20 hover:border-red-500/30 transition-all text-2xl shadow-xl" title="Arqueo y Cierre Multimodal">🔐</button>
        </div>
      </header>

      {/* --- NUEVO LAYOUT FULL-WIDTH: BUSCADOR SUPERIOR + CARRITO EXCEL --- */}
      <div className="flex flex-col gap-6 print:hidden">
        
        {/* BUSCADOR COMPACTO SUPERIOR */}
        <section className="relative w-full z-[100]">
          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl backdrop-blur-xl shadow-inner">
            <input autoFocus placeholder="BUSCAR PRODUCTO POR NOMBRE O SKU..." value={busqueda} onChange={(e) => setFiltro(e.target.value)} className="w-full p-4 bg-black border border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-white text-base placeholder:text-zinc-800 uppercase transition-all" />
          </div>

          {/* RESULTADOS FLOTANTES TIPO DROPDOWN */}
          {busqueda && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto z-[110] animate-in slide-in-from-top-2">
               {productosFiltrados.map(p => (
                 <button key={p.id} onClick={() => agregarAlCarrito(p)} className="w-full p-4 border-b border-zinc-800/50 text-left hover:bg-indigo-600 transition-all flex justify-between items-center group">
                    <div>
                      <h3 className="font-black text-white uppercase text-sm group-hover:text-white">{p.nombre}</h3>
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{p.categoria}</span>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black text-emerald-400 group-hover:text-white italic">S/ {Number(p.precio).toFixed(2)}</p>
                       <span className="text-[9px] font-black text-zinc-600 bg-black/40 px-2 py-0.5 rounded border border-zinc-800">STK: {p.stock}</span>
                    </div>
                 </button>
               ))}
               {productosFiltrados.length === 0 && <p className="p-8 text-center text-zinc-600 font-black uppercase text-[10px] tracking-widest">Sin resultados disponibles</p>}
            </div>
          )}
        </section>

        {/* --- EL CARRITO EXCEL (FULL WIDTH) --- */}
        <section className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-6 min-h-[650px] flex flex-col shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-6 px-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 flex items-center gap-3"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Detalle del Pedido Pro</h2>
              <span className="text-[10px] font-black text-zinc-600 uppercase bg-black px-3 py-1 rounded-full border border-zinc-800">{carrito.length} ÍTEMS EN LISTA</span>
          </div>

          {/* TABLA ESTILO EXCEL (ALTA DENSIDAD) */}
          <div className="flex-1 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar border border-zinc-800/50 rounded-2xl bg-black/20">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 bg-zinc-900 z-10 shadow-md">
                <tr className="text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                  <th className="p-3 w-[40%] border-r border-zinc-800/50">Descripción del Ítem</th>
                  <th className="p-3 text-center w-[15%] border-r border-zinc-800/50">Tipo Precio</th>
                  <th className="p-3 text-center w-[15%] border-r border-zinc-800/50">Cantidad</th>
                  <th className="p-3 text-right w-[10%] border-r border-zinc-800/50">Unitario</th>
                  <th className="p-3 text-right w-[15%] border-r border-zinc-800/50">Total Bruto</th>
                  <th className="p-3 w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {carrito.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 transition-all text-xs border-b border-zinc-800/30">
                    <td className="p-2 border-r border-zinc-800/30">
                      <p className="font-bold text-zinc-200 uppercase truncate">{item.nombre}</p>
                      <p className="text-[8px] text-zinc-600 font-bold uppercase truncate">{item.sku || 'S/SKU'}</p>
                    </td>
                    <td className="p-2 border-r border-zinc-800/30">
                      <div className="flex gap-1 justify-center scale-90">
                        <button onClick={() => cambiarTipoPrecio(item.id)} className={`px-2 py-1 rounded-md text-[8px] font-black transition-all ${!item.esPrecioMayor ? 'bg-indigo-600 text-white shadow-lg' : 'bg-black text-zinc-600 border border-zinc-800'}`}>MENOR</button>
                        <button onClick={() => cambiarTipoPrecio(item.id)} className={`px-2 py-1 rounded-md text-[8px] font-black transition-all ${item.esPrecioMayor ? 'bg-amber-600 text-white shadow-lg' : 'bg-black text-zinc-600 border border-zinc-800'}`}>MAYOR</button>
                      </div>
                    </td>
                    <td className="p-2 border-r border-zinc-800/30">
                      <div className="flex items-center justify-center gap-2 scale-90">
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} className="w-6 h-6 bg-black border border-zinc-800 rounded flex items-center justify-center font-black text-zinc-400 hover:text-white transition-colors">-</button>
                        <span className="w-6 text-center font-black text-emerald-500 text-sm">{item.cantidad}</span>
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} className="w-6 h-6 bg-black border border-zinc-800 rounded flex items-center justify-center font-black text-zinc-400 hover:text-white transition-colors">+</button>
                      </div>
                    </td>
                    <td className="p-2 text-right font-mono text-zinc-400 border-r border-zinc-800/30">S/ {item.precioSeleccionado.toFixed(2)}</td>
                    <td className="p-2 text-right font-black text-white italic border-r border-zinc-800/30">S/ {(item.precioSeleccionado * item.cantidad).toFixed(2)}</td>
                    <td className="p-2 text-center">
                      <button onClick={() => eliminarDelCarrito(item.id)} className="text-zinc-700 hover:text-red-500 transition-colors">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {carrito.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-24 opacity-20">
                  <span className="text-7xl mb-4 grayscale">🛒</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">Panel de ventas esperando registros</p>
              </div>
            )}
          </div>

          {/* PIE DE TOTALES Y ACCIÓN (STICKY-BOTTOM) */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 items-center">
                
                {/* DCTO GLOBAL */}
                <div className="flex flex-col gap-2">
                  <p className="text-[9px] font-black text-zinc-600 uppercase ml-2 italic">Descuento Global</p>
                  <div className="relative">
                    <input type="number" value={descuento === 0 ? '' : descuento} onChange={e => { const val = parseFloat(e.target.value) || 0; setDescuento(val > subtotalCarrito ? subtotalCarrito : val); }} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-right font-black text-amber-500 outline-none text-base focus:ring-1 focus:ring-amber-500/50" placeholder="0.00" />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 font-black text-[10px] uppercase">Soles</span>
                  </div>
                </div>

                {/* MÉTODOS DE PAGO */}
                <div className="lg:col-span-1">
                   <p className="text-[9px] font-black text-zinc-600 uppercase mb-2 ml-2 italic">Medio de Pago</p>
                   <div className="grid grid-cols-2 gap-1.5">
                      {['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map(metodo => (
                        <button key={metodo} onClick={() => setMedioPago(metodo)} className={`py-2 rounded-lg text-[8px] font-black transition-all ${medioPago === metodo ? 'bg-indigo-600 text-white shadow-xl' : 'bg-black text-zinc-600 border border-zinc-800'}`}>{metodo}</button>
                      ))}
                   </div>
                </div>

                {/* RESUMEN MONETARIO */}
                <div className="lg:col-span-1 text-center border-l border-r border-zinc-800/50">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 italic">Total Neto Pedido</p>
                    <p className="text-4xl lg:text-5xl font-black text-white italic tracking-tighter">S/ {totalFinal.toFixed(2)}</p>
                </div>

                {/* BOTÓN DE ACCIÓN FINAL */}
                <div className="md:col-span-1 lg:col-span-2">
                  <button disabled={carrito.length === 0 || procesandoVenta} onClick={() => setShowClienteModal(true)} className={`w-full py-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 ${carrito.length === 0 ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'}`}>
                    {procesandoVenta ? 'PROCESANDO...' : (
                      <>
                        <span className="text-xl">🚀</span>
                        GENERAR NOTA DE VENTA
                      </>
                    )}
                  </button>
                </div>

              </div>
          </div>
        </section>
      </div>

      {/* NOTIFICACIONES FLOTANTES */}
      {mensaje.texto && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 p-6 rounded-2xl text-center font-black text-xs border animate-in slide-in-from-bottom duration-300 shadow-2xl z-[200] ${mensaje.tipo === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'}`}>{mensaje.texto.toUpperCase()}</div>
      )}
    </div>
  );
}