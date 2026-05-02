'use client';

import React from 'react';

/**
 * COMPONENTE DE IMPRESIÓN PROFESIONAL - NOTA DE PEDIDO
 * Diseñado para cumplir con el formato de JEAN NAILS STORE.
 * CORRECCIÓN: Se migran los atributos 'width' a objetos 'style' para compatibilidad con TypeScript.
 */

interface NotaPedidoPrintProps {
  data: {
    items: any[];
    cliente: any;
    correlativo: string;
    total_letras: string;
    subtotal: number;
    descuento_global: number;
    total_pagar: number;
    fecha: string;
    vendedor: string;
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
        /* Ocultar en la interfaz web para que no interfiera con el POS */
        @media screen {
          .nota-pedido-container { display: none; }
        }

        /* Configuración específica para el motor de impresión del navegador */
        @media print {
          body * { visibility: hidden; }
          .nota-pedido-container, .nota-pedido-container * { visibility: visible; }
          
          .nota-pedido-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.5cm;
            color: black !important;
            background: white !important;
            font-family: 'Courier New', Courier, monospace; /* Fuente tipo factura clásica */
            font-size: 11px;
            line-height: 1.2;
          }

          .header-table { width: 100%; margin-bottom: 15px; }
          .empresa-info h1 { font-size: 18px; margin: 0; font-weight: 900; }
          .empresa-info p { margin: 1px 0; font-size: 9px; }

          .recuadro-documento {
            border: 1.5px solid black;
            padding: 8px;
            text-align: center;
            border-radius: 8px;
          }

          .seccion-cliente {
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 5px;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .items-table th {
            border-top: 1px solid black;
            border-bottom: 1px solid black;
            padding: 5px 2px;
            text-align: left;
            font-weight: bold;
            text-transform: uppercase;
          }
          .items-table td {
            padding: 4px 2px;
            border-bottom: 0.5px dashed #eee;
          }

          .totales-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .monto-letras { font-weight: bold; font-style: italic; width: 65%; font-size: 10px; }
          
          .totales-calculo { width: 30%; }
          .fila-total { display: flex; justify-content: space-between; padding: 1px 0; }
          .total-final { 
            border-top: 1.5px solid black; 
            margin-top: 3px; 
            padding-top: 3px; 
            font-size: 12px; 
            font-weight: 900; 
          }

          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
        }
      `}</style>

      {/* CABECERA: LOGO Y DATOS FISCALES */}
      <table className="header-table">
        <tbody>
          <tr>
            <td style={{ width: '15%' }}>
              <img src={INFO_EMPRESA.logo_url} alt="Logo" style={{ width: '80px', height: 'auto' }} />
            </td>
            <td style={{ width: '55%', paddingLeft: '10px' }} className="empresa-info">
              <h1>{INFO_EMPRESA.nombre}</h1>
              <p className="bold">SISTEMA PROFESIONAL PARA UÑAS</p>
              <p>{INFO_EMPRESA.direccion}</p>
              <p>WHATSAPP: {INFO_EMPRESA.telefono}</p>
              <p>INSTAGRAM: @{INFO_EMPRESA.instagram}</p>
            </td>
            <td style={{ width: '30%' }}>
              <div className="recuadro-documento">
                <p className="bold">R.U.C. {INFO_EMPRESA.ruc}</p>
                <p className="bold" style={{ margin: '4px 0', background: '#f0f0f0', padding: '2px' }}>NOTA DE PEDIDO</p>
                <p className="bold">{data.correlativo}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* SECCIÓN DATOS DEL CLIENTE */}
      <div className="seccion-cliente">
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ width: '70%' }}><span className="bold">SEÑOR(ES):</span> {data.cliente.nombre_razon_social}</td>
              <td style={{ width: '30%' }}><span className="bold">DNI/RUC:</span> {data.cliente.numero_documento}</td>
            </tr>
            <tr>
              <td><span className="bold">DIRECCIÓN:</span> {data.cliente.direccion || 'TRUJILLO'}</td>
              <td><span className="bold">FECHA:</span> {data.fecha}</td>
            </tr>
            <tr>
              <td><span className="bold">FORMA DE PAGO:</span> CONTADO</td>
              <td><span className="bold">CELULAR:</span> {data.cliente.celular || 'S/N'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TABLA DE DETALLE DE PRODUCTOS (CORREGIDA PARA TS) */}
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
            <tr key={index}>
              <td>{item.codigo}</td>
              <td className="text-center">{item.cantidad}</td>
              <td>{item.descripcion.toUpperCase()}</td>
              <td className="text-right">{Number(item.precio_unitario).toFixed(2)}</td>
              <td className="text-right">{Number(item.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* RESUMEN DE TOTALES */}
      <div className="totales-grid">
        <div className="monto-letras">
          <p>{data.total_letras}</p>
          <p style={{ marginTop: '15px', fontSize: '8px', fontStyle: 'normal' }}>Vendedor: {data.vendedor}</p>
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
      <div className="text-center" style={{ marginTop: '30px', borderTop: '1px dashed #000', paddingTop: '8px' }}>
        <p style={{ fontSize: '8px' }}>Gracias por su preferencia - Jean Nails Store Trujillo</p>
      </div>
    </div>
  );
}