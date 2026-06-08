'use client';

import { useState } from 'react';
import { apiService } from '@/services/apiService';

/**
 * MÓDULO DE DEVOLUCIONES Y CAMBIOS PRO (v1.0.0)
 * Propósito: Interfaz de alta densidad para gestionar el reingreso de mercadería,
 * auditoría de mermas y cuadre de caja (Notas de Crédito).
 */
export default function DevolucionesPage() {
  const [correlativo, setCorrelativo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Datos traídos del backend
  const [ventaData, setVentaData] = useState<any>(null);
  const [itemsDisponibles, setItemsDisponibles] = useState<any[]>([]);

  // Configuración de la operación
  const [tipoOperacion, setTipoOperacion] = useState<'TOTAL' | 'PARCIAL'>('TOTAL');
  const [metodoReembolso, setMetodoReembolso] = useState('EFECTIVO');
  const [motivo, setMotivo] = useState('');
  
  // Estado para Devolución Parcial (Cantidades seleccionadas por el usuario)
  const [cantidadesParciales, setCantidadesParciales] = useState<Record<string, number>>({});
  const [estadosInventario, setEstadosInventario] = useState<Record<string, string>>({});

  // 1. BUSCADOR DE DOCUMENTO
  const buscarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correlativo.trim()) return;
    
    setCargando(true);
    setError('');
    setMensaje({ texto: '', tipo: '' });
    
    try {
      // El correlativo debe estar en formato P001-XXXX
      const data = await apiService.consultarVentaParaDevolucion(correlativo.trim().toUpperCase());
      setVentaData(data.venta);
      setItemsDisponibles(data.items_disponibles);
      
      // Pre-configurar estados de inventario ('REINGRESADO_BUENO' por defecto)
      const inicialesInventario: Record<string, string> = {};
      const inicialesParciales: Record<string, number> = {};
      data.items_disponibles.forEach((item: any) => {
        inicialesInventario[item.id_producto] = 'REINGRESADO_BUENO';
        inicialesParciales[item.id_producto] = 0; // Inician en 0 para selección manual
      });
      setEstadosInventario(inicialesInventario);
      setCantidadesParciales(inicialesParciales);
      
    } catch (err: any) {
      setError(err.message);
      setVentaData(null);
      setItemsDisponibles([]);
    } finally {
      setCargando(false);
    }
  };

  // 2. CÁLCULO EN TIEMPO REAL DEL MONTO A DEVOLVER
  const calcularMontoReembolso = () => {
    if (!itemsDisponibles || itemsDisponibles.length === 0) return 0;
    
    if (tipoOperacion === 'TOTAL') {
      return itemsDisponibles.reduce((sum, item) => sum + (item.cantidad_disponible * item.precio_unitario), 0);
    } else {
      return itemsDisponibles.reduce((sum, item) => sum + ((cantidadesParciales[item.id_producto] || 0) * item.precio_unitario), 0);
    }
  };

  const montoTotalDeEstaOperacion = calcularMontoReembolso();

  // 3. PROCESAR TRANSACCIÓN FINANCIERA
  const procesarDevolucion = async () => {
    if (montoTotalDeEstaOperacion <= 0) {
      setError('Debes seleccionar al menos un producto para devolver.');
      return;
    }
    if (!motivo.trim()) {
      setError('El motivo es obligatorio para la auditoría.');
      return;
    }

    setCargando(true);
    setError('');

    try {
      // Armamos los items según el tipo de operación
      const items_devueltos = itemsDisponibles
        .map(item => ({
          id_producto: item.id_producto,
          cantidad_devuelta: tipoOperacion === 'TOTAL' ? item.cantidad_disponible : (cantidadesParciales[item.id_producto] || 0),
          precio_unitario: item.precio_unitario,
          estado_inventario: estadosInventario[item.id_producto]
        }))
        .filter(item => item.cantidad_devuelta > 0);

      const payload = {
        id_venta_original: ventaData.id,
        correlativo_original: ventaData.correlativo_nota,
        tipo_operacion: tipoOperacion,
        monto_devuelto: montoTotalDeEstaOperacion,
        es_saldo_a_favor_empresa: false,
        metodo_reembolso: metodoReembolso,
        motivo: motivo,
        items_devueltos: items_devueltos,
        items_nuevos: [] // Aquí se conectarían los items de "CAMBIO" en una fase posterior
      };

      await apiService.procesarDevolucion(payload);
      
      setMensaje({ texto: 'OPERACIÓN REGISTRADA: CAJA Y STOCK ACTUALIZADOS', tipo: 'success' });
      setVentaData(null);
      setItemsDisponibles([]);
      setCorrelativo('');
      setMotivo('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto animate-in fade-in duration-700">
      
      {/* CABECERA */}
      <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Gestión de Devoluciones</h1>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Auditoría, Kardex y Notas de Crédito</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: BÚSQUEDA Y CONFIGURACIÓN */}
        <div className="lg:col-span-1 space-y-4">
          <form onSubmit={buscarDocumento} className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 p-4 rounded-[1.5rem]">
            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-2 block">Cód. Documento</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="P001-000001" 
                value={correlativo}
                onChange={(e) => setCorrelativo(e.target.value.toUpperCase())}
                className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl text-xs font-black outline-none focus:border-indigo-500 uppercase"
              />
              <button disabled={cargando} type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl text-xs font-black transition-all">
                {cargando ? '...' : 'BUSCAR'}
              </button>
            </div>
          </form>

          {ventaData && (
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 p-4 rounded-[1.5rem]">
              <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 tracking-widest mb-1">Documento Encontrado</p>
              <p className="text-sm font-black text-zinc-900 dark:text-white mb-2">{ventaData.clientes?.nombre_razon_social || 'PÚBLICO GENERAL'}</p>
              <div className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 space-y-1">
                <div className="flex justify-between"><span>FECHA:</span> <span>{new Date(ventaData.fecha_emision).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>TOTAL ORIGINAL:</span> <span>S/ {ventaData.monto_neto.toFixed(2)}</span></div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 p-4 rounded-[1.5rem] text-center">
              <p className="text-[10px] font-black uppercase text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: PRODUCTOS Y LIQUIDACIÓN */}
        <div className="lg:col-span-2 space-y-4">
          {itemsDisponibles.length > 0 && (
            <div className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[1.5rem]">
              
              {/* TABS DE OPERACIÓN */}
              <div className="flex gap-2 p-1 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-xl mb-6">
                <button onClick={() => setTipoOperacion('TOTAL')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tipoOperacion === 'TOTAL' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Devolución Total</button>
                <button onClick={() => setTipoOperacion('PARCIAL')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tipoOperacion === 'PARCIAL' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Parcial / Selector</button>
              </div>

              {/* LISTA DE PRODUCTOS DISPONIBLES */}
              <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {itemsDisponibles.map((item) => (
                  <div key={item.id_producto} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex-1 truncate">
                      <p className="text-xs font-black text-zinc-900 dark:text-white truncate" title={item.nombre}>{item.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">SKU: {item.sku}</span>
                        <span className="text-[9px] font-bold text-zinc-500">Max: {item.cantidad_disponible} unid.</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* SELECTOR DE ESTADO FÍSICO */}
                      <select 
                        value={estadosInventario[item.id_producto]}
                        onChange={(e) => setEstadosInventario({...estadosInventario, [item.id_producto]: e.target.value})}
                        className="bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 text-[9px] font-black uppercase p-2 rounded-lg outline-none"
                      >
                        <option value="REINGRESADO_BUENO">✅ Buen Estado</option>
                        <option value="MERMA">❌ Merma/Roto</option>
                      </select>

                      {/* CONTROL DE CANTIDADES (SOLO SI ES PARCIAL) */}
                      {tipoOperacion === 'PARCIAL' ? (
                        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                          <button 
                            type="button"
                            onClick={() => setCantidadesParciales({...cantidadesParciales, [item.id_producto]: Math.max(0, (cantidadesParciales[item.id_producto] || 0) - 1)})}
                            className="w-6 h-6 flex justify-center items-center bg-white dark:bg-zinc-700 rounded text-xs font-black shadow-sm"
                          >-</button>
                          <span className="text-xs font-black w-4 text-center">{cantidadesParciales[item.id_producto] || 0}</span>
                          <button 
                            type="button"
                            onClick={() => setCantidadesParciales({...cantidadesParciales, [item.id_producto]: Math.min(item.cantidad_disponible, (cantidadesParciales[item.id_producto] || 0) + 1)})}
                            className="w-6 h-6 flex justify-center items-center bg-white dark:bg-zinc-700 rounded text-xs font-black shadow-sm"
                          >+</button>
                        </div>
                      ) : (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/30 px-3 py-1 rounded-lg text-xs font-black">
                          {item.cantidad_disponible}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ÁREA DE LIQUIDACIÓN Y BOTÓN FINAL */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1 block">Motivo (Obligatorio)</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Producto defectuoso..." 
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value.toUpperCase())}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1 block">Dinero Sale De:</label>
                  <select 
                    value={metodoReembolso}
                    onChange={(e) => setMetodoReembolso(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl text-xs font-black outline-none"
                  >
                    <option value="EFECTIVO">💵 EFECTIVO (CAJÓN)</option>
                    <option value="YAPE">📱 YAPE</option>
                    <option value="PLIN">📱 PLIN</option>
                    <option value="TRANSFERENCIA">📱 TRANSFERENCIA</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-zinc-900 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Monto a Devolver</p>
                  <p className="text-3xl font-black text-white italic tracking-tighter">S/ {montoTotalDeEstaOperacion.toFixed(2)}</p>
                </div>
                <button 
                  onClick={procesarDevolucion}
                  disabled={cargando || montoTotalDeEstaOperacion === 0}
                  className={`px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all ${cargando || montoTotalDeEstaOperacion === 0 ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'}`}
                >
                  {cargando ? 'PROCESANDO...' : 'EJECUTAR REEMBOLSO'}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* TOAST DE ÉXITO */}
      {mensaje.texto && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 p-6 rounded-2xl text-center font-black text-xs border animate-in slide-in-from-bottom duration-300 shadow-2xl z-[200] bg-emerald-500 border-emerald-400 text-white`}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}