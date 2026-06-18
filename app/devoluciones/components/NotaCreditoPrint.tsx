'use client';

import React from 'react';

interface NotaCreditoPrintProps {
  data: {
    cliente: any;
    correlativo_nota_credito: string;
    correlativo_original: string;
    fecha: string;
    vendedor: string;
    motivo: string;
    tipo_operacion: string;
    items_devueltos: any[];
    items_nuevos: any[];
    valor_devuelto: number;
    valor_nuevos: number;
    diferencia: number;
  };
}

export default function NotaCreditoPrint({ data }: NotaCreditoPrintProps) {
  const INFO_EMPRESA = {
    nombre: "JEAN NAILS STORE",
    direccion: "C.C. BOULEVAR SEGUNDO PISO STAND P5",
    telefono: "934459220",
    instagram: "Jean_Store_Nails",
    logo_url: "/logo.jpg" 
  };

  return (
    <div className="nota-pedido-container">
      {/* Usamos exactamente tu misma arquitectura CSS para garantizar compatibilidad de impresión */}
      <style jsx>{`
        @media screen {
          .nota-pedido-container { display: none; }
        }
        @media print {
          @page { margin: 0.5cm; size: auto; }
          html, body, #__next, main {
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          body * { visibility: hidden; }
          .nota-pedido-container, .nota-pedido-container * { visibility: visible; }
          .nota-pedido-container {
            position: relative !important; 
            width: 100% !important; left: 0 !important; top: 0 !important; padding: 0 !important; margin: 0 !important;
            color: black !important; background: white !important; z-index: 99999; 
            font-family: 'Verdana', Geneva, sans-serif; font-weight: 600; font-size: 10px; line-height: 1.4;
          }
          .items-table { page-break-inside: auto !important; width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .items-table tr { page-break-inside: avoid !important; break-inside: avoid !important; page-break-after: auto !important; }
          .items-table thead { display: table-header-group !important; } 
          .totales-grid, .seccion-cliente, .recuadro-documento { page-break-inside: avoid !important; break-inside: avoid !important; }
          .header-table { width: 100%; margin-bottom: 15px; border-bottom: 2px solid black; padding-bottom: 10px; }
          .empresa-info h1 { font-size: 22px; margin: 0; font-weight: 900; letter-spacing: -1px; }
          .empresa-info p { margin: 2px 0; font-size: 10px; text-transform: uppercase; }
          .recuadro-documento { border: 2.5px solid black; padding: 8px; text-align: center; border-radius: 12px; background: #fff; }
          .seccion-cliente { border: 1.5px solid #000; padding: 10px; margin-bottom: 15px; border-radius: 8px; background: #fafafa; }
          .items-table th { border-top: 2.5px solid black; border-bottom: 2.5px solid black; padding: 6px 4px; text-align: left; font-weight: 900; text-transform: uppercase; background: #f2f2f2; }
          .items-table td { padding: 6px 4px; border-bottom: 1px solid #eee; font-weight: 600; }
          .totales-grid { display: flex !important; justify-content: space-between !important; align-items: flex-start !important; padding-top: 10px; }
          .totales-calculo { width: 45%; }
          .fila-total { display: flex !important; justify-content: space-between !important; padding: 2px 0; font-size: 11px; }
          .total-final { border-top: 2px solid black; margin-top: 5px; padding-top: 5px; font-size: 13px; font-weight: 900; }
          .text-right { text-align: right; } .text-center { text-align: center; } .bold { font-weight: 900; } .uppercase { text-transform: uppercase; }
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
            </td>
            <td style={{ width: '35%' }}>
            <div className="recuadro-documento">
              <p className="bold" style={{ fontSize: '11px' }}>NOTA DE CRÉDITO / CAMBIO</p>
              <p className="bold" style={{ margin: '4px 0', background: '#000', color: '#fff', padding: '4px', fontSize: '14px' }}>
                {data.correlativo_nota_credito}
              </p>
              <p className="bold" style={{ fontSize: '10px', marginTop: '4px' }}>REF: {data.correlativo_original}</p>
            </div>
          </td>
          </tr>
        </tbody>
      </table>

      {/* SECCIÓN DATOS DEL CLIENTE Y AUDITORÍA */}
      <div className="seccion-cliente">
        <table style={{ width: '100%' }}>
          <tbody className="uppercase">
            <tr>
              <td style={{ width: '65%', paddingBottom: '4px' }}><span className="bold">CLIENTE:</span> {data.cliente.nombre_razon_social}</td>
              <td style={{ width: '35%' }}><span className="bold">FECHA:</span> {data.fecha}</td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '4px' }}><span className="bold">TIPO OP:</span> {data.tipo_operacion}</td>
              <td><span className="bold">DNI/RUC:</span> {data.cliente.numero_documento || 'S/N'}</td>
            </tr>
            <tr>
              <td colSpan={2}><span className="bold">MOTIVO:</span> {data.motivo}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* BLOQUE 1: PRODUCTOS DEVUELTOS (INGRESO AL ALMACÉN) */}
      <p className="bold uppercase" style={{ fontSize: '11px', marginBottom: '5px' }}>▼ PRODUCTOS RETORNADOS POR EL CLIENTE</p>
      <table className="items-table">
        <thead>
          <tr>
            <th style={{ width: '10%' }} className="text-center">CANT.</th>
            <th style={{ width: '60%' }}>DESCRIPCIÓN</th>
            <th style={{ width: '15%' }} className="text-right">ESTADO</th>
            <th style={{ width: '15%' }} className="text-right">VALOR</th>
          </tr>
        </thead>
        <tbody>
          {data.items_devueltos.map((item, index) => (
            <tr key={`dev-${index}`} className="uppercase">
              <td className="text-center">{item.cantidad_devuelta}</td>
              <td>{item.nombre}</td>
              <td className="text-right" style={{ fontSize: '8px' }}>{item.estado_inventario.replace('_', ' ')}</td>
              <td className="text-right">{Number(item.cantidad_devuelta * item.precio_unitario).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* BLOQUE 2: PRODUCTOS NUEVOS (SOLO SI ES CAMBIO) */}
      {data.tipo_operacion === 'CAMBIO' && data.items_nuevos.length > 0 && (
        <>
          <p className="bold uppercase" style={{ fontSize: '11px', marginTop: '10px', marginBottom: '5px' }}>▲ NUEVOS PRODUCTOS ENTREGADOS</p>
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }} className="text-center">CANT.</th>
                <th style={{ width: '60%' }}>DESCRIPCIÓN</th>
                <th style={{ width: '15%' }} className="text-right">P.UNIT</th>
                <th style={{ width: '15%' }} className="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.items_nuevos.map((item, index) => (
                <tr key={`nuevo-${index}`} className="uppercase">
                  <td className="text-center">{item.cantidad}</td>
                  <td>{item.nombre}</td>
                  <td className="text-right">{Number(item.precio_unitario).toFixed(2)}</td>
                  <td className="text-right">{Number(item.cantidad * item.precio_unitario).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* RESUMEN DE TOTALES Y FIRMA */}
      <div className="totales-grid">
        <div style={{ width: '45%', borderTop: '1px solid black', marginTop: '30px', textAlign: 'center' }}>
          <p className="bold" style={{ fontSize: '9px', marginTop: '5px' }}>FIRMA DEL CLIENTE (CONFORMIDAD)</p>
          <p style={{ fontSize: '8px', marginTop: '2px' }}>DNI:</p>
        </div>
        
        <div className="totales-calculo">
          <div className="fila-total">
            <span>VALOR RETORNADO S/</span>
            <span>{Number(data.valor_devuelto).toFixed(2)}</span>
          </div>
          {data.tipo_operacion === 'CAMBIO' && (
            <div className="fila-total" style={{ color: 'red' }}>
              <span>NUEVO COSTO S/</span>
              <span>- {Number(data.valor_nuevos).toFixed(2)}</span>
            </div>
          )}
          
          <div className="fila-total total-final">
            <span className="bold">
              {data.diferencia > 0 ? "COBRADO AL CLIENTE S/" : data.diferencia < 0 ? "DEVUELTO AL CLIENTE S/" : "CAMBIO EXACTO S/"}
            </span>
            <span className="bold">{Number(Math.abs(data.diferencia)).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* PIE DE PÁGINA */}
      <div className="text-center" style={{ marginTop: '30px', borderTop: '1.5px dashed #000', paddingTop: '10px' }}>
        <p style={{ fontSize: '9px', fontWeight: 'bold' }}>OPERACIÓN AUDITADA POR: {data.vendedor.toUpperCase()}</p>
        <p style={{ fontSize: '8px' }}>Jean Nails Store Trujillo - La Libertad</p>
      </div>
    </div>
  );
}