import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const SupabaseAuthContext = createContext();

export const useAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) throw new Error('useAuth must be used within a SupabaseAuthProvider');
  return context;
};

export const SupabaseAuthProvider = ({ children }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchUserProfile = useCallback(async (authUser) => {
    if (!authUser) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.error(`Error fetching profile for ${authUser.id}:`, error);
        return null;
      }
      return data || null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  }, []);

  // Initialize session and listen for auth changes
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting initial session:", error.message);
          if (error.message.includes("Invalid Refresh Token")) {
            await globalSignOut();
          }
        } else {
          setSession(initialSession);
          if (initialSession?.user) {
            const profile = await fetchUserProfile(initialSession.user);
            setUser(profile);
          }
        }
      } catch (err) {
        console.error("Error initializing session:", err);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();

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
        router.push('/login');
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, router]);

  // SignIn
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
      return { data, error };
    }
    if (data?.user) {
      const profile = await fetchUserProfile(data.user);
      setUser(profile);
      setSession(data.session);
    }
    return { data, error };
  };

  // Global SignOut helper
  const globalSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ global: true });
      setUser(null);
      setSession(null);
      if (error) {
        toast({ variant: "destructive", title: "Logout Failed", description: error.message });
      } else {
        toast({ title: "Logged Out", description: "You have been logged out from all devices." });
        router.push('/login');
      }
      return { error };
    } catch (err) {
      console.error("Error during global sign out:", err);
      toast({ variant: "destructive", title: "Logout Failed", description: err.message });
      return { error: err };
    }
  };

  // SignOut function calls globalSignOut
  const signOut = globalSignOut;

  // SignUp
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
        await globalSignOut();
        return { error: profileError };
      }

      if (newProfile.role !== 'doctor') setUser(newProfile);
      return { user: newProfile };
    }
    return {};
  };

  // Password Reset
  const sendPasswordResetEmail = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Check your email", description: "Password reset link sent." });
    }
    return { data, error };
  };

  // Update Password
  const updateUserPassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Password updated successfully." });
    }
    return { data, error };
  };

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signOut,
    signUp,
    sendPasswordResetEmail,
    updateUserPassword,
  }), [user, session, loading]);

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};
