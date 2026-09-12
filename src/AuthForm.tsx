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
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    setEnviando(true);

    const error =
      modo === 'login' ? await signIn(email, password) : await signUp(email, password);

    setEnviando(false);

    if (error) {
      setMensaje(error);
    } else if (modo === 'signup') {
      setMensaje('Cuenta creada. Revisá tu email para confirmar (si tu proyecto lo requiere).');
    }
  }

  async function handleGoogle() {
    setMensaje(null);
    const error = await signInWithGoogle();
    if (error) setMensaje(error);
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
          onClick={() => setModo('login')}
        >
          Ingresar
        </button>
        <button
          type="button"
          className={modo === 'signup' ? 'auth-tab auth-tab--active' : 'auth-tab'}
          onClick={() => setModo('signup')}
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

        {mensaje && <p className="dolar-meta dolar-meta--error">{mensaje}</p>}

        <button type="submit" className="primary-btn" disabled={enviando}>
          {enviando ? 'Un momento…' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  );
}
