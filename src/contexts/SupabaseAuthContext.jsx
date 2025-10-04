import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom'; // যদি তুমি React Router use করো

const SupabaseAuthContext = createContext();

export const useAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) throw new Error('useAuth must be used within a SupabaseAuthProvider');
  return context;
};

export const SupabaseAuthProvider = ({ children }) => {
  const { toast } = useToast();
  const navigate = useNavigate(); // Next.js না হলে React Router
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (authUser) => {
    if (!authUser) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();
      if (error && error.code !== 'PGRST116') return null;
      return data || null;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        const initialSession = data?.session || null;

        if (error) {
          console.error(error);
          await globalSignOut();
        } else {
          setSession(initialSession);
          if (initialSession?.user) {
            const profile = await fetchUserProfile(initialSession.user);
            setUser(profile);
          }
        }
      } catch (err) {
        console.error(err);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        setSession(session);
        if (session?.user) setUser(await fetchUserProfile(session.user));
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        navigate('/login');
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        if (session?.user) setUser(await fetchUserProfile(session.user));
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, [fetchUserProfile, navigate]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ variant: "destructive", title: "Login Failed", description: error.message });
    if (data?.user) setUser(await fetchUserProfile(data.user));
    setSession(data?.session || null);
    return { data, error };
  };

  const globalSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ global: true });
      setUser(null);
      setSession(null);
      if (!error) navigate('/login');
      return { error };
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Logout Failed", description: err.message });
      return { error: err };
    }
  };

  const signOut = globalSignOut;

  const signUp = async (userData) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });

    if (authError) {
      toast({ variant: "destructive", title: "Registration Failed", description: authError.message });
      return { error: authError };
    }

    if (authData.user) {
      const profileData = { ...userData, auth_id: authData.user.id, email: userData.email, is_verified: userData.role === 'patient', status: 'active' };
      delete profileData.password;

      const { data: newProfile, error: profileError } = await supabase.from('users').insert(profileData).select().single();
      if (profileError) {
        await globalSignOut();
        return { error: profileError };
      }
      setUser(newProfile);
      return { user: newProfile };
    }
    return {};
  };

  const sendPasswordResetEmail = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    return { data, error };
  };

  const updateUserPassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) toast({ title: "Success", description: "Password updated successfully." });
    return { data, error };
  };

  const value = useMemo(() => ({ user, session, loading, signIn, signOut, signUp, sendPasswordResetEmail, updateUserPassword }), [user, session, loading]);

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
};
