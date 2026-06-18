'use client'; // 1. Habilitamos clics, hooks de estado y lógica de sesión en el cliente

import { useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link"; // Navegación optimizada de Next.js
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { apiService } from '@/services/apiService';
import "./globals.css";

// IMPORTACIÓN DEL NUEVO COMPONENTE DE NOTIFICACIONES
// Este componente centraliza las alertas de pagos pendientes (Luz, Alquiler, etc.)
import NotificationBell from "./components/NotificationBell";

// Configuración de fuentes optimizadas de Google
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * COMPONENTE RAÍZ (ROOT LAYOUT) - v1.2.0
 * Propósito: Define la estructura global del sistema, gestiona el tema (Claro/Oscuro) 
 * y mantiene la persistencia de la sesión del cajero.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true); // El sistema inicia en modo oscuro por defecto
  
  // Inicialización del cliente de Supabase para validación de identidad en tiempo real
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. SINCRONIZACIÓN DEL TEMA (MODO CLARO/OSCURO)
  // Al cargar la página, verificamos si el usuario guardó una preferencia previa.
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const darkMode = savedTheme ? savedTheme === 'dark' : true;
    setIsDark(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Función para alternar el tema visual y guardarlo en el navegador
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Función para cerrar sesión limpiando tanto Supabase como los datos locales de Trujillo
  const handleLogout = async () => {
    await supabase.auth.signOut(); // Notifica al servidor de autenticación
    await apiService.logout();     // Limpia tokens guardados localmente
    router.push('/login');         
    router.refresh();
  };

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full ${isDark ? 'dark' : ''}`}>
      <body className="flex flex-col lg:flex-row h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors duration-300">
        
        {/* --- BARRA LATERAL (PC / DESKTOP) --- */}
        {/* CIRUGÍA: print:hidden oculta todo el menú lateral al imprimir */}
        <aside className="hidden lg:flex print:hidden w-72 bg-zinc-50 dark:bg-black border-r border-zinc-200 dark:border-zinc-800 flex-col p-6 shadow-2xl transition-colors duration-300">
          
          {/* CABECERA LATERAL: Logo y Notificaciones */}
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                N
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Nail-Store</h2>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-500 uppercase font-bold tracking-widest transition-colors">Admin Pro</p>
              </div>
            </div>

            {/* INTEGRACIÓN: CAMPANA DE NOTIFICACIONES PARA PC */}
            {/* Se activa en rojo si hay pagos de servicios pendientes hoy */}
            <NotificationBell />
          </div>

          {/* MENÚ DE NAVEGACIÓN PRINCIPAL */}
          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase px-3 mb-3 tracking-widest">Principal</p>
            
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white">
              <span className="text-lg">🏠</span> Dashboard
            </Link>

            <Link href="/devoluciones" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white">
              <span className="text-xl group-hover:scale-110 transition-transform">🔄</span>
              <span className="font-bold text-sm">Devoluciones</span>
            </Link>

            <Link href="/ventas" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white">
              <span className="text-lg">🛍️</span> Ventas
            </Link>

            <Link href="/clientes" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white">
              <span className="text-lg">👤</span> Clientes
            </Link>

            <Link href="/cajas" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white">
              <span className="text-lg">🔐</span> Historial Cajas
            </Link>

            <Link href="/utilidades" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white">
              <span className="text-lg">📈</span> Utilidades
            </Link>

            {/* NUEVO: ACCESO AL MÓDULO DE BUSINESS INTELLIGENCE (MATRIZ BCG) */}
            <Link href="/analitica" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white">
              <span className="text-lg">🎯</span> Analítica BI
            </Link>

            <Link href="/inventario" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white">
              <span className="text-lg">📊</span> Inventario
            </Link>

            <Link href="/compras" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white">
              <span className="text-lg">📦</span> Registrar Ingreso
            </Link>

            <Link href="/inventario/nuevo" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white">
              <span className="text-lg">✨</span> Nuevo Producto
            </Link>

            {/* SELECTOR DE MODO VISUAL */}
            <div className="pt-4 px-2">
              <button 
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all border border-indigo-600/20"
              >
                <span className="text-lg">{isDark ? '☀️' : '🌙'}</span> {isDark ? 'Modo Claro' : 'Modo Oscuro'}
              </button>
            </div>
          </nav>

          {/* CIERRE DE SESIÓN SEGURO */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* --- NAVEGACIÓN MÓVIL (BOTTOM / TOP BAR) --- */}
        {/* CIRUGÍA: print:hidden oculta la barra de iconos móviles al imprimir */}
        <nav className="lg:hidden print:hidden flex justify-around items-center bg-zinc-50 dark:bg-black border-b border-zinc-200 dark:border-zinc-800 p-4 sticky top-0 z-50 transition-colors duration-300 overflow-x-auto no-scrollbar">
          <Link href="/" className="text-xl px-2">🏠</Link>
          <Link href="/ventas" className="text-xl px-2">🛍️</Link>
          <Link href="/clientes" className="text-xl px-2">👤</Link>
          {/* NUEVO ACCESO MÓVIL A DEVOLUCIONES */}
          <Link href="/devoluciones" className="text-xl px-2">🔄</Link>

          {/* INTEGRACIÓN: CAMPANA DE NOTIFICACIONES MÓVIL */}
          {/* Permite a Jean ver las alertas desde su celular en la tienda */}
          <NotificationBell />

          <button onClick={toggleTheme} className="text-xl px-2">{isDark ? '☀️' : '🌙'}</button>
          <Link href="/cajas" className="text-xl px-2">🔐</Link>
          <Link href="/utilidades" className="text-xl px-2">📈</Link>
          
          {/* NUEVO ACCESO MÓVIL A ANALÍTICA BI */}
          <Link href="/analitica" className="text-xl px-2">🎯</Link>
          
          <Link href="/inventario" className="text-xl px-2">📊</Link>
          <Link href="/compras" className="text-xl px-2">📦</Link>
          <Link href="/inventario/nuevo" className="text-xl px-2">✨</Link>
          <button onClick={handleLogout} className="text-xl px-2">🚪</button>
        </nav>

        {/* ÁREA DE CONTENIDO PRINCIPAL (Donde se cargan todas las páginas) */}
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-gradient-to-br dark:from-zinc-950 dark:to-black pt-5 lg:pt-0 pb-20 lg:pb-0 transition-colors duration-300">
          {children}
        </main>
      </body>
    </html>
  );
}