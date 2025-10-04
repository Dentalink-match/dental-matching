import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const SupabaseAuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (authUser, abortSignal) => {
    if (!authUser) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single()
        .abortSignal(abortSignal);
      if (error && error.name !== 'AbortError') throw error;
      return data;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching user data:', error);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (isMounted) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (_event === 'SIGNED_OUT') {
            setUserData(null);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    if (user) {
      setLoading(true);
      fetchUserData(user, abortController.signal).then(data => {
        setUserData(data);
        setLoading(false);
      });
    } else {
      setUserData(null);
      setLoading(false);
    }
    return () => {
      abortController.abort();
    };
  }, [user, fetchUserData]);

  const signUp = useCallback(async (email, password, options) => {
    const { error } = await supabase.auth.signUp({ email, password, options });
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }
    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }
    return { data, error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }
    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user: user,
    userData,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }), [user, userData, session, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
