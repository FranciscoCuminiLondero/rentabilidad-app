import { useEffect } from 'react';

interface LegalModalProps {
  onClose: () => void;
}

// Borrador razonable para un lanzamiento MVP, no es asesoramiento legal
// profesional. Antes de escalar en serio (más usuarios, más plata en
// juego), conviene que un abogado lo revise — sobre todo la parte de
// facturación/AFIP, que depende de tu situación impositiva real.
export function LegalModal({ onClose }: LegalModalProps) {
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
              Términos y Privacidad
            </span>
            <button type="button" className="link-btn" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <div className="help-section">
            <p className="help-section__title">El servicio</p>
            <p className="help-section__text">
              Rentabilidad de alquiler es una herramienta para estimar si
              conviene comprar una propiedad para alquilarla, y hacer
              seguimiento de los pagos reales. Los cálculos son orientativos:
              no constituyen asesoramiento financiero ni garantizan ningún
              resultado de inversión.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Cuenta y planes</p>
            <p className="help-section__text">
              La calculadora se puede usar sin crear cuenta. Crear una cuenta
              es necesario solo para guardar propiedades y usar el
              seguimiento de pagos. Existen un plan gratuito y dos planes
              pagos (Básico y Pro), con 7 días de prueba gratis antes del
              primer cobro. El precio de los planes pagos está fijado en
              dólares y se cobra en pesos al tipo de cambio oficial del día
              en que te suscribís.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Pagos y cobros</p>
            <p className="help-section__text">
              Los cobros de los planes pagos los procesa Mercado Pago. No
              accedemos ni guardamos los datos de tu tarjeta o cuenta
              bancaria — eso queda a cargo de Mercado Pago bajo sus propios
              términos. El cobro es mensual y automático hasta que
              cancelés la suscripción.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Cancelación y reembolsos</p>
            <p className="help-section__text">
              Podés cancelar tu suscripción en cualquier momento desde
              Mercado Pago (Tu perfil → Suscripciones). Si cancelás antes de
              que termine la prueba gratis de 7 días, no se te cobra nada.
              Una vez efectuado un cobro, no se reintegra de forma
              automática por el período ya iniciado; escribinos si tenés un
              caso puntual.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Tus datos</p>
            <p className="help-section__text">
              Guardamos tu email y los datos de las propiedades/pagos que
              cargues, para que la app funcione. Cada usuario solo puede ver
              sus propios datos (protegido a nivel de base de datos). No
              vendemos ni compartimos tus datos con terceros, salvo lo
              estrictamente necesario para procesar los pagos (Mercado
              Pago).
            </p>
            <p className="help-section__text" style={{ marginTop: 6 }}>
              De acuerdo a la Ley 25.326 de Protección de Datos Personales,
              podés pedirnos acceder, corregir o borrar tus datos en
              cualquier momento. Borrar tu cuenta borra también todas tus
              propiedades y el historial de pagos asociado, de forma
              irreversible.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Cambios</p>
            <p className="help-section__text">
              Podemos actualizar estos términos con el tiempo. Los cambios
              importantes se van a avisar dentro de la app.
            </p>
          </div>

          <div className="help-section">
            <p className="help-section__title">Contacto</p>
            <p className="help-section__text">
              Dudas, reclamos o pedidos sobre tus datos: escribinos a
              volksoftwares@gmail.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
