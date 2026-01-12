import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/database/client';
import { db } from '@/integrations/database/client';
import { config } from '@/lib/config';
type AppRole = 'admin' | 'user' | 'auditor';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  job_title: string | null;
  is_active?: boolean;
  business_unit_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isAuditor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) {
      // If the account is deactivated, immediately sign the user out.
      if ((data as Profile).is_active === false) {
        if (config.isSaas()) {
          await supabase.auth.signOut();
        } else {
          await db.auth.signOut();
        }
        setUser(null);
        setSession(null);
        setProfile(null);
        setRoles([]);
        return;
      }

      setProfile(data as Profile);
    }
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (!error && data) {
      setRoles((data as Array<{ role: string }>).map((r) => r.role as AppRole));
    }
  };

  useEffect(() => {
    // Set up auth state listener first - use Supabase for SaaS, our adapter for self-hosted
    if (config.isSaas()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setSession(session as Session | null);
          setUser((session?.user as User) ?? null);

          // Defer profile/roles fetch to avoid deadlock
          if (session?.user) {
            setTimeout(() => {
              fetchProfile(session.user.id);
              fetchRoles(session.user.id);
            }, 0);
          } else {
            setProfile(null);
            setRoles([]);
          }

          if (event === 'SIGNED_OUT') {
            setLoading(false);
          }
        }
      );

      // Check for existing session
      supabase.auth.getSession().then(({ data }) => {
        const session = (data as { session: Session | null }).session;
        setSession(session);
        setUser((session?.user as User) ?? null);

        if (session?.user) {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
        }

        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Self-hosted mode - use the unified adapter
      const { data: { subscription } } = db.auth.onAuthStateChange(
        (event, session) => {
          setSession(session as unknown as Session);
          setUser(session?.user as unknown as User ?? null);

          if (session?.user) {
            setTimeout(() => {
              fetchProfile(session.user.id);
              fetchRoles(session.user.id);
            }, 0);
          } else {
            setProfile(null);
            setRoles([]);
          }

          if (event === 'SIGNED_OUT') {
            setLoading(false);
          }
        }
      );

      // Check for existing session
      db.auth.getSession().then(({ data: { session } }) => {
        setSession(session as unknown as Session);
        setUser(session?.user as unknown as User ?? null);

        if (session?.user) {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
        }

        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    // Use the unified adapter interface (db and supabase are the same here)
    const { error } = await db.auth.signUp(email, password, {
      emailRedirectTo: redirectUrl,
      data: { full_name: fullName },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (config.isSaas()) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password });
      return { error };
    }
  };

  const signOut = async () => {
    if (config.isSaas()) {
      await supabase.auth.signOut();
    } else {
      await db.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isAuditor = hasRole('auditor');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        signUp,
        signIn,
        signOut,
        hasRole,
        isAdmin,
        isAuditor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
