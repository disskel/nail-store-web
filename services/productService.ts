const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const obtenerMargenesProductos = async () => {
  const response = await fetch(`${API_URL}/productos/margenes`);
  return await response.json();
};

export const obtenerCategorias = async () => {
  const response = await fetch(`${API_URL}/categorias`);
  return await response.json();
};

export const crearProducto = async (producto: any) => {
  const response = await fetch(`${API_URL}/productos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(producto)
  });
  return await response.json();
};