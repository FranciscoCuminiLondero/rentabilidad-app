import { useEffect } from 'react';

interface LegalModalProps {
  onClose: () => void;
}

// El contenido real vive en public/legal/terminos.html y
// public/legal/privacidad.html (páginas estáticas, para poder linkearlas
// directo desde afuera de la app — ej. la pantalla de consentimiento OAuth
// de Google pide una URL, no algo dentro de un modal de una SPA). Este
// modal solo lleva ahí, para no duplicar el texto en dos lugares.
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
            <p className="help-section__title">Condiciones del Servicio</p>
            <p className="help-section__text">
              Qué es la app, cómo funcionan los planes pagos, cancelación y
              reembolsos.
            </p>
            <a
              href="/legal/terminos.html"
              target="_blank"
              rel="noopener noreferrer"
              className="link-btn"
              style={{ marginTop: 6, display: 'inline-block' }}
            >
              Ver Condiciones del Servicio ↗
            </a>
          </div>

          <div className="help-section">
            <p className="help-section__title">Política de Privacidad</p>
            <p className="help-section__text">
              Qué datos guardamos, con quién los compartimos, y cómo ejercer
              tus derechos sobre ellos.
            </p>
            <a
              href="/legal/privacidad.html"
              target="_blank"
              rel="noopener noreferrer"
              className="link-btn"
              style={{ marginTop: 6, display: 'inline-block' }}
            >
              Ver Política de Privacidad ↗
            </a>
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
