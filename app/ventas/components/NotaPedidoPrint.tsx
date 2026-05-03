'use client';

import React from 'react';

/**
 * COMPONENTE DE IMPRESIÓN PROFESIONAL - NOTA DE PEDIDO
 * Propósito: Generar el documento físico final para el cliente.
 * Diseñado para cumplir con el formato de JEAN NAILS STORE.
 */

interface NotaPedidoPrintProps {
  data: {
    items: any[];           // Lista de productos vendidos
    cliente: any;           // Datos del sujeto identificado
    correlativo: string;     // Número de serie (ej: P001-000001)
    total_letras: string;    // Monto convertido a texto formal
    subtotal: number;       // Suma bruta antes de descuentos
    descuento_global: number; // Monto restado del subtotal
    total_pagar: number;     // Monto neto final en soles
    fecha: string;          // Fecha de emisión
    vendedor: string;       // Nombre del cajero/administrador
  };
}

export default function NotaPedidoPrint({ data }: NotaPedidoPrintProps) {
  
  // ===========================================================================
  // SECCIÓN DE MANTENIMIENTO RÁPIDO (Datos maestros de la empresa)
  // ===========================================================================
  const INFO_EMPRESA = {
    nombre: "JEAN NAILS STORE",
    ruc: "20610962611",
    direccion: "C.C. BOULEVAR SEGUNDO PISO STAND P5",
    telefono: "934459220",
    instagram: "Jean_Store_Nails",
    logo_url: "/logo.jpg" 
  };

  return (
    <div className="nota-pedido-container">
      {/* ESTILOS CSS EXCLUSIVOS PARA IMPRESIÓN */}
      <style jsx>{`
        /* Ocultar en la interfaz web para que no interfiera con el panel POS */
        @media screen {
          .nota-pedido-container { display: none; }
        }

        /* Configuración específica para el motor de impresión del navegador */
        @media print {
          /* Limpieza de cabeceras de página del navegador (URL, Título) */
          @page { margin: 0; }
          
          body * { visibility: hidden; }
          .nota-pedido-container, .nota-pedido-container * { visibility: visible; }
          
          .nota-pedido-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.8cm;
            color: black !important;
            background: white !important;
            font-family: 'Courier New', Courier, monospace; /* Fuente clásica de auditoría */
            font-size: 11px;
            line-height: 1.3;
          }

          .header-table { width: 100%; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px; }
          .empresa-info h1 { font-size: 22px; margin: 0; font-weight: 900; letter-spacing: -1px; }
          .empresa-info p { margin: 2px 0; font-size: 10px; text-transform: uppercase; }

          .recuadro-documento {
            border: 2px solid black;
            padding: 12px;
            text-align: center;
            border-radius: 12px;
            background: #fff;
          }

          .seccion-cliente {
            border: 1px solid #000;
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 8px;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th {
            border-top: 2px solid black;
            border-bottom: 2px solid black;
            padding: 8px 4px;
            text-align: left;
            font-weight: 900;
            text-transform: uppercase;
            background: #f9f9f9;
          }
          .items-table td {
            padding: 6px 4px;
            border-bottom: 1px solid #eee;
          }

          .totales-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-top: 10px;
          }

          .monto-letras { font-weight: bold; width: 60%; font-size: 10px; text-transform: uppercase; }
          
          .totales-calculo { width: 35%; }
          .fila-total { display: flex; justify-content: space-between; padding: 2px 0; }
          .total-final { 
            border-top: 2px solid black; 
            margin-top: 5px; 
            padding-top: 5px; 
            font-size: 14px; 
            font-weight: 900; 
          }

          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bold { font-weight: 900; }
          .uppercase { text-transform: uppercase; }
        }
      `}</style>

      {/* CABECERA: LOGO Y DATOS FISCALES */}
      <table className="header-table">
        <tbody>
          <tr>
            <td style={{ width: '15%' }}>
              <img src={INFO_EMPRESA.logo_url} alt="Logo" style={{ width: '90px', height: 'auto' }} />
            </td>
            <td style={{ width: '50%', paddingLeft: '15px' }} className="empresa-info">
              <h1>{INFO_EMPRESA.nombre}</h1>
              <p className="bold">SISTEMA PROFESIONAL PARA UÑAS</p>
              <p>{INFO_EMPRESA.direccion}</p>
              <p>WHATSAPP: {INFO_EMPRESA.telefono}</p>
              <p>INSTAGRAM: @{INFO_EMPRESA.instagram}</p>
            </td>
            <td style={{ width: '35%' }}>
              <div className="recuadro-documento">
                <p className="bold" style={{ fontSize: '14px' }}>R.U.C. {INFO_EMPRESA.ruc}</p>
                <p className="bold" style={{ margin: '6px 0', background: '#000', color: '#fff', padding: '4px' }}>NOTA DE PEDIDO</p>
                <p className="bold" style={{ fontSize: '16px' }}>{data.correlativo}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* SECCIÓN DATOS DEL CLIENTE */}
      <div className="seccion-cliente">
        <table style={{ width: '100%' }}>
          <tbody className="uppercase">
            <tr>
              <td style={{ width: '70%', paddingBottom: '5px' }}><span className="bold">SEÑOR(ES):</span> {data.cliente.nombre_razon_social}</td>
              <td style={{ width: '30%' }}><span className="bold">DNI/RUC:</span> {data.cliente.numero_documento}</td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '5px' }}><span className="bold">DIRECCIÓN:</span> {data.cliente.direccion || 'TRUJILLO'}</td>
              <td><span className="bold">FECHA:</span> {data.fecha}</td>
            </tr>
            <tr>
              <td><span className="bold">FORMA DE PAGO:</span> CONTADO</td>
              <td><span className="bold">CELULAR:</span> {data.cliente.celular || 'S/N'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TABLA DE DETALLE DE PRODUCTOS */}
      <table className="items-table">
        <thead>
          <tr>
            <th style={{ width: '15%' }}>CÓDIGO</th>
            <th style={{ width: '10%' }} className="text-center">CANT.</th>
            <th style={{ width: '45%' }}>DESCRIPCIÓN</th>
            <th style={{ width: '15%' }} className="text-right">P.UNIT</th>
            <th style={{ width: '15%' }} className="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={index} className="uppercase">
              <td>{item.codigo}</td>
              <td className="text-center">{item.cantidad}</td>
              <td>{item.descripcion}</td>
              <td className="text-right">{Number(item.precio_unitario).toFixed(2)}</td>
              <td className="text-right">{Number(item.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* RESUMEN DE TOTALES */}
      <div className="totales-grid">
        <div className="monto-letras">
          <p className="bold">{data.total_letras}</p>
          <p style={{ marginTop: '25px', fontSize: '9px', fontStyle: 'normal' }}>VENDEDOR: {data.vendedor.toUpperCase()}</p>
        </div>
        
        <div className="totales-calculo">
          <div className="fila-total">
            <span>SUBTOTAL S/</span>
            <span>{Number(data.subtotal).toFixed(2)}</span>
          </div>
          <div className="fila-total">
            <span>DESCUENTO S/</span>
            <span>{Number(data.descuento_global).toFixed(2)}</span>
          </div>
          <div className="fila-total">
            <span>IGV (0.00%) S/</span>
            <span>0.00</span>
          </div>
          <div className="fila-total total-final">
            <span className="bold">TOTAL A PAGAR S/</span>
            <span className="bold">{Number(data.total_pagar).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* PIE DE PÁGINA */}
      <div className="text-center" style={{ marginTop: '40px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
        <p style={{ fontSize: '9px', fontWeight: 'bold' }}>¡GRACIAS POR TU PREFERENCIA!</p>
        <p style={{ fontSize: '8px' }}>Jean Nails Store Trujillo - La Libertad</p>
      </div>
    </div>
  );
}