'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/apiService';

export default function ModuloVentas() {
  // --- ESTADOS DE SESIÓN Y CARGA ---
  const [cargando, setCargando] = useState(true);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [sesionActiva, setSesionActiva] = useState<any>(null);
  const [montoApertura, setMontoApertura] = useState(0);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // --- ESTADOS DE VENTA ---
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setFiltro] = useState('');
  const [carrito, setCarrito] = useState<any[]>([]);
  const [medioPago, setMedioPago] = useState('EFECTIVO');

  // 1. CARGA INICIAL Y SEGURIDAD
  async function inicializarPOS() {
    try {
      const [status, catalog] = await Promise.all([
        apiService.getEstadoCaja(),
        apiService.getProductosParaIngreso()
      ]);
      
      if (status.esta_abierta) setSesionActiva(status.sesion);
      setProductos(catalog);
    } catch (error) {
      setMensaje({ texto: '❌ ERROR DE CONEXIÓN CON EL SERVIDOR', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { inicializarPOS(); }, []);

  // 2. LÓGICA DE BÚSQUEDA FILTRADA
  const productosFiltrados = useMemo(() => {
    if (!busqueda) return [];
    return productos.filter(p => 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0
    ).slice(0, 8);
  }, [busqueda, productos]);

  // 3. GESTIÓN AVANZADA DEL CARRITO[cite: 18]
  const agregarAlCarrito = (prod: any) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === prod.id);
      if (existe) return prev; // Si ya existe, se gestiona desde el panel derecho

      // Al agregar, inicializamos con precio menor por defecto
      return [...prev, { 
        ...prod, 
        cantidad: 1, 
        precioSeleccionado: prod.precio, 
        esPrecioMayor: false 
      }];
    });
    setFiltro('');
  };

  // Función para ajustar cantidades (+/-) y validar stock[cite: 18]
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

  // Función para intercambiar entre Precio Menor y Mayor[cite: 18]
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

  const totalVenta = useMemo(() => {
    return carrito.reduce((acc, item) => acc + (item.precioSeleccionado * item.cantidad), 0);
  }, [carrito]);

  // 4. REGISTRO FINAL DE VENTA EN BASE DE DATOS[cite: 18]
  const confirmarVenta = async () => {
    if (carrito.length === 0) return;
    setProcesandoVenta(true);
    try {
      const ventaData = {
        items: carrito.map(i => ({
          id_producto: i.id,
          cantidad: i.cantidad,
          precio_unitario: i.precioSeleccionado
        })),
        tipo_documento: "NOTA_VENTA",
        id_sesion_caja: sesionActiva.id,
        medio_pago: medioPago
      };

      await apiService.procesarVenta(ventaData);
      setMensaje({ texto: '✅ VENTA REALIZADA CON ÉXITO', tipo: 'success' });
      setCarrito([]);
      setMedioPago('EFECTIVO');
      await inicializarPOS(); // Recargar stock real tras la venta
    } catch (error: any) {
      setMensaje({ texto: `❌ ERROR: ${error.message}`, tipo: 'error' });
    } finally {
      setProcesandoVenta(false);
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
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
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-emerald-500 font-black">SINCRONIZANDO POS...</div>
  );

  // INTERFAZ A: APERTURA (Bloqueo de Terminal)[cite: 18]
  if (!sesionActiva) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] shadow-2xl animate-in fade-in zoom-in duration-500">
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
            <button onClick={manejarApertura} className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 transition-all active:scale-95">🔓 Iniciar Turno de Venta</button>
          </div>
        </div>
      </div>
    );
  }

  // INTERFAZ B: PUNTO DE VENTA (Activo)[cite: 18]
  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Punto de Venta</h1>
          <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 italic">Caja Activa • Trujillo Centro</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 px-6 py-4 rounded-2xl">
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest text-right">Saldo en Caja</p>
          <p className="text-xl text-white font-black">S/ {Number(sesionActiva.monto_inicial).toFixed(2)}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* COLUMNA IZQUIERDA: BUSCADOR Y RESULTADOS[cite: 18] */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl">
            <input 
              autoFocus
              placeholder="ESCRIBA EL NOMBRE DEL PRODUCTO..." 
              value={busqueda}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full p-6 bg-black border border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-white text-lg placeholder:text-zinc-700 uppercase"
            />
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productosFiltrados.map(p => (
              <button 
                key={p.id} 
                onClick={() => agregarAlCarrito(p)}
                className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl text-left hover:border-indigo-500/50 transition-all group active:scale-95"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{p.categoria}</span>
                  <span className="text-[10px] font-black text-zinc-500 bg-black px-2 py-1 rounded-lg">STOCK: {p.stock}</span>
                </div>
                <h3 className="font-black text-white text-lg leading-tight uppercase group-hover:text-indigo-400 transition-colors">{p.nombre}</h3>
                <p className="mt-4 text-2xl font-black text-white italic">S/ {Number(p.precio).toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* COLUMNA DERECHA: CARRITO AVANZADO[cite: 18] */}
        <div className="space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 flex flex-col min-h-[650px] shadow-2xl">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Resumen de Venta
            </h2>

            <div className="flex-1 space-y-6 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
              {carrito.map(item => (
                <div key={item.id} className="space-y-4 p-5 bg-black/40 border border-zinc-800/50 rounded-3xl relative group">
                  <button onClick={() => eliminarDelCarrito(item.id)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors">✕</button>
                  
                  <p className="text-[11px] font-black text-white uppercase leading-tight pr-6">{item.nombre}</p>
                  
                  {/* SELECTOR DE PRECIO (MENOR / MAYOR)[cite: 18] */}
                  <div className="flex gap-2">
                    <button onClick={() => cambiarTipoPrecio(item.id)} className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${!item.esPrecioMayor ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 text-zinc-500'}`}>P. MENOR</button>
                    <button onClick={() => cambiarTipoPrecio(item.id)} className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${item.esPrecioMayor ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-zinc-800 text-zinc-500'}`}>P. MAYOR</button>
                  </div>

                  <div className="flex justify-between items-center bg-black/60 p-3 rounded-2xl">
                    {/* CONTROLES DE CANTIDAD[cite: 18] */}
                    <div className="flex items-center gap-3">
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-zinc-400 hover:bg-zinc-700">-</button>
                      <input type="number" readOnly value={item.cantidad} className="w-8 bg-transparent text-center font-black text-white outline-none" />
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-zinc-400 hover:bg-zinc-700">+</button>
                    </div>
                    <p className="font-mono font-black text-white italic">S/ {(item.precioSeleccionado * item.cantidad).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              
              {carrito.length === 0 && (
                <div className="text-center py-20 opacity-20 italic font-bold text-xs text-zinc-500 uppercase tracking-widest">Carrito Vacío</div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800 space-y-6">
              <div className="grid grid-cols-2 gap-2">
                {['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map(metodo => (
                  <button 
                    key={metodo}
                    onClick={() => setMedioPago(metodo)}
                    className={`py-3 rounded-xl text-[10px] font-black transition-all ${medioPago === metodo ? 'bg-indigo-600 text-white' : 'bg-black text-zinc-500 border border-zinc-800'}`}
                  >
                    {metodo}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total</p>
                <p className="text-5xl font-black text-white italic tracking-tighter">S/ {totalVenta.toFixed(2)}</p>
              </div>
              
              <button 
                disabled={carrito.length === 0 || procesandoVenta}
                onClick={confirmarVenta}
                className={`w-full py-7 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${carrito.length === 0 ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'}`}
              >
                {procesandoVenta ? 'PROCESANDO...' : '🚀 FINALIZAR VENTA'}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* NOTIFICACIÓN FLOTANTE */}
      {mensaje.texto && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 p-6 rounded-2xl text-center font-black text-sm border animate-in slide-in-from-bottom duration-300 shadow-2xl z-[100] ${mensaje.tipo === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'}`}>
          {mensaje.texto.toUpperCase()}
        </div>
      )}
    </div>
  );
}