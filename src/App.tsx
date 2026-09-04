import { useMemo, useState } from 'react';
import './App.css';
import { useDolarOficial } from './useDolarOficial';
import {
  UMBRAL_RENTABILIDAD,
  calcularRentabilidad,
  formatoARS,
  formatoPorcentaje,
  formatoUSD,
} from './calc';

function parseInput(valor: string): number {
  const limpio = valor.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

export default function App() {
  const [precioCompra, setPrecioCompra] = useState('47');
  const [alquilerMensual, setAlquilerMensual] = useState('450');
  const [dolarManualActivo, setDolarManualActivo] = useState(false);
  const [dolarManual, setDolarManual] = useState('');

  const { valorAutomatico, estado, recargar } = useDolarOficial();

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

  return (
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
          Dólar oficial · venta
        </label>
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
          <p className="dolar-meta">Fuente: DolarAPI, dólar oficial</p>
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
    </main>
  );
}
