'use client';
import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';
import { Bell, CreditCard } from 'lucide-react'; // Instalar lucide-react si no lo tienes

export default function NotificationBell() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [modalPago, setModalPago] = useState<any>(null);
  const [monto, setMonto] = useState("");
  // NUEVO: Estado para el método de pago seleccionado (por defecto EFECTIVO)
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");

  const revisar = async () => {
    // =========================================================================
    // ESCUDO DE SEGURIDAD (ANTI-401): 
    // Si no hay una sesión activa en localStorage, detenemos la ejecución.
    // Esto evita que el sistema intente consultar la API antes del Login.
    // =========================================================================
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('supabase-session') : null;
    if (!sessionStr) return; 

    try {
      const data = await apiService.getObligaciones();
      const hoy = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
      const dia = hoy.getDate();
      
      // Filtramos obligaciones que vencen pronto y no han sido pagadas este mes
      const filtrados = data.filter((ob: any) => {
        if (ob.ultima_notificacion) {
          const u = new Date(ob.ultima_notificacion);
          if (u.getMonth() === hoy.getMonth() && u.getFullYear() === hoy.getFullYear()) return false;
        }
        return (ob.dia_vencimiento - dia) <= ob.recordatorio_dias;
      });
      setPendientes(filtrados);
    } catch (error) {
      // Si hay un error, lo registramos pero no bloqueamos la interfaz
      console.error("Error al revisar notificaciones:", error);
    }
  };

  useEffect(() => {
    // Ejecutamos la revisión inicial
    revisar();
    
    // Check cada 60 min para mantener las alertas frescas
    const timer = setInterval(revisar, 3600000); 
    return () => clearInterval(timer);
  }, []);

  const ejecutarPago = async () => {
    // Obtenemos la fecha actual de Trujillo para marcar el cumplimiento
    const hoyStr = new Date().toISOString().split('T')[0];
    
    try {
      // 1. Registramos en Utilidades como Gasto Operativo
      // Esta función ya existe en tu apiService y afecta el balance financiero
      await apiService.registrarGasto({
        descripcion: `PAGO: ${modalPago.descripcion}`,
        monto: parseFloat(monto),
        categoria: modalPago.categoria,
        metodo_pago: metodoPago,// <--- ENVIAMOS EL MÉTODO SELECCIONADO
        id_sesion_caja: null // El backend buscará automáticamente la caja abierta de Trujillo
      });

      // 2. CORRECCIÓN: Usamos el nombre exacto definido en apiService.ts
      // Cambiamos 'marcarObligacionPagada' por 'marcarObligacionComoPagada'
      await apiService.marcarObligacionComoPagada(modalPago.id, hoyStr);

      // 3. Limpieza de estados y refresco de la campana
      setModalPago(null);
      setMonto(""); // Limpiamos el monto para el siguiente pago
      setMetodoPago("EFECTIVO"); // Reset al valor por defecto
      revisar();    // Volvemos a consultar para apagar la alerta si no quedan pendientes
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      alert("Hubo un error al registrar el pago. Revisa la consola.");
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`p-2 rounded-full transition-all ${pendientes.length > 0 ? 'bg-red-500/20 text-red-500' : 'opacity-30 text-zinc-500'}`}
      >
        <Bell size={20} />
        {pendientes.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-[10px] text-white px-1 rounded-full">
            {pendientes.length}
          </span>
        )}
      </button>

      {/* DROP-DOWN SUTIL */}
      {isOpen && pendientes.length > 0 && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-4 z-[100]">
          {pendientes.map(p => (
            <div key={p.id} className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold text-white">{p.descripcion}</p>
              <button 
                onClick={() => setModalPago(p)} 
                className="text-[10px] bg-indigo-600 px-2 py-1 rounded-lg text-white"
              >
                Pagar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE PAGO */}
      {modalPago && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-sm">
            <h3 className="text-white font-black italic mb-4 uppercase">Confirmar Gasto</h3>
            <p className="text-zinc-400 text-xs mb-4">
              Ingresa el monto final para <b>{modalPago.descripcion}</b>. Esto se restará de tus utilidades hoy.
            </p>
            <input 
              type="number" 
              value={monto} 
              onChange={e => setMonto(e.target.value)} 
              placeholder="S/ 0.00" 
              className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white mb-6 outline-none focus:ring-2 focus:ring-indigo-600" 
            />
            
            {/* SELECTOR DE MÉTODO DE PAGO (Igual al módulo de Gastos) */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map((metodo) => (
                <button
                  key={metodo}
                  onClick={() => setMetodoPago(metodo)}
                  className={`py-2 rounded-xl text-[10px] font-bold transition-all border ${
                    metodoPago === metodo 
                      ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' 
                      : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  {metodo}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
                <button 
                  onClick={() => {setModalPago(null); setMetodoPago("EFECTIVO");}} 
                  className="flex-1 text-zinc-500 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  onClick={ejecutarPago} 
                  className="flex-1 bg-indigo-600 text-white p-3 rounded-xl font-bold text-xs"
                >
                  Registrar Pago
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}