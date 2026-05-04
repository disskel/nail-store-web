import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * MIDDLEWARE DE SEGURIDAD SSR - JEAN NAILS STORE
 * Propósito: Proteger las rutas privadas y gestionar la persistencia de sesión.
 * Redirige a la raíz ('/') si el usuario ya está autenticado.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Verificamos el estado de la sesión en tiempo real
  const { data: { session } } = await supabase.auth.getSession();
  const isLoginPage = request.nextUrl.pathname === '/login';

  // REGLA 1: Si NO hay sesión activa y no está en el login, mandarlo a /login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // REGLA 2: Si SÍ hay sesión y está en el login, mandarlo a la página principal ('/')
  // CAMBIO REALIZADO: Se eliminó la redirección a '/dashboard'.
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * VIGILANCIA DE RUTAS:
     * Protege todo el sistema excepto archivos estáticos, imágenes y la API interna.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};