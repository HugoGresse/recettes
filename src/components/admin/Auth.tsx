import { h } from 'preact';
import { useState } from 'preact/hooks';
import { supabase } from '../../lib/supabase';

export default function Auth({ onLogin }: { onLogin: (user: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Check your email for the login link!');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLogin(data.user);
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.href, // Redirect back to current page
          scopes: provider === 'github' ? 'repo' : undefined,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div class="auth-container">
      <h2>{isSignUp ? 'Create Admin Account' : 'Admin Login'}</h2>
      
      <div class="oauth-buttons">
        <button 
          onClick={() => handleOAuth('google')} 
          disabled={loading} 
          class="btn-oauth btn-google"
          type="button"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.859 L -8.284 53.859 C -8.534 55.199 -9.304 56.279 -10.634 57.179 L -10.634 60.009 L -6.634 60.009 C -4.314 57.859 -2.974 54.679 -2.974 51.049 L -3.264 51.509 Z" /><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.644 57.359 C -11.724 58.089 -13.094 58.519 -14.754 58.519 C -17.884 58.519 -20.534 56.409 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" /><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" /><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.449 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.069 -17.884 43.989 -14.754 43.989 Z" /></g></svg>
          Sign in with Google
        </button>
        <button 
          onClick={() => handleOAuth('github')} 
          disabled={loading} 
          class="btn-oauth btn-github"
          type="button"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          Sign in with GitHub
        </button>
      </div>

      <div class="divider">
        <span>or use email</span>
      </div>

      <form onSubmit={handleAuth} class="auth-form">
        <div class="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onInput={(e) => setEmail(e.currentTarget.value)}
            required
            class="input-field"
          />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            required
            class="input-field"
          />
        </div>
        <button type="submit" disabled={loading} class="btn-primary">
          {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>
      
      <p class="auth-toggle">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button onClick={() => setIsSignUp(!isSignUp)} class="btn-link">
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>

      {message && <div class="message">{message}</div>}

      <style>{`
        .auth-container {
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
          background: var(--color-surface-elevated);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .oauth-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .btn-oauth {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-primary);
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        .btn-oauth:hover {
          background: var(--color-surface-hover);
        }
        .btn-google:hover {
          border-color: #4285F4;
        }
        .btn-github:hover {
          border-color: #24292e;
        }
        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1rem 0;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--color-border);
        }
        .divider span {
          padding: 0 0.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .input-field {
          padding: 0.75rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-primary);
        }
        .btn-primary {
          background: var(--color-primary);
          color: white;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .auth-toggle {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.875rem;
        }
        .btn-link {
          background: none;
          border: none;
          color: var(--color-primary);
          cursor: pointer;
          text-decoration: underline;
        }
        .message {
          margin-top: 1rem;
          padding: 0.75rem;
          background: var(--color-surface-hover);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
