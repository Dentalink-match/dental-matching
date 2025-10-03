import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate, useParams } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { toast } from '@/components/ui/use-toast';
    import { ArrowLeft, Save, UserCog, DollarSign, Building, AirVent, Sparkles, UserCheck, Scan, Cpu } from 'lucide-react';
    import { Switch } from '@/components/ui/switch';

    const AdminUserProfile = () => {
      const navigate = useNavigate();
      const { userId } = useParams();
      const { users, updateUser } = useData();
      const [userData, setUserData] = useState(null);
      const [loading, setLoading] = useState(false);

      useEffect(() => {
        const userToEdit = users.find(u => u.id === userId);
        if (userToEdit) {
          setUserData({
            ...userToEdit,
            chamberName: userToEdit.chamber_name,
            chamberLocation: userToEdit.chamber_location,
            chamberAddress: userToEdit.chamber_address,
            licenseNumber: userToEdit.license_number,
            chamberDetails: userToEdit.chamber_details || {},
          });
        } else {
          toast({ title: "Error", description: "User not found.", variant: "destructive" });
          navigate('/admin/dashboard');
        }
      }, [userId, users, navigate]);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          const { chamberDetails, ...rest } = userData;
          const payload = {
            ...rest,
            chamber_details: chamberDetails,
          };
          await updateUser(payload);
          toast({
            title: "Profile Updated Successfully!",
            description: `${userData.name}'s profile has been saved.`,
          });
          navigate('/admin/dashboard');
        } catch (error) {
          toast({
            title: "Update Failed",
            description: error.message || "Something went wrong. Please try again.",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      };

      const handleChange = (field, value) => {
        setUserData(prev => ({ ...prev, [field]: value }));
      };
      
      const handleCommissionChange = (field, value) => {
          const newCommission = { ...userData.commission, [field]: value };
          if (field === 'type') {
              newCommission.rate = ''; // Reset rate when type changes
          }
          setUserData(prev => ({...prev, commission: newCommission }));
      }

      const handleChamberDetailsChange = (field, value) => {
        setUserData(prev => ({
          ...prev,
          chamberDetails: {
            ...prev.chamberDetails,
            [field]: value
          }
        }));
      };

      if (!userData) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        );
      }

      const isDoctor = userData.role === 'doctor';

      return (
        <>
          <Helmet>
            <title>Edit Profile: {userData.name} - DentaLink Admin</title>
            <meta name="description" content={`Manage user profiles from the admin dashboard.`} />
          </Helmet>

          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Card className="shadow-2xl border-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <UserCog className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle className="text-2xl font-bold">Edit User Profile</CardTitle>
                          <CardDescription>Editing profile for {userData.name}</CardDescription>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate('/admin/dashboard')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input id="name" value={userData.name} onChange={(e) => handleChange('name', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" value={userData.email} onChange={(e) => handleChange('email', e.target.value)} required />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" value={userData.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gender">Gender</Label>
                          <Select value={userData.gender || ''} onValueChange={(value) => handleChange('gender', value)}>
                            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Full Address</Label>
                        <Textarea id="address" value={userData.address || ''} onChange={(e) => handleChange('address', e.target.value)} />
                      </div>

                      {!isDoctor && (
                        <div className="space-y-2">
                          <Label htmlFor="age">Age</Label>
                          <Input id="age" type="number" value={userData.age || ''} onChange={(e) => handleChange('age', e.target.value)} />
                        </div>
                      )}

                      {isDoctor && (
                        <>
                          <div className="border-t my-6"></div>
                          <h3 className="text-lg font-semibold text-gray-700">Doctor Information</h3>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="specialization">Specialization</Label>
                              <Input id="specialization" value={userData.specialization || ''} onChange={(e) => handleChange('specialization', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="degree">Degree</Label>
                              <Input id="degree" value={userData.degree || ''} onChange={(e) => handleChange('degree', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="experience">Experience (Years)</Label>
                              <Input id="experience" type="number" value={userData.experience || ''} onChange={(e) => handleChange('experience', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="chamberName">Chamber Name</Label>
                              <Input id="chamberName" value={userData.chamberName || ''} onChange={(e) => handleChange('chamberName', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="chamberLocation">Chamber Location</Label>
                              <Input id="chamberLocation" value={userData.chamberLocation || ''} onChange={(e) => handleChange('chamberLocation', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="licenseNumber">License Number</Label>
                              <Input id="licenseNumber" value={userData.licenseNumber || ''} onChange={(e) => handleChange('licenseNumber', e.target.value)} />
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
                              <Switch id="hasAC" checked={userData.chamberDetails?.hasAC || false} onCheckedChange={(val) => handleChamberDetailsChange('hasAC', val)} />
                              <Label htmlFor="hasAC" className="flex items-center"><AirVent className="h-4 w-4 mr-2 text-blue-500"/> A/C</Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <Switch id="isHygienic" checked={userData.chamberDetails?.isHygienic || false} onCheckedChange={(val) => handleChamberDetailsChange('isHygienic', val)} />
                              <Label htmlFor="isHygienic" className="flex items-center"><Sparkles className="h-4 w-4 mr-2 text-yellow-500"/> Hygienic</Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <Switch id="hasAssistant" checked={userData.chamberDetails?.hasAssistant || false} onCheckedChange={(val) => handleChamberDetailsChange('hasAssistant', val)} />
                              <Label htmlFor="hasAssistant" className="flex items-center"><UserCheck className="h-4 w-4 mr-2 text-green-500"/> Assistant</Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <Switch id="hasXray" checked={userData.chamberDetails?.hasXray || false} onCheckedChange={(val) => handleChamberDetailsChange('hasXray', val)} />
                              <Label htmlFor="hasXray" className="flex items-center"><Scan className="h-4 w-4 mr-2 text-gray-600"/> X-Ray</Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <Switch id="hasModernEquipment" checked={userData.chamberDetails?.hasModernEquipment || false} onCheckedChange={(val) => handleChamberDetailsChange('hasModernEquipment', val)} />
                              <Label htmlFor="hasModernEquipment" className="flex items-center"><Cpu className="h-4 w-4 mr-2 text-purple-500"/> Modern Equip.</Label>
                            </div>
                          </div>

                          <div className="border-t my-6"></div>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-6 w-6 text-gray-600"/>
                            <h3 className="text-lg font-semibold text-gray-700">Individual Commission Settings</h3>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">Override global commission settings for this doctor.</p>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="commissionType">Commission Type</Label>
                              <Select value={userData.commission?.type || 'default'} onValueChange={(value) => handleCommissionChange('type', value === 'default' ? '' : value)}>
                                <SelectTrigger><SelectValue placeholder="Use Global Default" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">Use Global Default</SelectItem>
                                  <SelectItem value="fixed">Fixed</SelectItem>
                                  <SelectItem value="percentage">Percentage</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {userData.commission?.type && (
                                 <div className="space-y-2">
                                    <Label htmlFor="commissionRate">Commission Rate ({userData.commission.type === 'fixed' ? '৳' : '%'})</Label>
                                    <Input id="commissionRate" type="number" value={userData.commission.rate || ''} onChange={(e) => handleCommissionChange('rate', e.target.value)} />
                                 </div>
                            )}
                          </div>
                        </>
                      )}

                      <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>
                        {loading ? 'Saving...' : <div className="flex items-center justify-center"><Save className="h-4 w-4 mr-2" /><span>Save Changes</span></div>}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </>
      );
    };

    export default AdminUserProfile;