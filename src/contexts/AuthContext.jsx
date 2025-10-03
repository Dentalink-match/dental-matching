import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (authUser) => {
    if (!authUser) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single();
    if (error && error.code !== 'PGRST116') { // PGRST116: 0 rows
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data;
  }, []);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    if (session?.user) {
      const profile = await fetchUserProfile(session.user);
      setUser(profile);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [fetchUserProfile]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const login = async (email, password, role) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
      return;
    }

    if (authData.user) {
      const profile = await fetchUserProfile(authData.user);
      if (profile && profile.role === role) {
        setUser(profile);
        setSession(authData.session);
      } else {
        await supabase.auth.signOut();
        toast({ variant: "destructive", title: "Login Failed", description: "Invalid role for this user." });
      }
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    } else {
      setUser(null);
      setSession(null);
    }
  };

  const register = async (userData) => {
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
        return { error: profileError };
      }
      
      if (newProfile.role !== 'doctor') {
        setUser(newProfile);
      }
      return { user: newProfile };
    }
    return {};
  };

  const createUserByAdmin = async (userData) => {
    // This function might need adjustment depending on whether admin creates user with password or sends invite
    // For now, assuming it's similar to register but without login
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });

    if (authError) {
      toast({ variant: "destructive", title: "User Creation Failed", description: authError.message });
      return { error: authError };
    }

    if (authData.user) {
      const profileData = {
        ...userData,
        auth_id: authData.user.id,
        is_verified: userData.role === 'patient' || userData.role === 'admin',
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
        return { error: profileError };
      }
      return { user: newProfile };
    }
    return {};
  };
  
  const updateUser = async (updatedData) => {
    const { data, error } = await supabase
      .from('users')
      .update(updatedData)
      .eq('id', updatedData.id)
      .select()
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } else if (user && user.id === data.id) {
      setUser(data);
    }
    return { data, error };
  };

  const changePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ variant: "destructive", title: "Password Change Failed", description: error.message });
    } else {
      toast({ title: "Success", description: "Password changed successfully." });
    }
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    login,
    logout,
    register,
    updateUser,
    changePassword,
    createUserByAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};