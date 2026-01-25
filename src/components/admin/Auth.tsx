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

  return (
    <div class="auth-container">
      <h2>{isSignUp ? 'Create Admin Account' : 'Admin Login'}</h2>
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
