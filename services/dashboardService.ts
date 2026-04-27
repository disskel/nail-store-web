const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const obtenerResumenDashboard = async () => {
  try {
    const response = await fetch(`${API_URL}/dashboard/resumen`);
    if (!response.ok) throw new Error('Error al obtener resumen');
    return await response.json();
  } catch (error) {
    console.error("Error en dashboardService:", error);
    throw error;
  }
};