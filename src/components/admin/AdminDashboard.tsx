import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Auth from './Auth';
import Generator from './Generator';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style="text-align: center; padding: 4rem;">Loading...</div>;
  }

  return (
    <div class="admin-dashboard">
      {!user ? (
        <Auth onLogin={(u) => setUser(u)} />
      ) : (
        <div class="dashboard-content">
          <header class="dashboard-header">
            <h2>Admin Dashboard</h2>
            <button
              onClick={() => signOut(auth)}
              class="btn-logout"
            >
              Sign Out
            </button>
          </header>
          <p class="welcome-text">Welcome, {user.email}</p>

          <Generator session={{ user }} />
        </div>
      )}

      <style>{`
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .btn-logout {
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          color: var(--color-text-secondary);
        }
        .btn-logout:hover {
          border-color: var(--color-text-primary);
          color: var(--color-text-primary);
        }
        .welcome-text {
          margin-bottom: 2rem;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
