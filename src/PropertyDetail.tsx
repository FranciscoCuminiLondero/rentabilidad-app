import { useEffect, useRef, useState } from 'react';
import { useDolarHistorico } from './useDolarHistorico';
import { usePagos, type EstadoPago, type PagoAlquiler } from './usePagos';
import type { Propiedad } from './useProperties';
import { ConfirmDialog } from './ConfirmDialog';
import {
  formatoARS,
  formatoPorcentaje,
  formatoUSD,
  normalizarMonto,
  parseInput,
} from './calc';

interface PropertyDetailProps {
  propiedad: Propiedad;
  onClose: () => void;
  // Parche puntual (solo fecha_inicio_alquiler) para no forzar a abrir el
  // formulario completo de "editar propiedad" solo para cargar esta fecha.
  onGuardarFechaInicio: (fecha: string) => Promise<string | null>;
}

function fechaHoyISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
    hoy.getDate()
  ).padStart(2, '0')}`;
}

// Último día del mes actual: tope del input de fecha de pago (día
// completo, no solo el mes, para no bloquear pagos de días futuros dentro
// del mes en curso).
function finDeMesActualISO(): string {
  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return `${ultimoDia.getFullYear()}-${String(ultimoDia.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(ultimoDia.getDate()).padStart(2, '0')}`;
}

function numeroATexto(valor: number): string {
  return String(valor).replace('.', ',');
}

export function PropertyDetail({
  propiedad,
  onClose,
  onGuardarFechaInicio,
}: PropertyDetailProps) {
  const { buscarDolarOficial } = useDolarHistorico();
  const { pagos, registrarPago, actualizarPago, borrarPago, resumenAnual } =
    usePagos(propiedad.id);

  const [agregandoFechaInicio, setAgregandoFechaInicio] = useState(false);
  const [fechaInicioNueva, setFechaInicioNueva] = useState(fechaHoyISO());
  const [guardandoFechaInicio, setGuardandoFechaInicio] = useState(false);
  const [errorFechaInicio, setErrorFechaInicio] = useState<string | null>(null);

  const [fechaPago, setFechaPago] = useState(fechaHoyISO());
  const [montoArsTexto, setMontoArsTexto] = useState('');
  const [dolarDiaTexto, setDolarDiaTexto] = useState('');
  const [cargandoDolarDia, setCargandoDolarDia] = useState(false);
  const [estadoPago, setEstadoPago] = useState<EstadoPago>('pagado');
  const [nota, setNota] = useState('');
  const [editandoPagoId, setEditandoPagoId] = useState<string | null>(null);
  const [mensajePago, setMensajePago] = useState<string | null>(null);
  const [enviandoPago, setEnviandoPago] = useState(false);
  // Borrar un pago individual es más fácil de corregir que borrar toda la
  // propiedad (los otros pagos y la propiedad siguen intactos), así que
  // alcanza con una sola confirmación en vez de las dos que pide el borrado
  // de la propiedad.
  const [confirmandoBorradoPagoId, setConfirmandoBorradoPagoId] = useState<
    string | null
  >(null);

  // Cuando se carga un pago existente para editarlo, fechaPago cambia
  // programáticamente y no queremos que eso dispare un nuevo autocompletado
  // que pise el dolar_dia real guardado en ese pago.
  const saltarProximoAutocompletado = useRef(false);

  useEffect(() => {
    if (saltarProximoAutocompletado.current) {
      saltarProximoAutocompletado.current = false;
      return;
    }
    if (!fechaPago) return;

    let cancelado = false;
    setCargandoDolarDia(true);
    buscarDolarOficial(fechaPago).then((valor) => {
      if (cancelado) return;
      if (valor != null) setDolarDiaTexto(numeroATexto(valor));
      setCargandoDolarDia(false);
    });

    return () => {
      cancelado = true;
    };
  }, [fechaPago, buscarDolarOficial]);

  async function handleGuardarFechaInicio() {
    setErrorFechaInicio(null);
    setGuardandoFechaInicio(true);
    const error = await onGuardarFechaInicio(fechaInicioNueva);
    setGuardandoFechaInicio(false);

    if (error) {
      setErrorFechaInicio(error);
    } else {
      setAgregandoFechaInicio(false);
    }
  }

  function resetFormularioPago() {
    saltarProximoAutocompletado.current = false;
    setEditandoPagoId(null);
    setFechaPago(fechaHoyISO());
    setMontoArsTexto('');
    setEstadoPago('pagado');
    setNota('');
    setMensajePago(null);
  }

  function handleEditarPago(p: PagoAlquiler) {
    saltarProximoAutocompletado.current = true;
    setEditandoPagoId(p.id);
    setFechaPago(p.fecha);
    setMontoArsTexto(numeroATexto(p.monto_ars));
    setDolarDiaTexto(numeroATexto(p.dolar_dia));
    setEstadoPago(p.estado);
    setNota(p.nota ?? '');
    setMensajePago(null);
  }

  async function handleSubmitPago(e: React.FormEvent) {
    e.preventDefault();
    setMensajePago(null);
    setEnviandoPago(true);

    const datos = {
      fecha: fechaPago,
      // Mismo criterio que "Precio de compra" y "Alquiler mensual" en la
      // calculadora principal: un monto menor a 1000 se interpreta "en
      // miles". El dólar del día no se normaliza (tampoco lo hace el campo
      // "Dólar oficial" de la calculadora).
      monto_ars: normalizarMonto(parseInput(montoArsTexto)),
      dolar_dia: parseInput(dolarDiaTexto),
      estado: estadoPago,
      nota: nota.trim() || null,
    };

    const error = editandoPagoId
      ? await actualizarPago(editandoPagoId, datos)
      : await registrarPago(datos);

    setEnviandoPago(false);

    if (error) {
      setMensajePago(error);
    } else {
      resetFormularioPago();
    }
  }

  const resumen = propiedad.fecha_inicio_alquiler
    ? resumenAnual({
        precioCompraUSD: propiedad.precio_compra,
        fechaInicioAlquiler: propiedad.fecha_inicio_alquiler,
        previsionRentabilidadAnual: propiedad.prevision_rentabilidad_anual,
      })
    : null;

  const cumplioAnio = resumen != null && resumen.mesesTranscurridos >= 12;
  const diferencia = resumen?.diferenciaPuntosPorcentuales ?? null;
  const cumplioPrevision = diferencia != null ? diferencia >= 0 : null;

  const claseResultado =
    diferencia == null ? 'result--empty' : diferencia >= 0 ? 'result--ok' : 'result--alert';

  let textoComparacion: string;
  if (diferencia == null) {
    textoComparacion = 'Esta propiedad no tiene una previsión guardada para comparar.';
  } else if (cumplioAnio) {
    textoComparacion = cumplioPrevision
      ? 'Cumplió la previsión ✓'
      : 'No cumplió la previsión ✕';
  } else if (diferencia >= 0) {
    textoComparacion = `${formatoPorcentaje(Math.abs(diferencia))} puntos por encima de lo previsto`;
  } else {
    textoComparacion = `${formatoPorcentaje(Math.abs(diferencia))} puntos por debajo de lo previsto`;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="property-detail">
          <div className="save-section__header">
            <span className="board__title" style={{ fontSize: 14 }}>
              {propiedad.nombre}
            </span>
            <button type="button" className="link-btn" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <p className="dolar-meta">
            US$ {formatoUSD(propiedad.precio_compra)} · $
            {formatoARS(propiedad.alquiler_mensual)}/mes
          </p>
          <p className="dolar-meta">
            Previsión de rentabilidad:{' '}
            {propiedad.prevision_rentabilidad_anual != null
              ? `${formatoPorcentaje(propiedad.prevision_rentabilidad_anual)}%`
              : 'no calculada'}
          </p>
          <p className="dolar-meta">
            Inicio del alquiler: {propiedad.fecha_inicio_alquiler ?? 'no configurado'}
          </p>

          {!propiedad.fecha_inicio_alquiler &&
            (agregandoFechaInicio ? (
              <div className="field" style={{ marginTop: 10 }}>
                <div className="field__slot">
                  <input
                    type="date"
                    value={fechaInicioNueva}
                    onChange={(e) => setFechaInicioNueva(e.target.value)}
                  />
                </div>
                {errorFechaInicio && (
                  <p className="dolar-meta dolar-meta--error">{errorFechaInicio}</p>
                )}
                <div className="confirm-dialog__actions" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => {
                      setAgregandoFechaInicio(false);
                      setErrorFechaInicio(null);
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={guardandoFechaInicio}
                    onClick={handleGuardarFechaInicio}
                  >
                    {guardandoFechaInicio ? 'Guardando…' : 'Guardar fecha'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="link-btn"
                style={{ marginTop: 6 }}
                onClick={() => setAgregandoFechaInicio(true)}
              >
                Agregar fecha de inicio de alquiler
              </button>
            ))}

          <div className="divider" />

          <div className="save-section__header">
            <span className="board__title" style={{ fontSize: 14 }}>
              {editandoPagoId ? 'Editar pago' : 'Registrar pago'}
            </span>
            {editandoPagoId && (
              <button
                type="button"
                className="link-btn"
                onClick={resetFormularioPago}
              >
                Cancelar edición
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitPago}>
            <div className="field">
              <label className="field__label" htmlFor="pago-fecha">
                Fecha
              </label>
              <div className="field__slot">
                <input
                  id="pago-fecha"
                  type="date"
                  required
                  max={finDeMesActualISO()}
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                />
              </div>
              <p className="dolar-meta">
                Solo se pueden cargar pagos de meses ya transcurridos.
              </p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="pago-monto">
                Monto cobrado (ARS)
              </label>
              <div className="field__slot">
                <span className="field__prefix">$</span>
                <input
                  id="pago-monto"
                  inputMode="decimal"
                  required
                  placeholder="450.000"
                  value={montoArsTexto}
                  onChange={(e) => setMontoArsTexto(e.target.value)}
                />
              </div>
              <p className="footer-note" style={{ marginTop: 6 }}>
                450 se interpreta como 450.000. Escribí el número completo si
                querés un valor distinto.
              </p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="pago-dolar">
                Dólar del día
              </label>
              <div className="field__slot">
                <span className="field__prefix">$</span>
                <input
                  id="pago-dolar"
                  inputMode="decimal"
                  required
                  value={dolarDiaTexto}
                  onChange={(e) => setDolarDiaTexto(e.target.value)}
                />
              </div>
              {cargandoDolarDia && (
                <p className="dolar-meta">Buscando cotización de esa fecha…</p>
              )}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="pago-estado">
                Estado
              </label>
              <div className="field__slot">
                <select
                  id="pago-estado"
                  value={estadoPago}
                  onChange={(e) => setEstadoPago(e.target.value as EstadoPago)}
                >
                  <option value="pagado">Pagado</option>
                  <option value="atrasado">Atrasado</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="pago-nota">
                Nota (opcional)
              </label>
              <div className="field__slot">
                <input
                  id="pago-nota"
                  maxLength={140}
                  placeholder="Ej: pagó con 3 días de atraso"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
              </div>
            </div>

            {mensajePago && <p className="dolar-meta dolar-meta--error">{mensajePago}</p>}

            <button type="submit" className="primary-btn" disabled={enviandoPago}>
              {enviandoPago
                ? 'Un momento…'
                : editandoPagoId
                ? 'Actualizar pago'
                : 'Registrar pago'}
            </button>
          </form>

          <div className="divider" />

          <span className="board__title" style={{ fontSize: 14 }}>
            Pagos registrados
          </span>

          {pagos.length === 0 ? (
            <p className="dolar-meta">Todavía no registraste pagos.</p>
          ) : (
            <ul className="saved-list">
              {pagos.map((p) => (
                <li key={p.id} className="saved-list__item">
                  <div>
                    <div className="saved-list__name">
                      {p.fecha} ·{' '}
                      <span className={p.estado === 'pagado' ? 'dolar-meta--success' : 'dolar-meta--error'}>
                        {p.estado === 'pagado' ? 'Pagado' : 'Atrasado'}
                      </span>
                    </div>
                    <div className="saved-list__meta">
                      ${formatoARS(p.monto_ars)} · US${' '}
                      {formatoUSD(p.dolar_dia > 0 ? p.monto_ars / p.dolar_dia : 0)}
                      {p.nota ? ` · ${p.nota}` : ''}
                    </div>
                  </div>
                  <div className="saved-list__actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Editar"
                      onClick={() => handleEditarPago(p)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Borrar"
                      onClick={() => setConfirmandoBorradoPagoId(p.id)}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="divider" />

          <span className="board__title" style={{ fontSize: 14 }}>
            Análisis
          </span>

          {resumen ? (
            resumen.suficienteHistorial ? (
              <div className={'result ' + claseResultado} style={{ marginTop: 14 }}>
                <div className="result__label">
                  {cumplioAnio
                    ? 'Rentabilidad real (año cumplido)'
                    : 'Rentabilidad real hasta ahora'}
                </div>
                <div className="result__value">
                  {formatoPorcentaje(resumen.rentabilidadRealAnualizada ?? 0)}%
                </div>
                <div className="result__threshold">{textoComparacion}</div>
                <div className="result__usd">
                  Cobrado hasta ahora: US$ {formatoUSD(resumen.totalCobradoUSD)} ·{' '}
                  {Math.floor(resumen.mesesTranscurridos)} meses transcurridos
                  {resumen.pagosAtrasados > 0 &&
                    ` · ${resumen.pagosAtrasados} pago(s) atrasado(s)`}
                </div>
              </div>
            ) : (
              <div className="result result--empty" style={{ marginTop: 14 }}>
                <div className="result__label">Rentabilidad real hasta ahora</div>
                <div className="result__value">—</div>
                <div className="result__threshold">
                  Necesitás al menos un mes de historial para calcular la
                  rentabilidad real de forma confiable. Volvé a revisar esto
                  más adelante.
                </div>
                <div className="result__usd">
                  Cobrado hasta ahora: US$ {formatoUSD(resumen.totalCobradoUSD)}
                </div>
              </div>
            )
          ) : (
            <p className="dolar-meta" style={{ marginTop: 10 }}>
              Cargá la fecha de inicio del alquiler (arriba de todo, en esta
              misma vista) para activar el seguimiento de rentabilidad real.
            </p>
          )}
        </div>
      </div>

      {confirmandoBorradoPagoId && (
        <ConfirmDialog
          titulo="Borrar pago"
          mensaje="¿Seguro que querés borrar este pago? Esta acción no se puede deshacer."
          textoConfirmar="Borrar"
          onCancelar={() => setConfirmandoBorradoPagoId(null)}
          onConfirmar={() => {
            borrarPago(confirmandoBorradoPagoId);
            setConfirmandoBorradoPagoId(null);
          }}
        />
      )}
    </div>
  );
}
