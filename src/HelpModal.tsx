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
            <p className="help-section__title">Plan gratuito</p>
            <p className="help-section__text">
              Con la cuenta gratuita podés guardar hasta 2 propiedades. Para
              guardar más habrá un plan pago (todavía no disponible).
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
        </div>
      </div>
    </div>
  );
}
