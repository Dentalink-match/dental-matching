import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { toast } from '@/components/ui/use-toast';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import { ArrowLeft, Save, Settings, Image as ImageIcon, UserPlus, DollarSign } from 'lucide-react';
    import { supabase } from '@/lib/customSupabaseClient';

    const AdminSettings = () => {
      const navigate = useNavigate();
      const { user, register } = useAuth();
      const { reloadData } = useData();

      const [localSettings, setLocalSettings] = useState({});
      const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'patient' });
      const [logoPreview, setLogoPreview] = useState(null);

      useEffect(() => {
        const fetchSettings = async () => {
          const { data, error } = await supabase.from('settings').select('*').single();
          if (data) {
            setLocalSettings({
              site_name: data.site_name,
              site_logo: data.site_logo,
              monthly_fee: data.monthly_fee,
              commission_type: data.commission_type,
              commission_rate: data.commission_rate,
              premium_visibility_fee: data.premium_visibility_fee,
            });
            setLogoPreview(data.site_logo);
          }
        };
        fetchSettings();
      }, []);

      const handleSettingsChange = (field, value) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
      };

      const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setLogoPreview(reader.result);
            handleSettingsChange('site_logo', reader.result);
          };
          reader.readAsDataURL(file);
        }
      };

      const handleSaveSettings = async () => {
        const { error } = await supabase.from('settings').update(localSettings).eq('id', 1);
        if (error) {
          toast({ title: "Save Failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Settings Saved", description: "Your changes have been saved successfully." });
          if(reloadData) reloadData();
        }
      };

      const handleNewUserChange = (field, value) => {
        setNewUser(prev => ({ ...prev, [field]: value }));
      };

      const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
          const { error } = await register(newUser);
          if (error) throw error;
          toast({ title: "User Created", description: `New ${newUser.role} account for ${newUser.name} has been created.` });
          setNewUser({ name: '', email: '', password: '', role: 'patient' });
          if(reloadData) reloadData();
        } catch (error) {
          // Error toast is already handled in the register function
        }
      };

      if (!user || user.role !== 'admin') {
        navigate('/login');
        return null;
      }

      return (
        <>
          <Helmet>
            <title>Admin Settings - DentaLink</title>
            <meta name="description" content="Manage platform settings." />
          </Helmet>

          <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Settings className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold">Admin Settings</h1>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>

                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="users">Users & Roles</TabsTrigger>
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>General Settings</CardTitle>
                        <CardDescription>Manage basic site information and branding.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="siteName">Site Name</Label>
                          <Input id="siteName" value={localSettings.site_name || ''} onChange={(e) => handleSettingsChange('site_name', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Site Logo</Label>
                          <div className="flex items-center space-x-4">
                            {logoPreview ? (
                              <img src={logoPreview} alt="Site Logo Preview" className="h-16 w-auto bg-gray-200 p-2 rounded-md" />
                            ) : (
                              <div className="h-16 w-16 bg-gray-200 rounded-md flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-gray-500" />
                              </div>
                            )}
                            <Input id="logoUpload" type="file" accept="image/*" onChange={handleLogoChange} className="max-w-xs" />
                          </div>
                        </div>
                        <Button onClick={handleSaveSettings}>
                          <Save className="h-4 w-4 mr-2" />
                          Save General Settings
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="users" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Create New User</CardTitle>
                        <CardDescription>Add new users to the platform and assign their roles.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCreateUser} className="space-y-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="newUserName">Full Name</Label>
                              <Input id="newUserName" value={newUser.name} onChange={(e) => handleNewUserChange('name', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="newUserEmail">Email</Label>
                              <Input id="newUserEmail" type="email" value={newUser.email} onChange={(e) => handleNewUserChange('email', e.target.value)} required />
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="newUserPassword">Password</Label>
                              <Input id="newUserPassword" type="password" value={newUser.password} onChange={(e) => handleNewUserChange('password', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="newUserRole">Role</Label>
                              <Select value={newUser.role} onValueChange={(value) => handleNewUserChange('role', value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="patient">Patient</SelectItem>
                                  <SelectItem value="doctor">Doctor</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button type="submit">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create User
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="financial" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Financial Settings</CardTitle>
                        <CardDescription>Manage platform commission rates and fees.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="commissionType">Global Commission Type</Label>
                            <Select value={localSettings.commission_type || ''} onValueChange={(value) => handleSettingsChange('commission_type', value)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="commissionRate">Global Commission Rate ({localSettings.commission_type === 'fixed' ? '৳' : '%'})</Label>
                            <Input id="commissionRate" type="number" value={localSettings.commission_rate || ''} onChange={(e) => handleSettingsChange('commission_rate', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                            <Label htmlFor="monthlyFee">Doctor Monthly Fee (৳)</Label>
                            <Input id="monthlyFee" type="number" value={localSettings.monthly_fee || ''} onChange={(e) => handleSettingsChange('monthly_fee', e.target.value)} />
                          </div>
                           <div className="space-y-2">
                            <Label htmlFor="premiumFee">Premium Visibility Fee (৳)</Label>
                            <Input id="premiumFee" type="number" value={localSettings.premium_visibility_fee || ''} onChange={(e) => handleSettingsChange('premium_visibility_fee', e.target.value)} />
                          </div>
                        </div>
                        <Button onClick={handleSaveSettings}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Save Financial Settings
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </div>
          </div>
        </>
      );
    };

    export default AdminSettings;