'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';
// IMPORTACIÓN DEL NUEVO COMPONENTE DE IMPRESIÓN
import NotaPedidoPrint from './components/NotaPedidoPrint';

export default function ModuloVentas() {
  // --- ESTADOS DE SESIÓN Y CARGA ---
  const [cargando, setCargando] = useState(true);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [sesionActiva, setSesionActiva] = useState<any>(null);
  const [resumenSesion, setResumenSesion] = useState<any>(null); // Estado para totales acumulados
  const [montoApertura, setMontoApertura] = useState(0);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // --- ESTADOS PARA CIERRE DE CAJA (ARQUEO) ---
  const [showCierre, setShowCierre] = useState(false);
  const [montoFisico, setMontoFisico] = useState(0);

  // --- ESTADOS DE VENTA Y DESCUENTO ---
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setFiltro] = useState('');
  const [carrito, setCarrito] = useState<any[]>([]);
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [descuento, setDescuento] = useState(0); // Captura el descuento global aplicado en la venta

  // --- ESTADOS: GESTIÓN DE CLIENTES Y NOTA DE PEDIDO[cite: 20] ---
  const [isNotaPedido, setIsNotaPedido] = useState(false); // Alternar entre Venta Rápida y Pedido
  const [clienteDoc, setClienteDoc] = useState(''); // DNI o RUC para búsqueda
  const [clienteData, setClienteData] = useState<any>(null); // Datos del cliente encontrado o nuevo
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  // --- NUEVO ESTADO: DATOS PARA EL MOTOR DE IMPRESIÓN ---
  const [datosImpresion, setDatosImpresion] = useState<any>(null);

  // 1. CARGA INICIAL Y SEGURIDAD
  async function inicializarPOS() {
    try {
      const [status, catalog] = await Promise.all([
        apiService.getEstadoCaja(),
        apiService.getProductosParaIngreso()
      ]);
      
      if (status.esta_abierta) {
        setSesionActiva(status.sesion);
        const resumen = await apiService.getResumenCaja(status.sesion.id);
        setResumenSesion(resumen);
      } else {
        setSesionActiva(null);
      }
      setProductos(catalog);
    } catch (error) {
      setMensaje({ texto: '❌ ERROR DE CONEXIÓN CON EL SERVIDOR', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { inicializarPOS(); }, []);

  // 2. LÓGICA DE BÚSQUEDA FILTRADA (FRONTEND)
  const productosFiltrados = useMemo(() => {
    if (!busqueda) return [];
    return productos.filter(p => 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0
    ).slice(0, 8);
  }, [busqueda, productos]);

  // 3. GESTIÓN AVANZADA DEL CARRITO
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

  // --- LÓGICA DE CLIENTES (TRUJILLO)[cite: 14] ---
  const buscarClienteRapido = async () => {
    if (!clienteDoc) return;
    setBuscandoCliente(true);
    try {
      const res = await apiService.buscarCliente(clienteDoc);
      if (res) {
        setClienteData(res);
        setMensaje({ texto: '👤 CLIENTE LOCALIZADO', tipo: 'success' });
      } else {
        setClienteData({ 
          numero_documento: clienteDoc, 
          nombre_razon_social: '', 
          direccion: '',
          tipo_documento: clienteDoc.length === 8 ? 'DNI' : 'RUC' 
        });
        setMensaje({ texto: '🆕 CLIENTE NO REGISTRADO', tipo: 'error' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBuscandoCliente(false);
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 2000);
    }
  };

  // --- LÓGICA DE CÁLCULOS FINANCIEROS (CON DESCUENTO) ---
  const subtotalCarrito = useMemo(() => {
    return carrito.reduce((acc, item) => acc + (item.precioSeleccionado * item.cantidad), 0);
  }, [carrito]);

  const totalFinal = useMemo(() => {
    const calculado = subtotalCarrito - descuento;
    return calculado < 0 ? 0 : calculado; 
  }, [subtotalCarrito, descuento]);

  // 4. REGISTRO FINAL DE VENTA Y GENERACIÓN DE NOTA DE PEDIDO[cite: 13, 14, 20]
  const confirmarVenta = async () => {
    if (carrito.length === 0) return;
    
    if (isNotaPedido && clienteData && !clienteData.nombre_razon_social) {
      setMensaje({ texto: '⚠️ EL NOMBRE DEL CLIENTE ES OBLIGATORIO', tipo: 'error' });
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
        tipo_documento: isNotaPedido ? "NOTA_VENTA" : "PROFORMA", 
        id_sesion_caja: sesionActiva.id,
        medio_pago: medioPago,
        descuento: descuento,
        cliente_data: isNotaPedido ? clienteData : null 
      };

      const resultado = await apiService.procesarVenta(ventaData);
      
      // --- PREPARACIÓN DE DATOS PARA IMPRESIÓN[cite: 13, 19] ---
      if (isNotaPedido) {
        setDatosImpresion({
          items: carrito.map(i => ({
            codigo: i.sku || 'S/C',
            cantidad: i.cantidad,
            descripcion: i.nombre,
            precio_unitario: i.precioSeleccionado,
            total: i.precioSeleccionado * i.cantidad
          })),
          cliente: clienteData || { nombre_razon_social: "VARIOS / PÚBLICO GENERAL", numero_documento: "00000000" },
          correlativo: resultado.correlativo,
          total_letras: resultado.total_letras,
          subtotal: subtotalCarrito,
          descuento_global: descuento,
          total_pagar: totalFinal,
          fecha: new Date().toLocaleDateString('es-PE'),
          vendedor: "Usuario Administrador"
        });

        // Disparo de impresión tras un breve delay para renderizado del componente oculto
        setTimeout(() => {
          window.print();
          setDatosImpresion(null); // Limpiar tras imprimir
        }, 800);
      }

      setMensaje({ texto: '✅ PROCESADO CON ÉXITO', tipo: 'success' });
      
      // Limpieza de estados locales
      setCarrito([]);
      setDescuento(0); 
      setClienteData(null);
      setClienteDoc('');
      setMedioPago('EFECTIVO');
      
      const [resumenActualizado, catalogActualizado] = await Promise.all([
        apiService.getResumenCaja(sesionActiva.id),
        apiService.getProductosParaIngreso()
      ]);
      setResumenSesion(resumenActualizado);
      setProductos(catalogActualizado);

    } catch (error: any) {
      setMensaje({ texto: `❌ ERROR: ${error.message}`, tipo: 'error' });
    } finally {
      setProcesandoVenta(false);
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
    }
  };

  // 5. LÓGICA DE CIERRE DEFINITIVO
  const ejecutarCierre = async () => {
    try {
      setCargando(true);
      const res = await apiService.cerrarCaja(sesionActiva.id, montoFisico);
      setSesionActiva(null);
      setResumenSesion(null);
      setShowCierre(false);
      setMensaje({ texto: `✅ CAJA CERRADA`, tipo: 'success' });
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
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-emerald-500 font-black tracking-widest uppercase italic">Sincronizando Terminal...</div>
  );

  // INTERFAZ A: APERTURA (Bloqueo de Terminal)
  if (!sesionActiva) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] shadow-2xl animate-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Terminal Bloqueada</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Se requiere apertura de caja para vender</p>
          </div>
          <div className="space-y-6">
            <input 
              type="number" 
              value={montoApertura === 0 ? '' : montoApertura}
              onChange={(e) => setMontoApertura(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full p-6 bg-black border border-zinc-800 rounded-3xl text-center text-4xl font-black text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <button onClick={manejarApertura} className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 transition-all active:scale-95">🔓 Iniciar Turno</button>
          </div>
        </div>
      </div>
    );
  }

  // INTERFAZ B: PUNTO DE VENTA (Activo)
  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* RENDERIZADO DEL COMPONENTE DE IMPRESIÓN (Invisible excepto en impresión)[cite: 13, 19] */}
      {datosImpresion && <NotaPedidoPrint data={datosImpresion} />}

      {/* MODAL DE ARQUEO DE CAJA */}
      {showCierre && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6">
          <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-lg shadow-2xl">
            <div className="mb-10 text-center">
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Arqueo de Caja</h2>
            </div>
            <div className="space-y-8">
              <div className="p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] text-center">
                 <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-2">Total Esperado en Efectivo</p>
                 <p className="text-5xl text-white font-black italic tracking-tighter">S/ {(resumenSesion?.saldo_esperado_efectivo || 0).toFixed(2)}</p>
              </div>
              <input 
                type="number" 
                autoFocus 
                value={montoFisico === 0 ? '' : montoFisico} 
                onChange={e => setMontoFisico(parseFloat(e.target.value) || 0)} 
                className="w-full p-8 bg-black border border-zinc-800 rounded-3xl text-center text-4xl font-black text-white outline-none focus:ring-2 focus:ring-emerald-500" 
              />
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowCierre(false)} className="flex-1 py-5 text-zinc-500 font-bold uppercase text-[10px]">Cancelar</button>
                <button onClick={ejecutarCierre} className="flex-1 py-5 bg-red-600 text-white font-black rounded-2xl uppercase text-[10px]">Finalizar Turno</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Punto de Venta</h1>
          <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Caja Activa • Trujillo Centro</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="bg-zinc-900/50 border border-zinc-800 px-6 py-4 rounded-2xl text-right">
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Ventas del Turno</p>
            <p className="text-xl text-emerald-400 font-black">S/ {Number(resumenSesion?.total_ventas || 0).toFixed(2)}</p>
          </div>
          <button onClick={() => setShowCierre(true)} className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-red-600/20 transition-all text-xl">🔐</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* COLUMNA IZQUIERDA: BUSCADOR Y RESULTADOS */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl">
            <input 
              autoFocus
              placeholder="ESCRIBA EL NOMBRE DEL PRODUCTO..." 
              value={busqueda}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full p-6 bg-black border border-zinc-800 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-white text-lg placeholder:text-zinc-700 uppercase transition-all"
            />
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productosFiltrados.map(p => (
              <button key={p.id} onClick={() => agregarAlCarrito(p)} className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl text-left hover:border-indigo-500/50 transition-all active:scale-95 group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{p.categoria}</span>
                    <span className="text-[8px] font-black text-zinc-500 uppercase italic">📦 {p.proveedor}</span>
                  </div>
                  <span className="text-[10px] font-black text-zinc-500 bg-black px-2 py-1 rounded-lg border border-zinc-800">STOCK: {p.stock}</span>
                </div>
                <h3 className="font-black text-white text-lg leading-tight uppercase group-hover:text-indigo-400 transition-colors">{p.nombre}</h3>
                <p className="mt-4 text-2xl font-black text-white italic">S/ {Number(p.precio).toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* COLUMNA DERECHA: CARRITO Y GESTIÓN DE NOTA DE PEDIDO[cite: 13, 14, 20] */}
        <div className="space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 flex flex-col min-h-[700px] shadow-2xl relative">
            
            {/* BOTÓN TOGGLE: MODO DE VENTA */}
            <button 
              onClick={() => setIsNotaPedido(!isNotaPedido)}
              className={`mb-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                isNotaPedido ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isNotaPedido ? '📝 MODO: NOTA DE PEDIDO ACTIVA' : '⚡ MODO: VENTA RÁPIDA'}
            </button>

            {/* FORMULARIO DE CLIENTE (Solo visible en Nota de Pedido)[cite: 14] */}
            {isNotaPedido && (
              <div className="mb-6 space-y-4 p-5 bg-black/40 border border-indigo-500/20 rounded-3xl animate-in fade-in duration-500">
                <div className="flex gap-2">
                  <input 
                    placeholder="DNI / RUC" 
                    value={clienteDoc} 
                    onChange={e => setClienteDoc(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                  <button 
                    onClick={buscarClienteRapido}
                    className="px-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs"
                    disabled={buscandoCliente}
                  >
                    {buscandoCliente ? '...' : '🔍'}
                  </button>
                </div>
                
                {clienteData && (
                  <div className="space-y-3 animate-in slide-in-from-top duration-300">
                    <input 
                      placeholder="NOMBRE / RAZÓN SOCIAL" 
                      value={clienteData.nombre_razon_social}
                      onChange={e => setClienteData({...clienteData, nombre_razon_social: e.target.value.toUpperCase()})}
                      className="w-full bg-transparent border-b border-zinc-800 p-2 text-[10px] font-black text-emerald-400 outline-none uppercase"
                    />
                    <input 
                      placeholder="DIRECCIÓN (OPCIONAL)" 
                      value={clienteData.direccion || ''}
                      onChange={e => setClienteData({...clienteData, direccion: e.target.value.toUpperCase()})}
                      className="w-full bg-transparent border-b border-zinc-800 p-2 text-[9px] font-bold text-zinc-400 outline-none uppercase"
                    />
                  </div>
                )}
                {!clienteData && <p className="text-[8px] text-zinc-600 font-black uppercase text-center italic">Ingresa documento para identificar cliente</p>}
              </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
              {carrito.map(item => (
                <div key={item.id} className="space-y-4 p-5 bg-black/40 border border-zinc-800/50 rounded-3xl relative group">
                  <button onClick={() => eliminarDelCarrito(item.id)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500">✕</button>
                  <p className="text-[11px] font-black text-white uppercase leading-tight pr-6">{item.nombre}</p>
                  <div className="flex gap-2">
                    <button onClick={() => cambiarTipoPrecio(item.id)} className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${!item.esPrecioMayor ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>P. MENOR</button>
                    <button onClick={() => cambiarTipoPrecio(item.id)} className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${item.esPrecioMayor ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>P. MAYOR</button>
                  </div>
                  <div className="flex justify-between items-center bg-black/60 p-3 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-zinc-400 hover:bg-zinc-700">-</button>
                      <span className="w-8 text-center font-black text-white">{item.cantidad}</span>
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-zinc-400 hover:bg-zinc-700">+</button>
                    </div>
                    <p className="font-mono font-black text-white italic">S/ {(item.precioSeleccionado * item.cantidad).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800 space-y-6">
              {/* DESCUENTO ESPECIAL */}
              <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-zinc-800/50">
                <div><p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descuento Especial</p></div>
                <input 
                  type="number" 
                  step="0.01" 
                  value={descuento === 0 ? '' : descuento} 
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setDescuento(val > subtotalCarrito ? subtotalCarrito : val);
                  }} 
                  className="w-24 bg-black border border-zinc-800 rounded-xl p-2 text-right font-black text-amber-500 outline-none" 
                  placeholder="0.00" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map(metodo => (
                  <button key={metodo} onClick={() => setMedioPago(metodo)} className={`py-3 rounded-xl text-[10px] font-black transition-all ${medioPago === metodo ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-black text-zinc-500 border border-zinc-800'}`}>{metodo}</button>
                ))}
              </div>

              <div className="flex justify-between items-end px-2">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Final</p>
                <div className="text-right">
                   {descuento > 0 && <p className="text-[10px] text-zinc-600 line-through font-bold">S/ {subtotalCarrito.toFixed(2)}</p>}
                   <p className="text-5xl font-black text-white italic tracking-tighter">S/ {totalFinal.toFixed(2)}</p>
                </div>
              </div>
              
              <button 
                disabled={carrito.length === 0 || procesandoVenta}
                onClick={confirmarVenta}
                className={`w-full py-7 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${carrito.length === 0 ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'}`}
              >
                {procesandoVenta ? 'REGISTRANDO...' : isNotaPedido ? '🚀 GENERAR PEDIDO' : '🚀 FINALIZAR VENTA'}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* NOTIFICACIÓN FLOTANTE */}
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