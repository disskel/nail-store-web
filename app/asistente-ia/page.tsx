'use client';

import { useState, useRef, useEffect } from 'react';
import { apiService } from '@/services/apiService';
import { useRouter } from 'next/navigation';
import { Bot, Send, ShieldCheck, Database, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface Mensaje {
  id: string;
  rol: 'user' | 'assistant';
  contenido: string;
  sql?: string;
  filas?: number;
  modelo?: string;
  hora: string;
}

const SUGERENCIAS_RAPIDAS = [
  "📊 Dame el resumen financiero de este mes vs. el mes pasado (ventas, costos, gastos y utilidad neta).",
  "📈 Proyecta cuánto cerraremos en ventas y utilidad neta al final de este mes según el ritmo diario actual.",
  "🏆 ¿Cuáles son los 10 productos que más utilidad neta han generado este mes y cuál es su stock actual?",
  "💸 Detalla todos los gastos operativos y pagos de préstamos realizados en los últimos 30 días.",
  "🎓 ¿Qué academia nos está generando mayor volumen de ventas reales y cuál tiene mejor conversión?"
];

export default function AsistenteIAPage() {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: 'bienvenida',
      rol: 'assistant',
      contenido:
        "Hola. Soy el **Consultor Financiero IA de Jean Nails Store**.\n\nEstoy conectado en modo **Solo Lectura** directamente a tu base de datos en tiempo real. Puedes pedirme balances económicos, comparativas entre meses, auditoría de gastos/cajas, rentabilidad por producto o proyecciones de cierre de mes.",
      hora: ''
    }
  ]);

  useEffect(() => {
    const horaLocal = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    setMensajes((prev) =>
      prev.map((m) => (m.id === 'bienvenida' && !m.hora ? { ...m, hora: horaLocal } : m))
    );
  }, []);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [sqlAbierto, setSqlAbierto] = useState<Record<string, boolean>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const enviarConsulta = async (textoConsulta?: string) => {
    const pregunta = (textoConsulta ?? input).trim();
    if (!pregunta || cargando) return;

    const horaActual = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const msgUsuario: Mensaje = {
      id: `u-${Date.now()}`,
      rol: 'user',
      contenido: pregunta,
      hora: horaActual
    };

    const historialPrevio = mensajes
      .filter((m) => m.id !== 'bienvenida')
      .map((m) => ({ rol: m.rol, contenido: m.contenido }));

    setMensajes((prev) => [...prev, msgUsuario]);
    if (!textoConsulta) setInput('');
    setCargando(true);

    try {
      const res = await apiService.consultarAsistenteIA(pregunta, historialPrevio);
      const msgIA: Mensaje = {
        id: `ai-${Date.now()}`,
        rol: 'assistant',
        contenido: res.respuesta,
        sql: res.sql_ejecutado,
        filas: res.filas_analizadas,
        modelo: res.modelo,
        hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
      };
      setMensajes((prev) => [...prev, msgIA]);
    } catch (error: any) {
      if (error.message?.includes('401')) {
        router.push('/login');
        return;
      }
      setMensajes((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          rol: 'assistant',
          contenido: `⚠️ **No se pudo completar la consulta:** ${error.message || 'Error de conexión con el motor IA.'}`,
          hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setCargando(false);
    }
  };

  const limpiarChat = () => {
    setMensajes([
      {
        id: 'bienvenida',
        rol: 'assistant',
        contenido: "Conversación reiniciada. ¿Qué reporte financiero o proyección deseas analizar ahora?",
        hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setSqlAbierto({});
  };

  // Formateador ligero de negritas (**texto**) para mantener el diseño limpio sin dependencias extra
  const renderTextoFormateado = (texto: string) => {
    return texto.split('\n').map((linea, i) => {
      const partes = linea.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className={`${linea.trim() === '' ? 'h-2' : 'leading-relaxed'}`}>
          {partes.map((parte, idx) =>
            parte.startsWith('**') && parte.endsWith('**') ? (
              <strong key={idx} className="font-black text-indigo-600 dark:text-indigo-400">
                {parte.slice(2, -2)}
              </strong>
            ) : (
              <span key={idx}>{parte}</span>
            )
          )}
        </p>
      );
    });
  };

  return (
    <div className="p-4 lg:p-6 w-full max-w-[1400px] mx-auto h-[calc(100vh-5rem)] lg:h-screen flex flex-col animate-in fade-in duration-500">
      
      {/* CABECERA CORPORATIVA */}
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 text-white p-4 rounded-xl shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tighter italic flex items-center gap-2">
              Consultor Financiero IA
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[9px] font-black not-italic tracking-widest">
                <ShieldCheck size={11} /> SOLO LECTURA
              </span>
            </h1>
            <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-widest mt-0.5">
              Informes Económicos • Auditoría en Tiempo Real • Proyecciones
            </p>
          </div>
        </div>

        <button
          onClick={limpiarChat}
          className="self-start sm:self-auto flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all"
        >
          <Trash2 size={13} /> Nueva Consulta
        </button>
      </header>

      {/* ATAJOS INTELIGENTES */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 custom-scrollbar shrink-0">
        {SUGERENCIAS_RAPIDAS.map((sug, idx) => (
          <button
            key={idx}
            onClick={() => enviarConsulta(sug)}
            disabled={cargando}
            className="whitespace-nowrap bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-xl text-[11px] font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles size={12} className="text-indigo-500 shrink-0" />
            <span>{sug}</span>
          </button>
        ))}
      </div>

      {/* ÁREA DE MENSAJES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 lg:p-6 space-y-4 shadow-inner">
        {mensajes.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.rol === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] lg:max-w-[78%] rounded-2xl p-4 shadow-sm text-xs sm:text-sm space-y-1.5 ${
                m.rol === 'user'
                  ? 'bg-indigo-600 text-white font-medium rounded-br-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-sm'
              }`}
            >
              {m.rol === 'user' ? (
                <p className="whitespace-pre-wrap">{m.contenido}</p>
              ) : (
                <div className="space-y-1 text-xs sm:text-[13px]">{renderTextoFormateado(m.contenido)}</div>
              )}

              {/* PIE DE AUDITORÍA EN RESPUESTAS DE IA */}
              {m.rol === 'assistant' && m.sql && (
                <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => setSqlAbierto((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-indigo-500 transition-colors"
                  >
                    <Database size={11} />
                    <span>Respaldo BD ({m.filas ?? 0} registros • {m.modelo})</span>
                    {sqlAbierto[m.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {sqlAbierto[m.id] && (
                    <pre className="mt-2 p-3 rounded-lg bg-zinc-950 text-emerald-400 text-[10px] font-mono overflow-x-auto border border-zinc-800">
                      {m.sql}
                    </pre>
                  )}
                </div>
              )}
            </div>
            <span className="text-[9px] font-bold text-zinc-400 mt-1 px-1">{m.hora}</span>
          </div>
        ))}

        {cargando && (
          <div className="flex items-start">
            <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-bl-sm p-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                Auditando base de datos y calculando...
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* BARRA DE ENTRADA */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviarConsulta();
        }}
        className="mt-3 flex gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={cargando}
          placeholder="Ej: ¿Cuánto vendimos por Yape esta semana y qué proyección tenemos para fin de mes?"
          className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-xs sm:text-sm font-medium text-zinc-900 dark:text-white outline-none shadow-sm"
        />
        <button
          type="submit"
          disabled={cargando || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-400 dark:disabled:bg-zinc-800 text-white px-5 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <Send size={16} />
          <span className="hidden sm:inline">Consultar</span>
        </button>
      </form>
    </div>
  );
}