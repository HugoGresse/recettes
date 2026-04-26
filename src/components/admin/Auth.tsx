import { h } from "preact";
import { useState } from "preact/hooks";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function Auth({ onLogin }: { onLogin: (user: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGoogle = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      onLogin(result.user);
    } catch (error: any) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div class="auth-container">
      <h2>Admin Login</h2>

      <button
        onClick={handleGoogle}
        disabled={loading}
        class="btn-oauth btn-google"
        type="button"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.859 L -8.284 53.859 C -8.534 55.199 -9.304 56.279 -10.634 57.179 L -10.634 60.009 L -6.634 60.009 C -4.314 57.859 -2.974 54.679 -2.974 51.049 L -3.264 51.509 Z" />
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.644 57.359 C -11.724 58.089 -13.094 58.519 -14.754 58.519 C -17.884 58.519 -20.534 56.409 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.449 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.069 -17.884 43.989 -14.754 43.989 Z" />
          </g>
        </svg>
        {loading ? "Signing in..." : "Sign in with Google"}
      </button>

      {message && <div class="message">{message}</div>}

      <style>{`
        .auth-container {
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
          background: var(--color-surface-elevated);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 1rem;
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
          border-color: #4285F4;
        }
        .btn-oauth:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .message {
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
