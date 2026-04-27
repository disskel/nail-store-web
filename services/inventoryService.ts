const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const registrarIngresoMercaderia = async (datosIngreso: any) => {
  try {
    const response = await fetch(`${API_URL}/inventario/ingreso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosIngreso),
    });
    if (!response.ok) throw new Error('Error al registrar ingreso');
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const listarProveedores = async () => {
  const response = await fetch(`${API_URL}/proveedores`);
  return await response.json();
};