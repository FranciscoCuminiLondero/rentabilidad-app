import { useEffect } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="help-panel">
          <div className="save-section__header">
            <span className="board__title" style={{ fontSize: 14 }}>
              Cómo usar la app
            </span>
            <button type="button" className="link-btn" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <div className="help-section">
            <p className="help-section__title">¿Qué hace esta app?</p>
            <p className="help-section__text">
              Calcula si conviene comprar una propiedad para alquilarla:
              compara lo que pagás en dólares con lo que cobrarías de
              alquiler en pesos.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Precio de compra (USD)</p>
            <p className="help-section__text">
              Es el valor de la propiedad en dólares. Si escribís un número
              menor a 1000, se interpreta en miles: 47 se convierte en
              47.000.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Alquiler mensual (ARS)</p>
            <p className="help-section__text">
              Es lo que cobrarías por mes en pesos. Misma regla: un número
              menor a 1000 se multiplica por mil (450 se convierte en
              450.000).
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Dólar oficial · venta</p>
            <p className="help-section__text">
              Se completa solo con la cotización del momento. Si preferís
              usar tu propio valor, tocá el ícono de lápiz (✎) e ingresalo
              a mano.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Rentabilidad anual</p>
            <p className="help-section__text">
              Es el porcentaje que rendiría la inversión en un año. En verde
              está por encima del 6% de referencia (buena rentabilidad); en
              rojo, por debajo.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Crear una cuenta</p>
            <p className="help-section__text">
              Sirve para guardar propiedades y compararlas más adelante. Es
              opcional: podés usar la calculadora sin loguearte.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Planes y precios</p>
            <p className="help-section__text">
              {/* Precios y límites deben coincidir con PricingModal.tsx /
                  useSubscription.ts. */}
              Free es gratis y permite guardar hasta 2 propiedades, sin
              seguimiento de pagos. Básico ($4.999/mes) sube el límite a 10
              propiedades con seguimiento incluido, y Pro ($9.999/mes) no
              tiene límite de propiedades guardadas.
            </p>
            <p className="help-section__text" style={{ marginTop: 6 }}>
              Los planes pagos incluyen 7 días de prueba gratis antes del
              primer cobro. Podés elegirlos o cambiarlos desde el botón
              Mejorar plan en Mis propiedades.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">
              Editar o borrar una propiedad guardada
            </p>
            <p className="help-section__text">
              En la sección Mis propiedades, cada propiedad guardada tiene un
              ícono de lápiz (✎) para editarla y una cruz (✕) para borrarla.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Fecha de inicio del alquiler</p>
            <p className="help-section__text">
              La necesitás para activar el seguimiento de pagos y comparar la
              rentabilidad real contra la prevista. Si no la cargaste al
              guardar la propiedad, podés agregarla después sin editar todo
              el formulario: abrí la propiedad desde Mis propiedades y vas a
              ver un botón para sumarla ahí mismo.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">
              Registrar pagos de meses futuros
            </p>
            <p className="help-section__text">
              No se puede: el cálculo usa la cotización del dólar del día de
              cada pago, y todavía no existe la de un mes que no llegó. Solo
              podés cargar pagos de meses ya transcurridos (incluido el
              actual).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
