import React, { useState } from 'react';
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
import { ArrowLeft, UserPlus, Stethoscope, User, Mail, Lock, MapPin, GraduationCap, Star, Phone, Home, Hash, Calendar, Users as UsersIcon } from 'lucide-react';

const AdminAddUser = () => {
  const navigate = useNavigate();
  const { adminCreateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('patient');
  const [loading, setLoading] = useState(false);
  
  const initialPatientData = { name: '', email: '', password: '', phone: '', age: '', gender: '', address: '' };
  const initialDoctorData = { name: '', email: '', password: '', phone: '', gender: '', specialization: '', degree: '', experience: '', chamber_name: '', chamber_location: '', chamber_address: '', license_number: '', bio: '' };
  const initialAdminData = { name: '', email: '', password: '', phone: '' };

  const [patientData, setPatientData] = useState(initialPatientData);
  const [doctorData, setDoctorData] = useState(initialDoctorData);
  const [adminData, setAdminData] = useState(initialAdminData);

  const handleSubmit = async (e, role, data, setData, initialData) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      email: data.email,
      password: data.password,
      role: role,
      profileData: { ...data }
    };
    delete payload.profileData.email;
    delete payload.profileData.password;

    const { user, error } = await adminCreateUser(payload);

    if (error) {
      toast({
        title: "Creation Failed",
        description: error.message || "Something went wrong.",
        variant: "destructive"
      });
    } else if (user) {
      toast({
        title: "User Created Successfully!",
        description: `Account for ${user.name} has been created.`,
      });
      setData(initialData);
      navigate('/admin/dashboard');
    }
    setLoading(false);
  };

  const handlePatientChange = (field, value) => setPatientData(prev => ({ ...prev, [field]: value }));
  const handleDoctorChange = (field, value) => setDoctorData(prev => ({ ...prev, [field]: value }));
  const handleAdminChange = (field, value) => setAdminData(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <Helmet>
        <title>Add New User - DentaLink Admin</title>
        <meta name="description" content="Create new user accounts from the admin dashboard." />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Card className="shadow-2xl border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserPlus className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle className="text-2xl font-bold">Create New User</CardTitle>
                      <CardDescription>Add a new patient, doctor, or admin to the system.</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/dashboard')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="patient">Patient</TabsTrigger>
                    <TabsTrigger value="doctor">Doctor</TabsTrigger>
                    <TabsTrigger value="admin">Admin</TabsTrigger>
                  </TabsList>

                  <TabsContent value="patient" className="space-y-6 pt-6">
                    <form onSubmit={(e) => handleSubmit(e, 'patient', patientData, setPatientData, initialPatientData)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="patient-name">Full Name</Label><Input id="patient-name" value={patientData.name} onChange={(e) => handlePatientChange('name', e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="patient-email">Email</Label><Input id="patient-email" type="email" value={patientData.email} onChange={(e) => handlePatientChange('email', e.target.value)} required /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="patient-password">Password</Label><Input id="patient-password" type="password" value={patientData.password} onChange={(e) => handlePatientChange('password', e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="patient-phone">Phone Number</Label><Input id="patient-phone" value={patientData.phone} onChange={(e) => handlePatientChange('phone', e.target.value)} /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="patient-age">Age</Label><Input id="patient-age" type="number" value={patientData.age} onChange={(e) => handlePatientChange('age', e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="patient-gender">Gender</Label><Select value={patientData.gender} onValueChange={(value) => handlePatientChange('gender', value)}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                      </div>
                      <div className="space-y-2"><Label htmlFor="patient-address">Full Address</Label><Input id="patient-address" value={patientData.address} onChange={(e) => handlePatientChange('address', e.target.value)} /></div>
                      <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>{loading ? 'Creating...' : 'Create Patient'}</Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="doctor" className="space-y-6 pt-6">
                    <form onSubmit={(e) => handleSubmit(e, 'doctor', doctorData, setDoctorData, initialDoctorData)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="doctor-name">Full Name</Label><Input id="doctor-name" value={doctorData.name} onChange={(e) => handleDoctorChange('name', e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="doctor-email">Email</Label><Input id="doctor-email" type="email" value={doctorData.email} onChange={(e) => handleDoctorChange('email', e.target.value)} required /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="doctor-password">Password</Label><Input id="doctor-password" type="password" value={doctorData.password} onChange={(e) => handleDoctorChange('password', e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="doctor-phone">Phone Number</Label><Input id="doctor-phone" value={doctorData.phone} onChange={(e) => handleDoctorChange('phone', e.target.value)} /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="doctor-gender">Gender</Label><Select value={doctorData.gender} onValueChange={(value) => handleDoctorChange('gender', value)}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="doctor-specialization">Specialization</Label><Select value={doctorData.specialization} onValueChange={(value) => handleDoctorChange('specialization', value)}><SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger><SelectContent><SelectItem value="General Dentistry">General Dentistry</SelectItem><SelectItem value="Orthodontics">Orthodontics</SelectItem><SelectItem value="Endodontics">Endodontics</SelectItem><SelectItem value="Periodontics">Periodontics</SelectItem><SelectItem value="Oral Surgery">Oral Surgery</SelectItem><SelectItem value="Cosmetic Dentistry">Cosmetic Dentistry</SelectItem></SelectContent></Select></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="doctor-degree">Degree</Label><Input id="doctor-degree" value={doctorData.degree} onChange={(e) => handleDoctorChange('degree', e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="doctor-experience">Experience (Years)</Label><Input id="doctor-experience" type="number" value={doctorData.experience} onChange={(e) => handleDoctorChange('experience', e.target.value)} /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="doctor-chamber-name">Chamber Name</Label><Input id="doctor-chamber-name" value={doctorData.chamber_name} onChange={(e) => handleDoctorChange('chamber_name', e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="doctor-license">License Number</Label><Input id="doctor-license" value={doctorData.license_number} onChange={(e) => handleDoctorChange('license_number', e.target.value)} /></div>
                      </div>
                      <div className="space-y-2"><Label htmlFor="doctor-chamber">Chamber Location (City/Area)</Label><Input id="doctor-chamber" value={doctorData.chamber_location} onChange={(e) => handleDoctorChange('chamber_location', e.target.value)} /></div>
                      <div className="space-y-2"><Label htmlFor="doctor-chamber-address">Chamber Full Address</Label><Textarea id="doctor-chamber-address" value={doctorData.chamber_address} onChange={(e) => handleDoctorChange('chamber_address', e.target.value)} /></div>
                      <div className="space-y-2"><Label htmlFor="doctor-bio">Professional Bio</Label><Textarea id="doctor-bio" value={doctorData.bio} onChange={(e) => handleDoctorChange('bio', e.target.value)} rows={3} /></div>
                      <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>{loading ? 'Creating...' : 'Create Doctor'}</Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="admin" className="space-y-6 pt-6">
                    <form onSubmit={(e) => handleSubmit(e, 'admin', adminData, setAdminData, initialAdminData)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="admin-name">Full Name</Label><Input id="admin-name" value={adminData.name} onChange={(e) => handleAdminChange('name', e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="admin-email">Email</Label><Input id="admin-email" type="email" value={adminData.email} onChange={(e) => handleAdminChange('email', e.target.value)} required /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="admin-password">Password</Label><Input id="admin-password" type="password" value={adminData.password} onChange={(e) => handleAdminChange('password', e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="admin-phone">Phone Number</Label><Input id="admin-phone" value={adminData.phone} onChange={(e) => handleAdminChange('phone', e.target.value)} /></div>
                      </div>
                      <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>{loading ? 'Creating...' : 'Create Admin'}</Button>
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

export default AdminAddUser;