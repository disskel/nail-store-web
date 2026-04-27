import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Movemos la opción fuera de 'experimental'
  allowedDevOrigins: ['192.168.1.156', 'localhost:3000'],
  
  /* otras opciones aquí */
};

export default nextConfig;