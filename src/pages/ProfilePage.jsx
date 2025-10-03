import React, { useState, useEffect, useRef } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { toast } from '@/components/ui/use-toast';
    import { ArrowLeft, Save, UserCog, KeyRound, User, Mail, Phone, Home, GraduationCap, Star, Calendar, Users, Hash, Camera, Building, AirVent, Sparkles, UserCheck, Scan, Cpu } from 'lucide-react';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Switch } from '@/components/ui/switch';

    const ProfilePage = () => {
      const navigate = useNavigate();
      const { user, updateUser, changePassword } = useAuth();
      const [userData, setUserData] = useState(null);
      const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
      const [loading, setLoading] = useState(false);
      const fileInputRef = useRef(null);

      useEffect(() => {
        if (user) {
          setUserData({
            ...user,
            chamberName: user.chamber_name,
            chamberLocation: user.chamber_location,
            chamberAddress: user.chamber_address,
            licenseNumber: user.license_number,
            chamberDetails: user.chamber_details || {},
          });
        } else {
          navigate('/login');
        }
      }, [user, navigate]);

      const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          const { chamberName, chamberLocation, chamberAddress, licenseNumber, chamberDetails, ...rest } = userData;
          const payload = {
            ...rest,
            chamber_name: chamberName,
            chamber_location: chamberLocation,
            chamber_address: chamberAddress,
            license_number: licenseNumber,
            chamber_details: chamberDetails,
          };
          await updateUser(payload);
          toast({
            title: "Profile Updated Successfully!",
            description: "Your profile information has been saved.",
          });
        } catch (error) {
          toast({
            title: "Update Failed",
            description: error.message || "Something went wrong. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          toast({
            title: "Passwords do not match!",
            variant: "destructive",
          });
          return;
        }
        setLoading(true);
        try {
          await changePassword(passwordData.newPassword);
          setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error) {
          // Error is already handled in changePassword function
        } finally {
          setLoading(false);
        }
      };

      const handleChange = (field, value) => {
        setUserData(prev => ({ ...prev, [field]: value }));
      };

      const handleChamberDetailsChange = (field, value) => {
        setUserData(prev => ({
          ...prev,
          chamberDetails: {
            ...prev.chamberDetails,
            [field]: value
          }
        }));
      };

      const handlePasswordChange = (field, value) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));
      };

      const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            handleChange('avatar', reader.result);
          };
          reader.readAsDataURL(file);
        }
      };

      if (!userData) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        );
      }

      const isDoctor = userData.role === 'doctor';
      const dashboardPath = `/${userData.role}/dashboard`;

      return (
        <>
          <Helmet>
            <title>My Profile - DentaLink</title>
            <meta name="description" content="Manage your DentaLink profile and account settings." />
          </Helmet>

          <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Card className="shadow-2xl border-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <UserCog className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle className="text-2xl font-bold">My Profile</CardTitle>
                          <CardDescription>View and manage your account details.</CardDescription>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(dashboardPath)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="profile">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">
                          <User className="h-4 w-4 mr-2" />
                          Edit Profile
                        </TabsTrigger>
                        <TabsTrigger value="password">
                          <KeyRound className="h-4 w-4 mr-2" />
                          Change Password
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="profile" className="pt-6">
                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="relative group">
                              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                                <AvatarImage src={userData.avatar} alt={userData.name} />
                                <AvatarFallback className="text-4xl">
                                  {userData.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm group-hover:bg-white"
                                onClick={() => fileInputRef.current.click()}
                              >
                                <Camera className="h-4 w-4" />
                              </Button>
                              <Input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarChange}
                              />
                            </div>
                          </div>

                           <div className="grid md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                              <Label htmlFor="name">Full Name</Label>
                              <div className="relative"><User className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="name" value={userData.name} onChange={(e) => handleChange('name', e.target.value)} required className="pl-10"/></div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email">Email</Label>
                               <div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="email" type="email" value={userData.email} onChange={(e) => handleChange('email', e.target.value)} required className="pl-10"/></div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="phone">Phone Number</Label>
                               <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="phone" value={userData.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} className="pl-10"/></div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gender">Gender</Label>
                              <Select value={userData.gender || ''} onValueChange={(value) => handleChange('gender', value)}><SelectTrigger><Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><SelectValue placeholder="Select gender" className="pl-10"/></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="address">Full Address</Label>
                            <Textarea id="address" value={userData.address || ''} onChange={(e) => handleChange('address', e.target.value)} />
                          </div>

                          {!isDoctor && (
                            <div className="space-y-2">
                              <Label htmlFor="age">Age</Label>
                              <div className="relative"><Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="age" type="number" value={userData.age || ''} onChange={(e) => handleChange('age', e.target.value)} className="pl-10"/></div>
                            </div>
                          )}

                          {isDoctor && (
                            <>
                              <div className="border-t my-6"></div>
                              <h3 className="text-lg font-semibold text-gray-700">Professional Information</h3>
                              <div className="grid md:grid-cols-2 gap-6">
                                 <div className="space-y-2">
                                  <Label htmlFor="specialization">Specialization</Label>
                                   <div className="relative"><Star className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="specialization" value={userData.specialization || ''} onChange={(e) => handleChange('specialization', e.target.value)} className="pl-10"/></div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="degree">Degree</Label>
                                   <div className="relative"><GraduationCap className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="degree" value={userData.degree || ''} onChange={(e) => handleChange('degree', e.target.value)} className="pl-10"/></div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="experience">Experience (Years)</Label>
                                   <div className="relative"><Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="experience" type="number" value={userData.experience || ''} onChange={(e) => handleChange('experience', e.target.value)} className="pl-10"/></div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="chamberName">Chamber Name</Label>
                                   <div className="relative"><Home className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="chamberName" value={userData.chamberName || ''} onChange={(e) => handleChange('chamberName', e.target.value)} className="pl-10"/></div>
                                </div>
                                 <div className="space-y-2">
                                  <Label htmlFor="chamberLocation">Chamber Location</Label>
                                  <Input id="chamberLocation" value={userData.chamberLocation || ''} onChange={(e) => handleChange('chamberLocation', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="licenseNumber">License Number</Label>
                                  <div className="relative"><Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="licenseNumber" value={userData.licenseNumber || ''} onChange={(e) => handleChange('licenseNumber', e.target.value)} className="pl-10"/></div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea id="bio" value={userData.bio || ''} onChange={(e) => handleChange('bio', e.target.value)} />
                              </div>

                              <div className="border-t my-6"></div>
                              <div className="flex items-center space-x-2">
                                <Building className="h-6 w-6 text-gray-600"/>
                                <h3 className="text-lg font-semibold text-gray-700">Chamber Amenities</h3>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                                  <Switch id="hasAC" checked={userData.chamberDetails?.hasAC} onCheckedChange={(val) => handleChamberDetailsChange('hasAC', val)} />
                                  <Label htmlFor="hasAC" className="flex items-center"><AirVent className="h-4 w-4 mr-2 text-blue-500"/> A/C</Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                                  <Switch id="isHygienic" checked={userData.chamberDetails?.isHygienic} onCheckedChange={(val) => handleChamberDetailsChange('isHygienic', val)} />
                                  <Label htmlFor="isHygienic" className="flex items-center"><Sparkles className="h-4 w-4 mr-2 text-yellow-500"/> Hygienic</Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                                  <Switch id="hasAssistant" checked={userData.chamberDetails?.hasAssistant} onCheckedChange={(val) => handleChamberDetailsChange('hasAssistant', val)} />
                                  <Label htmlFor="hasAssistant" className="flex items-center"><UserCheck className="h-4 w-4 mr-2 text-green-500"/> Assistant</Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                                  <Switch id="hasXray" checked={userData.chamberDetails?.hasXray} onCheckedChange={(val) => handleChamberDetailsChange('hasXray', val)} />
                                  <Label htmlFor="hasXray" className="flex items-center"><Scan className="h-4 w-4 mr-2 text-gray-600"/> X-Ray</Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                                  <Switch id="hasModernEquipment" checked={userData.chamberDetails?.hasModernEquipment} onCheckedChange={(val) => handleChamberDetailsChange('hasModernEquipment', val)} />
                                  <Label htmlFor="hasModernEquipment" className="flex items-center"><Cpu className="h-4 w-4 mr-2 text-purple-500"/> Modern Equip.</Label>
                                </div>
                              </div>
                            </>
                          )}

                          <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>
                            {loading ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                          </Button>
                        </form>
                      </TabsContent>
                      <TabsContent value="password" className="pt-6">
                        <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md mx-auto">
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={(e) => handlePasswordChange('newPassword', e.target.value)} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)} required />
                          </div>
                          <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>
                            {loading ? 'Updating...' : <><KeyRound className="h-4 w-4 mr-2" /> Update Password</>}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </>
      );
    };

    export default ProfilePage;