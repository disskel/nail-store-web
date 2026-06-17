'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';

export default function DevolucionesPage() {
  const [correlativo, setCorrelativo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // DATOS DE LA VENTA ORIGINAL
  const [ventaData, setVentaData] = useState<any>(null);
  const [itemsDisponibles, setItemsDisponibles] = useState<any[]>([]);

  // CATÁLOGO PARA CAMBIOS
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [filtroCat, setFiltroCat] = useState('');
  const [cargandoCat, setCargandoCat] = useState(false);

  // CONFIGURACIÓN DE OPERACIÓN
  const [tipoOperacion, setTipoOperacion] = useState<'TOTAL' | 'PARCIAL' | 'CAMBIO'>('TOTAL');
  const [metodoReembolso, setMetodoReembolso] = useState('EFECTIVO');
  const [motivo, setMotivo] = useState('');
  
  // ESTADOS DE SELECCIÓN (LO QUE DEJA)
  const [cantidadesParciales, setCantidadesParciales] = useState<Record<string, number>>({});
  const [estadosInventario, setEstadosInventario] = useState<Record<string, string>>({});

  // ESTADOS DE SELECCIÓN (LO QUE LLEVA)
  const [itemsNuevos, setItemsNuevos] = useState<any[]>([]);

  // 1. CARGAR CATÁLOGO (Solo se carga una vez al montar o al abrir CAMBIO)
  const cargarCatalogo = async () => {
    if (catalogo.length > 0) return;
    setCargandoCat(true);
    try {
      const data = await apiService.getProductosActivos();
      setCatalogo(data);
    } catch (e) {
      console.error("Error al cargar catálogo", e);
    } finally {
      setCargandoCat(false);
    }
  };

  useEffect(() => {
    if (tipoOperacion === 'CAMBIO') cargarCatalogo();
  }, [tipoOperacion]);

  // 2. BUSCADOR DE DOCUMENTO
  const buscarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correlativo.trim()) return;
    setCargando(true); setError(''); setMensaje({ texto: '', tipo: '' });
    try {
      const data = await apiService.consultarVentaParaDevolucion(correlativo.trim().toUpperCase());
      setVentaData(data.venta);
      setItemsDisponibles(data.items_disponibles);
      
      const inicialesInventario: Record<string, string> = {};
      const inicialesParciales: Record<string, number> = {};
      data.items_disponibles.forEach((item: any) => {
        inicialesInventario[item.id_producto] = 'REINGRESADO_BUENO';
        inicialesParciales[item.id_producto] = 0; 
      });
      setEstadosInventario(inicialesInventario);
      setCantidadesParciales(inicialesParciales);
      setItemsNuevos([]); // Limpiar carrito de cambios
      setTipoOperacion('TOTAL');
    } catch (err: any) {
      setError(err.message);
      setVentaData(null); setItemsDisponibles([]);
    } finally {
      setCargando(false);
    }
  };

  // 3. MATEMÁTICA EN TIEMPO REAL CON PRORRATEO DE DESCUENTOS
  const calcularFinanzas = () => {
    let dejaBruto = 0;
    let lleva = 0;

    // Calcular lo que DEJA (A precio de etiqueta)
    if (tipoOperacion === 'TOTAL') {
      dejaBruto = itemsDisponibles.reduce((sum, item) => sum + (item.cantidad_disponible * item.precio_unitario), 0);
    } else {
      dejaBruto = itemsDisponibles.reduce((sum, item) => sum + ((cantidadesParciales[item.id_producto] || 0) * item.precio_unitario), 0);
    }

    // --- MAGIA MATEMÁTICA: PRORRATEO DEL DESCUENTO GLOBAL ---
    let proporcion = 0;
    let descuentoAplicado = 0;
    let dejaNeto = 0;

    if (ventaData && ventaData.monto_bruto > 0) {
      // ¿Qué porcentaje del total de la factura original representa esta devolución?
      proporcion = dejaBruto / ventaData.monto_bruto;
      // Le quitamos esa misma proporción al descuento global que se le dio
      descuentoAplicado = ventaData.monto_descuento * proporcion;
      // Lo que realmente se le va a devolver en dinero
      dejaNeto = dejaBruto - descuentoAplicado;
    }

    // Calcular lo que LLEVA (Solo en modo CAMBIO)
    if (tipoOperacion === 'CAMBIO') {
      lleva = itemsNuevos.reduce((sum, item) => sum + (item.cantidad * item.precio_menor), 0);
    }

    const diferencia = lleva - dejaNeto; // Positivo = Cliente paga / Negativo = Tienda devuelve
    return { dejaBruto, descuentoAplicado, deja: dejaNeto, lleva, diferencia };
  };

  const { dejaBruto, descuentoAplicado, deja, lleva, diferencia } = calcularFinanzas();

  // 4. CARRITO DE CAMBIOS (NUEVOS PRODUCTOS)
  const agregarAlCambio = (prod: any) => {
    const existe = itemsNuevos.find(i => i.id === prod.id);
    if (existe) {
      if (existe.cantidad >= prod.stock_actual) return; // Límite de stock físico
      setItemsNuevos(itemsNuevos.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setItemsNuevos([...itemsNuevos, { ...prod, cantidad: 1 }]);
    }
  };

  const ajustarCantidadNuevo = (id: string, delta: number) => {
    setItemsNuevos(itemsNuevos.map(i => {
      if (i.id === id) {
        const nuevaCant = i.cantidad + delta;
        if (nuevaCant <= 0) return null;
        if (nuevaCant > i.stock_actual) return i;
        return { ...i, cantidad: nuevaCant };
      }
      return i;
    }).filter(Boolean));
  };

  // 5. PROCESAR TRANSACCIÓN FINANCIERA (CONEXIÓN PYTHON)
  const procesarDevolucion = async () => {
    if (deja <= 0) {
      setError('Debes seleccionar al menos un producto a devolver/cambiar.');
      return;
    }
    if (tipoOperacion === 'CAMBIO' && lleva <= 0) {
      setError('En un CAMBIO debes seleccionar al menos un producto nuevo.');
      return;
    }
    if (!motivo.trim()) {
      setError('El motivo es obligatorio para la auditoría.');
      return;
    }

    setCargando(true); setError('');

    try {
      const items_devueltos = itemsDisponibles
        .map(item => ({
          id_producto: item.id_producto,
          cantidad_devuelta: tipoOperacion === 'TOTAL' ? item.cantidad_disponible : (cantidadesParciales[item.id_producto] || 0),
          precio_unitario: item.precio_unitario,
          estado_inventario: estadosInventario[item.id_producto]
        }))
        .filter(item => item.cantidad_devuelta > 0);

      const items_nuevos_payload = tipoOperacion === 'CAMBIO' ? itemsNuevos.map(i => ({
        id_producto: i.id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_menor // Se cobra al precio menor estándar
      })) : [];

      const payload = {
        id_venta_original: ventaData.id,
        correlativo_original: ventaData.correlativo_nota,
        tipo_operacion: tipoOperacion,
        monto_devuelto: tipoOperacion === 'CAMBIO' ? Math.abs(diferencia) : deja,
        es_saldo_a_favor_empresa: tipoOperacion === 'CAMBIO' ? diferencia > 0 : false,
        metodo_reembolso: metodoReembolso,
        motivo: motivo,
        items_devueltos: items_devueltos,
        items_nuevos: items_nuevos_payload
      };

      await apiService.procesarDevolucion(payload);
      
      setMensaje({ texto: 'OPERACIÓN REGISTRADA: CAJA Y KARDEX ACTUALIZADOS', tipo: 'success' });
      setVentaData(null); setItemsDisponibles([]); setCorrelativo(''); setMotivo(''); setItemsNuevos([]);
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // FILTRO DEL CATÁLOGO EN VIVO
  const productosFiltrados = catalogo.filter(p => p.nombre.toLowerCase().includes(filtroCat.toLowerCase()) || p.sku.toLowerCase().includes(filtroCat.toLowerCase())).slice(0, 10); // Limitar a 10 para no saturar UI

  return (
    <div className="p-2 lg:p-4 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* CABECERA COMPACTA */}
      <div className="mb-2 flex items-center justify-between bg-zinc-900 text-white p-3 rounded-xl shadow-md">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tighter italic">Auditoría y Devoluciones</h1>
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Kardex • Notas de Crédito • Cambios</p>
        </div>
        
        {/* BUSCADOR INTEGRADO EN CABECERA */}
        <form onSubmit={buscarDocumento} className="flex gap-1 items-center">
          <input 
            type="text" placeholder="P001-XXXX" value={correlativo} onChange={(e) => setCorrelativo(e.target.value.toUpperCase())}
            className="w-40 bg-black border border-zinc-700 p-2 rounded-lg text-xs font-black outline-none focus:border-indigo-500 uppercase text-white"
          />
          <button disabled={cargando} type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-black transition-all">
            {cargando ? '...' : 'BUSCAR'}
          </button>
        </form>
      </div>

      {error && <div className="bg-red-600 text-white text-[10px] font-black uppercase p-2 rounded-lg mb-2 text-center animate-pulse">{error}</div>}

      {ventaData && itemsDisponibles.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-2 h-[calc(100vh-140px)]">
          
          {/* PANEL IZQUIERDO: LO QUE EL CLIENTE DEVUELVE */}
          <div className={`flex flex-col bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 ${tipoOperacion === 'CAMBIO' ? 'w-full lg:w-1/2' : 'w-full'}`}>
            
            {/* TABS COMPACTOS */}
            <div className="flex bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <button onClick={() => setTipoOperacion('TOTAL')} className={`flex-1 py-2 text-[10px] font-black uppercase ${tipoOperacion === 'TOTAL' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}>Devolución Total</button>
              <button onClick={() => setTipoOperacion('PARCIAL')} className={`flex-1 py-2 text-[10px] font-black uppercase border-l border-zinc-200 dark:border-zinc-800 ${tipoOperacion === 'PARCIAL' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}>Devolución Parcial</button>
              <button onClick={() => setTipoOperacion('CAMBIO')} className={`flex-1 py-2 text-[10px] font-black uppercase border-l border-zinc-200 dark:border-zinc-800 ${tipoOperacion === 'CAMBIO' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}>Cambio por otro</button>
            </div>

            {/* INFO DEL DOCUMENTO */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 text-[10px] flex justify-between border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-zinc-600 dark:text-zinc-400">CLIENTE: <span className="font-black text-zinc-900 dark:text-white">{ventaData.clientes?.nombre_razon_social || 'PÚBLICO GENERAL'}</span></span>
              <span className="font-bold text-zinc-600 dark:text-zinc-400">FECHA: <span className="font-black text-zinc-900 dark:text-white">{new Date(ventaData.fecha).toLocaleDateString()}</span></span>
            </div>

            {/* TABLA ULTRA-DENSA DE PRODUCTOS A DEVOLVER */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-black">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-100 dark:bg-zinc-900 sticky top-0 z-10 text-[9px] uppercase text-zinc-500">
                  <tr>
                    <th className="p-2 font-black w-1/2">Producto a Retornar</th>
                    <th className="p-2 font-black text-center">Estado</th>
                    <th className="p-2 font-black text-right w-24">Cant / Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[10px]">
                  {itemsDisponibles.map((item) => (
                    <tr key={item.id_producto} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="p-2">
                        <p className="font-black text-zinc-900 dark:text-zinc-100 leading-tight">{item.nombre}</p>
                        <p className="text-[8px] text-zinc-400 font-bold">SKU: {item.sku} | VENDIDO A: S/ {item.precio_unitario.toFixed(2)}</p>
                      </td>
                      <td className="p-1">
                        <select 
                          value={estadosInventario[item.id_producto]}
                          onChange={(e) => setEstadosInventario({...estadosInventario, [item.id_producto]: e.target.value})}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[9px] font-black p-1 rounded outline-none text-center"
                        >
                          <option value="REINGRESADO_BUENO">✅ BUENO</option>
                          <option value="MERMA">❌ MERMA</option>
                        </select>
                      </td>
                      <td className="p-2 text-right">
                        {tipoOperacion === 'TOTAL' ? (
                          <div>
                            <span className="font-black bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">{item.cantidad_disponible}</span>
                            <p className="font-black text-zinc-900 dark:text-white mt-1">S/ {(item.cantidad_disponible * item.precio_unitario).toFixed(2)}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded">
                              <button onClick={() => setCantidadesParciales({...cantidadesParciales, [item.id_producto]: Math.max(0, (cantidadesParciales[item.id_producto] || 0) - 1)})} className="px-2 py-1 text-zinc-500 font-black hover:text-black dark:hover:text-white">-</button>
                              <span className="font-black w-4 text-center">{cantidadesParciales[item.id_producto] || 0}</span>
                              <button onClick={() => setCantidadesParciales({...cantidadesParciales, [item.id_producto]: Math.min(item.cantidad_disponible, (cantidadesParciales[item.id_producto] || 0) + 1)})} className="px-2 py-1 text-zinc-500 font-black hover:text-black dark:hover:text-white">+</button>
                            </div>
                            <span className="font-black text-zinc-900 dark:text-white">S/ {((cantidadesParciales[item.id_producto] || 0) * item.precio_unitario).toFixed(2)}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALIZADOR IZQUIERDO CON DESGLOSE */}
            <div className="bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-1">
              {descuentoAplicado > 0 && (
                <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500">
                  <span>SUBTOTAL PRODUCTOS</span>
                  <span>S/ {dejaBruto.toFixed(2)}</span>
                </div>
              )}
              {descuentoAplicado > 0 && (
                <div className="flex justify-between items-center text-[9px] font-black text-red-500">
                  <span>(-) DESCUENTO PRORRATEADO</span>
                  <span>- S/ {descuentoAplicado.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-1 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                <span className="text-[10px] font-black uppercase text-zinc-500">Saldo Neto a favor del Cliente</span>
                <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">S/ {deja.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* PANEL DERECHO: LO QUE EL CLIENTE LLEVA (SOLO VISIBLE EN MODO CAMBIO) */}
          {/* ======================================================================= */}
          {tipoOperacion === 'CAMBIO' && (
            <div className="flex flex-col w-full lg:w-1/2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden animate-in slide-in-from-right-4">
              
              <div className="bg-emerald-600 text-white p-2 text-center text-[10px] font-black uppercase tracking-widest">
                Nuevos Productos (Lo que se lleva)
              </div>

              {/* BUSCADOR DE CATÁLOGO */}
              <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <input 
                  type="text" placeholder="🔍 Buscar por nombre o SKU..." value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 p-2 rounded text-[10px] font-black outline-none focus:border-emerald-500"
                />
              </div>

              {/* LISTA CORTA DE RESULTADOS (CATÁLOGO) */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 max-h-[150px] overflow-y-auto custom-scrollbar bg-white dark:bg-black">
                {cargandoCat ? <div className="p-2 text-center text-[10px] animate-pulse">Cargando catálogo...</div> : productosFiltrados.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-2 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer" onClick={() => agregarAlCambio(p)}>
                    <div>
                      <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100">{p.nombre}</p>
                      <p className="text-[8px] text-zinc-500 font-bold">Stock: {p.stock_actual} | S/ {Number(p.precio_menor).toFixed(2)}</p>
                    </div>
                    <button className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded text-[9px] font-black hover:bg-emerald-500 hover:text-white transition-colors">AGREGAR</button>
                  </div>
                ))}
              </div>

              {/* CARRITO DE CAMBIOS */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50 dark:bg-black/40 p-2">
                {itemsNuevos.length === 0 ? (
                  <div className="text-center text-[10px] text-zinc-400 font-black uppercase mt-10 opacity-50">Carrito de cambios vacío</div>
                ) : (
                  <div className="space-y-1">
                    {itemsNuevos.map(i => (
                      <div key={i.id} className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 rounded">
                        <div className="flex-1 truncate">
                          <p className="text-[9px] font-black text-zinc-900 dark:text-white truncate">{i.nombre}</p>
                          <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black">S/ {Number(i.precio_menor).toFixed(2)} c/u</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded">
                            <button onClick={() => ajustarCantidadNuevo(i.id, -1)} className="px-2 py-1 text-zinc-500 font-black">-</button>
                            <span className="font-black text-[10px] w-4 text-center">{i.cantidad}</span>
                            <button onClick={() => ajustarCantidadNuevo(i.id, 1)} className="px-2 py-1 text-zinc-500 font-black">+</button>
                          </div>
                          <span className="font-black text-[10px] text-zinc-900 dark:text-white w-12 text-right">S/ {(i.cantidad * i.precio_menor).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TOTALIZADOR DERECHO */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border-t border-emerald-200 dark:border-emerald-800/30 p-3 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-500">Costo Nuevos Productos</span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 tracking-tighter">S/ {lleva.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* BARRA INFERIOR DE ACCIÓN GLOBAL (PEGADA AL FONDO) */}
      {/* ======================================================================= */}
      {ventaData && itemsDisponibles.length > 0 && (
        <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex flex-col lg:flex-row gap-2 items-center text-white">
          
          <div className="flex-1 flex gap-2 w-full">
            <input 
              type="text" placeholder="MOTIVO AUDITORÍA (OBLIGATORIO)" value={motivo} onChange={(e) => setMotivo(e.target.value.toUpperCase())}
              className="flex-1 bg-black border border-zinc-700 p-2 rounded-lg text-[10px] font-black outline-none focus:border-indigo-500 uppercase"
            />
            <select 
              value={metodoReembolso} onChange={(e) => setMetodoReembolso(e.target.value)}
              className="w-32 bg-black border border-zinc-700 p-2 rounded-lg text-[10px] font-black outline-none uppercase"
            >
              <option value="EFECTIVO">💵 EFECTIVO</option>
              <option value="YAPE">📱 YAPE</option>
              <option value="PLIN">📱 PLIN</option>
              <option value="TRANSFERENCIA">🏦 TRANSF.</option>
            </select>
          </div>

          <div className="flex gap-2 items-center w-full lg:w-auto">
            {/* DISPLAY MATEMÁTICO */}
            <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 w-full lg:w-auto ${diferencia > 0 ? 'bg-emerald-900/30 border-emerald-700' : diferencia < 0 ? 'bg-red-900/30 border-red-700' : 'bg-zinc-800 border-zinc-700'}`}>
              <div className="text-right">
                <p className={`text-[8px] font-black uppercase tracking-widest ${diferencia > 0 ? 'text-emerald-400' : diferencia < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                  {tipoOperacion === 'CAMBIO' ? (diferencia > 0 ? 'COBRAR AL CLIENTE' : diferencia < 0 ? 'DEVOLVER AL CLIENTE' : 'CAMBIO EXACTO') : 'MONTO A REEMBOLSAR'}
                </p>
                <p className="text-xl font-black tracking-tighter">S/ {Math.abs(tipoOperacion === 'CAMBIO' ? diferencia : deja).toFixed(2)}</p>
              </div>
            </div>

            {/* BOTÓN MAESTRO */}
            <button 
              onClick={procesarDevolucion} disabled={cargando || deja === 0 || (tipoOperacion === 'CAMBIO' && lleva === 0)}
              className={`px-6 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all w-full lg:w-auto flex-shrink-0 ${cargando || deja === 0 || (tipoOperacion === 'CAMBIO' && lleva === 0) ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : diferencia > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
            >
              {cargando ? 'PROCESANDO...' : 'EJECUTAR OPERACIÓN'}
            </button>
          </div>

        </div>
      )}

      {/* TOAST FLOTANTE */}
      {mensaje.texto && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-center font-black text-[10px] uppercase border shadow-2xl z-[200] animate-in slide-in-from-bottom duration-300 bg-emerald-500 border-emerald-400 text-white`}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}