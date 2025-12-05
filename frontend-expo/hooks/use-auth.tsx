import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useClient, useAuthStateChange } from 'react-supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    console.log('[Auth] Getting initial session');
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        console.log('[Auth] Initial session:', { session, error });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[Auth] Get session exception:', err);
        setLoading(false);
      });
  }, [supabase]);

  // Use react-supabase's auth state change listener
  useAuthStateChange((event, session) => {
    console.log('[Auth] State change:', event, session);
    setSession(session);
    setUser(session?.user ?? null);
  });

  const signIn = async (email: string, password: string) => {
    console.log('[Auth] Attempting sign in for:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('[Auth] Sign in response:', { data, error });

      // Manually update state if sign in was successful
      if (data.session && !error) {
        console.log('[Auth] Manually updating session state');
        setSession(data.session);
        setUser(data.session.user);
      }

      return { error };
    } catch (err) {
      console.error('[Auth] Sign in exception:', err);
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log('[Auth] Attempting sign up for:', email);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      console.log('[Auth] Sign up response:', { data, error });

      // Manually update state if sign up was successful and session exists
      if (data.session && !error) {
        console.log('[Auth] Manually updating session state after sign up');
        setSession(data.session);
        setUser(data.session.user);
      }

      return { error };
    } catch (err) {
      console.error('[Auth] Sign up exception:', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
