import { useEffect, useState } from 'react';

export type EstadoDolar = 'cargando' | 'ok' | 'error';

interface DolarApiResponse {
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export function useDolarOficial() {
  const [valorAutomatico, setValorAutomatico] = useState<number | null>(null);
  const [estado, setEstado] = useState<EstadoDolar>('cargando');
  const [actualizado, setActualizado] = useState<string | null>(null);

  const recargar = () => {
    setEstado('cargando');
    fetch('https://dolarapi.com/v1/dolares/oficial')
      .then((r) => {
        if (!r.ok) throw new Error('Respuesta no válida');
        return r.json() as Promise<DolarApiResponse>;
      })
      .then((data) => {
        setValorAutomatico(data.venta);
        setActualizado(data.fechaActualizacion ?? null);
        setEstado('ok');
      })
      .catch(() => {
        setEstado('error');
      });
  };

  useEffect(() => {
    recargar();
  }, []);

  return { valorAutomatico, estado, actualizado, recargar };
}
