import { useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  NOMBRE_TIPO_DOLAR,
  TIPOS_DOLAR,
  useDolar,
  type TipoDolar,
} from './useDolar';
import { useAuth } from './useAuth';
import { AuthForm } from './AuthForm';
import { HelpModal } from './HelpModal';
import { LegalModal } from './LegalModal';
import { PropertyDetail } from './PropertyDetail';
import { ConfirmDialog } from './ConfirmDialog';
import { PricingModal } from './PricingModal';
import { useProperties, type Propiedad } from './useProperties';
import {
  formatoEstadoSuscripcion,
  formatoLimite,
  NOMBRE_PLAN,
  useSubscription,
} from './useSubscription';
import {
  UMBRAL_RENTABILIDAD,
  calcularRentabilidad,
  formatoARS,
  formatoPorcentaje,
  formatoUSD,
  parseInput,
} from './calc';

// Inversa de parseInput: convierte un número guardado (ej. 47000.5) al
// formato de texto que entienden los campos (coma como separador decimal),
// para poder precargar una propiedad guardada en la calculadora al editarla.
function numeroAInput(valor: number): string {
  return String(valor).replace('.', ',');
}

export default function App() {
  const [precioCompra, setPrecioCompra] = useState('0');
  const [alquilerMensual, setAlquilerMensual] = useState('0');
  const [dolarManualActivo, setDolarManualActivo] = useState(false);
  const [dolarManual, setDolarManual] = useState('');
  const [tipoDolar, setTipoDolar] = useState<TipoDolar>('oficial');
  const [nombrePropiedad, setNombrePropiedad] = useState('');
  const [fechaInicioAlquiler, setFechaInicioAlquiler] = useState('');
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarAuthForm, setMostrarAuthForm] = useState(false);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const [mostrarLegal, setMostrarLegal] = useState(false);
  const [mostrarPlanes, setMostrarPlanes] = useState(false);
  const [propiedadDetalleId, setPropiedadDetalleId] = useState<string | null>(
    null
  );
  // Borrar una propiedad es irreversible y se lleva puesto todo su
  // historial de pagos: pide confirmación en dos pasos, con textos
  // distintos para que el segundo no se sienta un doble-click accidental.
  const [confirmandoBorrado, setConfirmandoBorrado] = useState<{
    id: string;
    paso: 1 | 2;
  } | null>(null);

  const { cotizaciones, estado, recargar } = useDolar();
  const valorAutomatico = cotizaciones?.[tipoDolar] ?? null;
  const { session, cargando: cargandoAuth, signOut } = useAuth();
  const { suscripcion, plan, limitePropiedades, tieneSeguimientoPagos } =
    useSubscription(session?.user.id);
  const { propiedades, guardar, actualizar, borrar } = useProperties(
    session?.user.id,
    limitePropiedades
  );

  const propiedadDetalle =
    propiedades.find((p) => p.id === propiedadDetalleId) ?? null;

  // Si se cierra sesión mientras se editaba una propiedad, no dejar el modo
  // edición "colgado" (la sección de guardado ni siquiera se muestra sin
  // sesión, pero conviene resetear el estado por las dudas de que se vuelva
  // a iniciar sesión más tarde).
  useEffect(() => {
    if (!session) setEditandoId(null);
  }, [session]);

  const dolarVenta = dolarManualActivo
    ? parseInput(dolarManual)
    : valorAutomatico ?? 0;

  const resultado = useMemo(
    () =>
      calcularRentabilidad(
        parseInput(precioCompra),
        parseInput(alquilerMensual),
        dolarVenta
      ),
    [precioCompra, alquilerMensual, dolarVenta]
  );

  const hayDatos = resultado.precioCompraUSD > 0 && dolarVenta > 0;
  const esBueno = resultado.rentabilidadAnual >= UMBRAL_RENTABILIDAD;

  async function handleGuardar() {
    setMensajeGuardado(null);
    const datos = {
      nombre: nombrePropiedad.trim() || 'Propiedad sin nombre',
      precio_compra: resultado.precioCompraUSD,
      alquiler_mensual: resultado.alquilerMensualARS,
      dolar_venta: dolarVenta,
      tipo_dolar: tipoDolar,
      fecha_inicio_alquiler: fechaInicioAlquiler || null,
      // No lo carga el usuario a mano: se completa con la rentabilidad
      // calculada en este mismo momento, para poder comparar más adelante
      // contra lo cobrado realmente (ver PropertyDetail.tsx).
      prevision_rentabilidad_anual: resultado.rentabilidadAnual,
    };

    const error = editandoId
      ? await actualizar(editandoId, datos)
      : await guardar(datos);

    if (error) {
      setMensajeGuardado(error);
    } else {
      setNombrePropiedad('');
      setFechaInicioAlquiler('');
      setMensajeGuardado(editandoId ? 'Actualizada ✓' : 'Guardada ✓');
      setEditandoId(null);
    }
  }

  function handleEditar(p: Propiedad) {
    setNombrePropiedad(p.nombre);
    setPrecioCompra(numeroAInput(p.precio_compra));
    setAlquilerMensual(numeroAInput(p.alquiler_mensual));
    setDolarManualActivo(true);
    setDolarManual(numeroAInput(p.dolar_venta));
    setTipoDolar(p.tipo_dolar);
    setFechaInicioAlquiler(p.fecha_inicio_alquiler ?? '');
    setEditandoId(p.id);
    setMensajeGuardado(null);
  }

  function handleCancelarEdicion() {
    setEditandoId(null);
    setMensajeGuardado(null);
    setNombrePropiedad('');
    setPrecioCompra('0');
    setAlquilerMensual('0');
    setDolarManualActivo(false);
    setDolarManual('');
    setTipoDolar('oficial');
    setFechaInicioAlquiler('');
  }

  return (
    <div className="page">
      {cargandoAuth ? (
        <div className="account-bar">
          <span className="account-bar__status">Cargando sesión…</span>
          <div className="account-bar__actions">
            <button
              type="button"
              className="help-btn"
              title="Ayuda"
              onClick={() => setMostrarAyuda(true)}
            >
              ?
            </button>
          </div>
        </div>
      ) : session ? (
        <div className="account-bar">
          <div className="account-bar__identity">
            <span className="account-bar__status" title={session.user.email}>
              {session.user.email ?? 'Cuenta conectada'}
            </span>
            <span className="plan-badge">{NOMBRE_PLAN[plan]}</span>
          </div>
          <div className="account-bar__actions">
            <button
              type="button"
              className="help-btn"
              title="Ayuda"
              onClick={() => setMostrarAyuda(true)}
            >
              ?
            </button>
            <button type="button" className="btn-small" onClick={signOut}>
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : (
        <div className="account-bar">
          <span className="account-bar__status">No iniciaste sesión</span>
          <div className="account-bar__actions">
            <button
              type="button"
              className="help-btn"
              title="Ayuda"
              onClick={() => setMostrarAyuda(true)}
            >
              ?
            </button>
            <button
              type="button"
              className="btn-small"
              onClick={() => setMostrarAuthForm(true)}
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      )}

      <main className="board">
        <div className="board__header">
          <span className="board__title">Rentabilidad de alquiler</span>
          <span className="board__subtitle">anual</span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="precio">
            Precio de compra (USD)
          </label>
          <div className="field__slot">
            <span className="field__prefix">US$</span>
            <input
              id="precio"
              inputMode="decimal"
              placeholder="47 o 47.000"
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="alquiler">
            Alquiler mensual (ARS)
          </label>
          <div className="field__slot">
            <span className="field__prefix">$</span>
            <input
              id="alquiler"
              inputMode="decimal"
              placeholder="450 o 450.000"
              value={alquilerMensual}
              onChange={(e) => setAlquilerMensual(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="dolar">
            Dólar · venta
          </label>

          {!dolarManualActivo && (
            <div className="auth-panel__tabs" style={{ marginBottom: 10 }}>
              {TIPOS_DOLAR.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={
                    tipoDolar === t ? 'auth-tab auth-tab--active' : 'auth-tab'
                  }
                  onClick={() => setTipoDolar(t)}
                >
                  {NOMBRE_TIPO_DOLAR[t]}
                </button>
              ))}
            </div>
          )}

          <div className="dolar-row">
            <div className="field__slot">
              <span className="field__prefix">$</span>
              <input
                id="dolar"
                inputMode="decimal"
                placeholder="1.535"
                value={
                  dolarManualActivo
                    ? dolarManual
                    : valorAutomatico
                    ? formatoARS(valorAutomatico)
                    : ''
                }
                disabled={!dolarManualActivo}
                onChange={(e) => setDolarManual(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-pressed={dolarManualActivo}
              title={
                dolarManualActivo
                  ? 'Volver a valor automático'
                  : 'Ingresar valor manual'
              }
              onClick={() => {
                if (!dolarManualActivo && valorAutomatico) {
                  setDolarManual(String(valorAutomatico));
                }
                setDolarManualActivo((v) => !v);
              }}
            >
              {dolarManualActivo ? '↺' : '✎'}
            </button>
          </div>
          {!dolarManualActivo && estado === 'cargando' && (
            <p className="dolar-meta">Buscando cotización…</p>
          )}
          {!dolarManualActivo && estado === 'error' && (
            <p className="dolar-meta dolar-meta--error">
              No se pudo obtener el valor automático.{' '}
              <button
                type="button"
                onClick={recargar}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--amber)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  font: 'inherit',
                }}
              >
                Reintentar
              </button>{' '}
              o ingresá el valor manualmente.
            </p>
          )}
          {!dolarManualActivo && estado === 'ok' && (
            <p className="dolar-meta">
              Fuente: DolarAPI, dólar {NOMBRE_TIPO_DOLAR[tipoDolar].toLowerCase()}
            </p>
          )}
        </div>

        <div className="divider" />

        <div
          className={
            'result ' +
            (!hayDatos ? 'result--empty' : esBueno ? 'result--ok' : 'result--alert')
          }
        >
          <div className="result__label">Rentabilidad anual</div>
          <div className="result__value">
            {hayDatos ? `${formatoPorcentaje(resultado.rentabilidadAnual)}%` : '—'}
          </div>
          <div className="result__threshold">
            {hayDatos
              ? esBueno
                ? `Por encima del ${UMBRAL_RENTABILIDAD}% de referencia`
                : `Por debajo del ${UMBRAL_RENTABILIDAD}% de referencia`
              : 'Completá los datos para calcular'}
          </div>
          {hayDatos && (
            <div className="result__usd">
              US$ {formatoUSD(resultado.alquilerMensualUSD)} /mes · US${' '}
              {formatoUSD(resultado.alquilerAnualUSD)} /año
            </div>
          )}
        </div>

        <p className="footer-note">
          47 se interpreta como 47.000. Escribí el número completo si querés un
          valor distinto.
        </p>

        <p className="footer-note" style={{ marginTop: 6 }}>
          <button
            type="button"
            className="link-btn"
            onClick={() => setMostrarLegal(true)}
          >
            Términos y Privacidad
          </button>
        </p>

        <div className="divider" />

        {cargandoAuth ? null : session ? (
          <div className="save-section">
            <div className="save-section__header">
              <span className="board__title" style={{ fontSize: 14 }}>
                {editandoId ? 'Editar propiedad' : 'Guardar propiedad'}
              </span>
              {editandoId && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={handleCancelarEdicion}
                >
                  Cancelar edición
                </button>
              )}
            </div>

            {hayDatos && (
              <>
                <div className="field">
                  <div className="field__slot">
                    <input
                      placeholder="Nombre de la propiedad (opcional)"
                      value={nombrePropiedad}
                      onChange={(e) => setNombrePropiedad(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="fecha-inicio">
                    Inicio del alquiler (opcional)
                  </label>
                  <div className="field__slot">
                    <input
                      id="fecha-inicio"
                      type="date"
                      value={fechaInicioAlquiler}
                      onChange={(e) => setFechaInicioAlquiler(e.target.value)}
                    />
                  </div>
                  <p className="dolar-meta">
                    Si la completás, vas a poder comparar los pagos reales
                    contra esta previsión desde Mis propiedades.
                  </p>
                </div>
              </>
            )}

            <button
              type="button"
              className="primary-btn"
              disabled={
                !hayDatos ||
                (!editandoId && propiedades.length >= limitePropiedades)
              }
              onClick={handleGuardar}
            >
              {editandoId ? 'Actualizar propiedad' : 'Guardar esta propiedad'}
            </button>

            {mensajeGuardado && <p className="dolar-meta">{mensajeGuardado}</p>}

            {!editandoId && (
              <p className="dolar-meta">
                {propiedades.length}/{formatoLimite(limitePropiedades)} propiedades
                de tu plan
              </p>
            )}
          </div>
        ) : (
          <div className="auth-prompt">
            <p className="auth-prompt__text">
              ¿Querés guardar esta propiedad? Iniciá sesión.
            </p>
            <button
              type="button"
              className="primary-btn"
              onClick={() => setMostrarAuthForm(true)}
            >
              Iniciar sesión / Crear cuenta
            </button>
          </div>
        )}
      </main>

      {!cargandoAuth && session && (
        <section className="properties-section">
          <div className="save-section__header">
            <span className="board__title" style={{ fontSize: 14 }}>
              Mis propiedades
            </span>
            <span className="dolar-meta" style={{ marginTop: 0 }}>
              {propiedades.length}/{formatoLimite(limitePropiedades)}
            </span>
          </div>

          <div className="save-section__header">
            <span className="dolar-meta" style={{ marginTop: 0 }}>
              {formatoEstadoSuscripcion(suscripcion)}
            </span>
            <button
              type="button"
              className="link-btn"
              onClick={() => setMostrarPlanes(true)}
            >
              {plan === 'pro' ? 'Ver planes' : 'Mejorar plan'}
            </button>
          </div>

          {propiedades.length === 0 ? (
            <p className="dolar-meta">Todavía no guardaste ninguna propiedad.</p>
          ) : (
            <ul className="saved-list">
              {propiedades.map((p) => (
                <li key={p.id} className="saved-list__item">
                  <button
                    type="button"
                    className="saved-list__info"
                    onClick={() => setPropiedadDetalleId(p.id)}
                  >
                    <div className="saved-list__name">{p.nombre}</div>
                    <div className="saved-list__meta">
                      US$ {formatoUSD(p.precio_compra)} · $
                      {formatoARS(p.alquiler_mensual)}/mes
                    </div>
                  </button>
                  <div className="saved-list__actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Editar"
                      onClick={() => handleEditar(p)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Borrar"
                      onClick={() =>
                        setConfirmandoBorrado({ id: p.id, paso: 1 })
                      }
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {mostrarAuthForm && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarAuthForm(false)}
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <AuthForm onCancel={() => setMostrarAuthForm(false)} />
          </div>
        </div>
      )}

      {mostrarAyuda && <HelpModal onClose={() => setMostrarAyuda(false)} />}

      {mostrarLegal && <LegalModal onClose={() => setMostrarLegal(false)} />}

      {mostrarPlanes && session && (
        <PricingModal planActual={plan} onClose={() => setMostrarPlanes(false)} />
      )}

      {propiedadDetalle && (
        <PropertyDetail
          propiedad={propiedadDetalle}
          onClose={() => setPropiedadDetalleId(null)}
          onGuardarFechaInicio={(fecha) =>
            actualizar(propiedadDetalle.id, { fecha_inicio_alquiler: fecha })
          }
          tieneSeguimiento={tieneSeguimientoPagos}
          onVerPlanes={() => setMostrarPlanes(true)}
        />
      )}

      {confirmandoBorrado?.paso === 1 && (
        <ConfirmDialog
          titulo="Borrar propiedad"
          mensaje="¿Seguro que querés borrar esta propiedad? Esta acción no se puede deshacer."
          textoConfirmar="Continuar"
          onCancelar={() => setConfirmandoBorrado(null)}
          onConfirmar={() =>
            setConfirmandoBorrado((actual) =>
              actual ? { ...actual, paso: 2 } : null
            )
          }
        />
      )}

      {confirmandoBorrado?.paso === 2 && (
        <ConfirmDialog
          titulo="Confirmá el borrado"
          mensaje="Esto también borra todo el historial de pagos registrados de esta propiedad. ¿Confirmás definitivamente?"
          textoConfirmar="Borrar definitivamente"
          onCancelar={() => setConfirmandoBorrado(null)}
          onConfirmar={() => {
            borrar(confirmandoBorrado.id);
            setConfirmandoBorrado(null);
          }}
        />
      )}
    </div>
  );
}
