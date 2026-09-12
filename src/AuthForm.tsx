import { useState } from 'react';
import { useAuth } from './useAuth';

interface AuthFormProps {
  onCancel?: () => void;
}

export function AuthForm({ onCancel }: AuthFormProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [modo, setModo] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function limpiarMensajes() {
    setError(null);
    setMensajeExito(null);
  }

  function cambiarModo(nuevoModo: 'login' | 'signup') {
    setModo(nuevoModo);
    limpiarMensajes();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    limpiarMensajes();
    setEnviando(true);

    const err =
      modo === 'login' ? await signIn(email, password) : await signUp(email, password);

    setEnviando(false);

    if (err) {
      setError(err);
    } else if (modo === 'signup') {
      setMensajeExito(
        'Cuenta creada. Revisá tu email para confirmar (si tu proyecto lo requiere).'
      );
    }
  }

  async function handleGoogle() {
    limpiarMensajes();
    const err = await signInWithGoogle();
    if (err) setError(err);
  }

  return (
    <div className="auth-panel">
      {onCancel && (
        <div className="save-section__header">
          <span className="board__title" style={{ fontSize: 14 }}>
            Iniciar sesión
          </span>
          <button type="button" className="link-btn" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      )}

      <div className="auth-panel__tabs">
        <button
          type="button"
          className={modo === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab'}
          onClick={() => cambiarModo('login')}
        >
          Ingresar
        </button>
        <button
          type="button"
          className={modo === 'signup' ? 'auth-tab auth-tab--active' : 'auth-tab'}
          onClick={() => cambiarModo('signup')}
        >
          Crear cuenta
        </button>
      </div>

      <button type="button" className="google-btn" onClick={handleGoogle}>
        Continuar con Google
      </button>

      <div className="auth-divider">
        <span>o con email</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field__label" htmlFor="email">
            Email
          </label>
          <div className="field__slot">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="password">
            Contraseña
          </label>
          <div className="field__slot">
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="dolar-meta dolar-meta--error">{error}</p>}
        {mensajeExito && (
          <p className="dolar-meta dolar-meta--success">{mensajeExito}</p>
        )}

        <button type="submit" className="primary-btn" disabled={enviando}>
          {enviando ? 'Un momento…' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  );
}
