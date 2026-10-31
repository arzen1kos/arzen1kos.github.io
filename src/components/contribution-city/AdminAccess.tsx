import { useEffect, useState } from 'react';

interface Session {
  authenticated: boolean;
  username: string | null;
}

export function AdminAccess() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/session/', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Session API returned HTTP ${response.status}.`);
        return (await response.json()) as Session;
      })
      .then(setSession)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('Could not check the Django sign-in session.', error);
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <nav className="cc-admin" aria-label="Portfolio administration">
      {session?.authenticated ? (
        <>
          <span>Signed in as {session.username}</span>
          <a className="cc-btn cc-btn-ghost" href="/admin/">Edit portfolio</a>
        </>
      ) : (
        <a className="cc-btn cc-btn-ghost" href="/admin/login/?next=/admin/">Sign in to edit</a>
      )}
    </nav>
  );
}
