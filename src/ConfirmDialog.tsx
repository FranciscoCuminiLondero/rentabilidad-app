interface ConfirmDialogProps {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Modal chico y genérico para confirmar acciones destructivas (borrar una
// propiedad, borrar un pago), siguiendo el mismo patrón visual que los
// demás modales de la app (modal-overlay / modal-panel).
export function ConfirmDialog({
  titulo,
  mensaje,
  textoConfirmar,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  return (
    // stopPropagation en el propio overlay: este diálogo puede terminar
    // anidado dentro de otro modal (ej. al borrar un pago desde
    // PropertyDetail), y sin esto un click para cancelar acá también
    // burbujearía hasta el onClick del modal contenedor y lo cerraría.
    <div
      className="modal-overlay"
      onClick={(e) => {
        e.stopPropagation();
        onCancelar();
      }}
    >
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog">
          <span className="board__title" style={{ fontSize: 14 }}>
            {titulo}
          </span>
          <p className="dolar-meta" style={{ marginTop: 10, marginBottom: 18 }}>
            {mensaje}
          </p>
          <div className="confirm-dialog__actions">
            <button type="button" className="btn-small" onClick={onCancelar}>
              Cancelar
            </button>
            <button type="button" className="primary-btn" onClick={onConfirmar}>
              {textoConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
