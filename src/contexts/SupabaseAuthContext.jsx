
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const SupabaseAuthContext = createContext();

export const useAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

export const SupabaseAuthProvider = ({ children }) => {
  const { toast } = useToast();
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
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Catched error fetching user profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const getInitialSession = async () => {
        try {
            const { data: { session: initialSession }, error } = await supabase.auth.getSession();
            if (error) {
                console.error("Error getting initial session:", error.message);
                if (error.message.includes("Invalid Refresh Token")) {
                    await supabase.auth.signOut();
                }
                setSession(null);
                setUser(null);
            } else {
                setSession(initialSession);
                if (initialSession?.user) {
                    const profile = await fetchUserProfile(initialSession.user);
                    setUser(profile);
                } else {
                    setUser(null);
                }
            }
        } catch (e) {
            console.error("Catastrophic error in getInitialSession:", e);
            setSession(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };
    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        setSession(session);
        if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(session);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    }
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    } else {
      setUser(null);
      setSession(null);
    }
    return { error };
  };

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
      const profileData = {
        ...userData,
        auth_id: authData.user.id,
        email: userData.email,
        is_verified: userData.role === 'patient',
        status: 'active',
      };
      delete profileData.password;

      const { data: newProfile, error: profileError } = await supabase
        .from('users')
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        toast({ variant: "destructive", title: "Profile Creation Failed", description: profileError.message });
        await supabase.auth.signOut();
        return { error: profileError };
      }
      
      if (newProfile.role !== 'doctor') {
        setUser(newProfile);
      }
      return { user: newProfile };
    }
    return {};
  };
  
  const sendPasswordResetEmail = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
        toast({ title: "Check your email", description: "A password reset link has been sent to your email address." });
    }
    return { data, error };
  };

  const updateUserPassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
        toast({ title: "Success", description: "Your password has been updated successfully." });
    }
    return { data, error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    signUp,
    sendPasswordResetEmail,
    updateUserPassword,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};
