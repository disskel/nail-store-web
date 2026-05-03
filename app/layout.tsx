// 1. IMPORTACIONES DE CONFIGURACIÓN Y ESTILOS
import type { Metadata } from "next"; // Para el SEO y título de la pestaña
import { Geist, Geist_Mono } from "next/font/google"; // Fuentes modernas de Next.js
import "./globals.css"; // El archivo de estilos base que acabamos de limpiar

// 2. CONFIGURACIÓN DE FUENTES (Variables CSS para el sistema)
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// 3. METADATOS GLOBALES (Aparecen en el navegador)
export const metadata: Metadata = {
  title: "Nail-Store | Gestión",
  description: "Sistema inteligente para salones de belleza",
};

/**
 * COMPONENTE MAESTRO: RootLayout
 * Este archivo no cambia al navegar; se mantiene fijo para mostrar 
 * siempre el menú lateral mientras cambias de módulo.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full dark`}>
      <body className="flex flex-col lg:flex-row h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
        
        {/* =========================================================================
            BARRA LATERAL (ASIDE) - Visible solo en PC (Desktop)
           ========================================================================= */}
        <aside className="hidden lg:flex w-72 bg-black border-r border-zinc-800 flex-col p-6 shadow-2xl">
          
          {/* Identidad de la Marca */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              N
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Nail-Store</h2>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Admin Pro</p>
            </div>
          </div>

          {/* MENÚ DE NAVEGACIÓN PRINCIPAL */}
          <nav className="flex-1 space-y-1">
            <p className="text-[10px] font-bold text-zinc-500 uppercase px-3 mb-3">Principal</p>
            
            <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">🏠</span> Dashboard
            </a>

            <a href="/ventas" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">🛍️</span> Ventas
            </a>

            {/* INTEGRACIÓN: CRM de Clientes */}
            <a href="/clientes" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">👤</span> Clientes
            </a>

            <a href="/inventario" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">📊</span> Inventario
            </a>

            <a href="/compras" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">📦</span> Registrar Ingreso
            </a>

            <a href="/inventario/nuevo" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">✨</span> Nuevo Producto
            </a>
          </nav>

          {/* INDICADOR DE ESTADO DEL BACKEND (Python) */}
          <div className="pt-6 border-t border-zinc-800">
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-zinc-400">Servidor Python Activo</span>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            NAVEGACIÓN MÓVIL - Visible solo en celulares (Pantalla táctil)
           ========================================================================= */}
        <nav className="lg:hidden flex justify-around items-center bg-black border-b border-zinc-800 p-4 sticky top-0 z-50">
          <a href="/" className="text-2xl">🏠</a>
          <a href="/ventas" className="text-2xl">🛍️</a>
          <a href="/clientes" className="text-2xl">👤</a>
          <a href="/inventario" className="text-2xl">📊</a>
          <a href="/compras" className="text-2xl">📦</a>
        </nav>

        {/* =========================================================================
            CONTENEDOR DINÁMICO (MAIN)
            Aquí es donde se inyecta cada página (Ventas, Clientes, Inventario)
           ========================================================================= */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-zinc-950 to-black pb-20 lg:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}