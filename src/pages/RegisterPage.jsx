import React, { useState } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate, Link } from 'react-router-dom';
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
    import { Stethoscope, User, Mail, Lock, MapPin, GraduationCap, Star, Phone, Home, Hash, Calendar, Users as UsersIcon } from 'lucide-react';

    const RegisterPage = () => {
      const navigate = useNavigate();
      const { register } = useAuth();
      const [activeTab, setActiveTab] = useState('patient');
      const [loading, setLoading] = useState(false);
      
      const [patientData, setPatientData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        age: '',
        gender: '',
        address: '',
        avatar: '',
        role: 'patient'
      });

      const [doctorData, setDoctorData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        gender: '',
        specialization: '',
        degree: '',
        experience: '',
        chamber_name: '',
        chamber_location: '',
        chamber_address: '',
        license_number: '',
        bio: '',
        avatar: '',
        role: 'doctor'
      });

      const handlePatientSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { user, error } = await register(patientData);

        if (error) {
          toast({
            title: "Registration Failed",
            description: error.message || "Something went wrong. Please try again.",
            variant: "destructive"
          });
        } else if (user) {
          toast({
            title: "Registration Successful!",
            description: `Welcome to DentaLink, ${user.name}!`,
          });
          navigate('/patient/dashboard');
        }
        setLoading(false);
      };

      const handleDoctorSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const doctorPayload = {
          ...doctorData,
          experience: Number(doctorData.experience) || 0,
          rating: 4.5,
          total_patients: 0,
          is_verified: false,
          status: 'pending_verification'
        };

        const { user, error } = await register(doctorPayload);

        if (error) {
          toast({
            title: "Registration Failed",
            description: error.message || "Something went wrong. Please try again.",
            variant: "destructive"
          });
        } else if (user) {
          toast({
            title: "Registration Submitted!",
            description: "Your profile is under review. You'll be notified once verified.",
          });
          navigate('/login');
        }
        setLoading(false);
      };

      const handlePatientChange = (field, value) => {
        setPatientData(prev => ({ ...prev, [field]: value }));
      };

      const handleDoctorChange = (field, value) => {
        setDoctorData(prev => ({ ...prev, [field]: value }));
      };

      return (
        <>
          <Helmet>
            <title>Register - DentaLink Smart Matching System</title>
            <meta name="description" content="Join DentaLink as a patient or dental professional. Create your account to start your dental care journey." />
          </Helmet>

          <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="w-full max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="text-center mb-8">
                  <Link to="/" className="inline-flex items-center space-x-2">
                    <Stethoscope className="h-10 w-10 text-primary" />
                    <span className="text-2xl font-bold text-gradient">DentaLink</span>
                  </Link>
                </div>

                <Card className="shadow-2xl border-0">
                  <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-2xl font-bold">Join DentaLink</CardTitle>
                    <CardDescription>
                      Create your account and start your dental care journey
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="patient">I'm a Patient</TabsTrigger>
                        <TabsTrigger value="doctor">I'm a Doctor</TabsTrigger>
                      </TabsList>

                      <TabsContent value="patient" className="space-y-6 pt-6">
                        <form onSubmit={handlePatientSubmit} className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="patient-name">Full Name</Label>
                              <div className="relative"><User className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="patient-name" placeholder="Enter your full name" value={patientData.name} onChange={(e) => handlePatientChange('name', e.target.value)} className="pl-10" required /></div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="patient-email">Email</Label>
                              <div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="patient-email" type="email" placeholder="Enter your email" value={patientData.email} onChange={(e) => handlePatientChange('email', e.target.value)} className="pl-10" required /></div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="patient-password">Password</Label>
                              <div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="patient-password" type="password" placeholder="Create a password" value={patientData.password} onChange={(e) => handlePatientChange('password', e.target.value)} className="pl-10" required /></div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="patient-phone">Phone Number</Label>
                              <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="patient-phone" placeholder="Enter your phone number" value={patientData.phone} onChange={(e) => handlePatientChange('phone', e.target.value)} className="pl-10" required /></div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                              <Label htmlFor="patient-age">Age</Label>
                               <div className="relative"><Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="patient-age" type="number" placeholder="Enter your age" value={patientData.age} onChange={(e) => handlePatientChange('age', e.target.value)} className="pl-10" required /></div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="patient-gender">Gender</Label>
                              <Select value={patientData.gender} onValueChange={(value) => handlePatientChange('gender', value)} required><SelectTrigger><UsersIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><SelectValue placeholder="Select gender" className="pl-10"/></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="patient-address">Full Address</Label>
                            <div className="relative"><Home className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="patient-address" placeholder="Enter your full address" value={patientData.address} onChange={(e) => handlePatientChange('address', e.target.value)} className="pl-10" required /></div>
                          </div>

                          <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>{loading ? 'Creating Account...' : 'Create Patient Account'}</Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="doctor" className="space-y-6 pt-6">
                        <form onSubmit={handleDoctorSubmit} className="space-y-4">
                           <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="doctor-name">Full Name</Label>
                              <div className="relative"><User className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="doctor-name" placeholder="Dr. Your Name" value={doctorData.name} onChange={(e) => handleDoctorChange('name', e.target.value)} className="pl-10" required /></div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="doctor-email">Email</Label>
                              <div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="doctor-email" type="email" placeholder="Enter your email" value={doctorData.email} onChange={(e) => handleDoctorChange('email', e.target.value)} className="pl-10" required /></div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="doctor-password">Password</Label>
                              <div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="doctor-password" type="password" placeholder="Create a password" value={doctorData.password} onChange={(e) => handleDoctorChange('password', e.target.value)} className="pl-10" required /></div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="doctor-phone">Phone Number</Label>
                              <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="doctor-phone" placeholder="Enter your phone number" value={doctorData.phone} onChange={(e) => handleDoctorChange('phone', e.target.value)} className="pl-10" required /></div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="doctor-gender">Gender</Label>
                              <Select value={doctorData.gender} onValueChange={(value) => handleDoctorChange('gender', value)} required><SelectTrigger><UsersIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><SelectValue placeholder="Select gender" className="pl-10" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="doctor-specialization">Specialization</Label>
                              <Select value={doctorData.specialization} onValueChange={(value) => handleDoctorChange('specialization', value)} required><SelectTrigger><Star className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><SelectValue placeholder="Select specialization" className="pl-10"/></SelectTrigger><SelectContent><SelectItem value="General Dentistry">General Dentistry</SelectItem><SelectItem value="Orthodontics">Orthodontics</SelectItem><SelectItem value="Endodontics">Endodontics</SelectItem><SelectItem value="Periodontics">Periodontics</SelectItem><SelectItem value="Oral Surgery">Oral Surgery</SelectItem><SelectItem value="Cosmetic Dentistry">Cosmetic Dentistry</SelectItem></SelectContent></Select>
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="doctor-degree">Degree</Label>
                              <div className="relative"><GraduationCap className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="doctor-degree" placeholder="BDS, MDS, etc." value={doctorData.degree} onChange={(e) => handleDoctorChange('degree', e.target.value)} className="pl-10" required /></div>
                            </div>
                             <div className="space-y-2">
                              <Label htmlFor="doctor-experience">Experience (Years)</Label>
                              <div className="relative"><Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="doctor-experience" type="number" placeholder="Years of experience" value={doctorData.experience} onChange={(e) => handleDoctorChange('experience', e.target.value)} className="pl-10" required /></div>
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="doctor-chamber-name">Chamber Name</Label>
                                <div className="relative"><Home className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="doctor-chamber-name" placeholder="e.g. DentaCare Clinic" value={doctorData.chamber_name} onChange={(e) => handleDoctorChange('chamber_name', e.target.value)} className="pl-10" required /></div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="doctor-license">License Number</Label>
                              <div className="relative"><Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="doctor-license" placeholder="Medical license number" value={doctorData.license_number} onChange={(e) => handleDoctorChange('license_number', e.target.value)} className="pl-10" required /></div>
                            </div>
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="doctor-chamber">Chamber Location (City/Area)</Label>
                              <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input id="doctor-chamber" placeholder="City/Area" value={doctorData.chamber_location} onChange={(e) => handleDoctorChange('chamber_location', e.target.value)} className="pl-10" required /></div>
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="doctor-chamber-address">Chamber Full Address</Label>
                               <Textarea id="doctor-chamber-address" placeholder="Full chamber address" value={doctorData.chamber_address} onChange={(e) => handleDoctorChange('chamber_address', e.target.value)} required />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="doctor-bio">Professional Bio</Label>
                            <Textarea id="doctor-bio" placeholder="Tell us about your experience and expertise..." value={doctorData.bio} onChange={(e) => handleDoctorChange('bio', e.target.value)} rows={3} />
                          </div>

                          <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>{loading ? 'Submitting Application...' : 'Submit Doctor Application'}</Button>

                          <div className="text-sm text-gray-600 bg-primary/10 p-3 rounded-lg"><strong>Note:</strong> Doctor profiles require admin verification before activation. You'll receive an email once your profile is approved.</div>
                        </form>
                      </TabsContent>
                    </Tabs>

                    <div className="text-center mt-6 space-y-2">
                      <p className="text-sm text-gray-600">Already have an account? <Link to="/login" className="text-primary hover:text-primary/80 font-medium">Sign in here</Link></p>
                      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to Home</Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </>
      );
    };

    export default RegisterPage;