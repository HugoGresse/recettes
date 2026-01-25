import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { supabase } from '../../lib/supabase';
import Auth from './Auth';
import Generator from './Generator';

export default function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style="text-align: center; padding: 4rem;">Loading...</div>;
  }

  return (
    <div class="admin-dashboard">
      {!session ? (
        <Auth onLogin={(user) => setSession({ user })} />
      ) : (
        <div class="dashboard-content">
          <header class="dashboard-header">
            <h2>Admin Dashboard</h2>
            <button 
              onClick={() => supabase.auth.signOut()}
              class="btn-logout"
            >
              Sign Out
            </button>
          </header>
          <p class="welcome-text">Welcome, {session.user.email}</p>
          
          <Generator user={session.user} />
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
