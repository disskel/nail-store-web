import { redirect } from 'next/navigation';

export default function RedirectCompras() {
  // Redirigimos automáticamente a la ruta profesional de inventario
  redirect('/inventario/ingreso');
}