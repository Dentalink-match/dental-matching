import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate, Link } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { useToast } from '@/components/ui/use-toast';
    import { Stethoscope, Mail, Lock, UserCheck } from 'lucide-react';
    import { useData } from '@/contexts/DataContext';

    const LoginPage = () => {
      const navigate = useNavigate();
      const { signIn, user, loading: authLoading } = useAuth();
      const { addActivityLog } = useData();
      const { toast } = useToast();
      const [formData, setFormData] = useState({
        email: '',
        password: '',
      });
      const [loading, setLoading] = useState(false);

      useEffect(() => {
        if (!authLoading && user) {
          addActivityLog('USER_LOGIN');
          toast({
            title: "Login Successful!",
            description: `Welcome back, ${user.name}!`,
          });
          switch (user.role) {
            case 'patient':
              navigate('/patient/dashboard');
              break;
            case 'doctor':
              navigate('/doctor/dashboard');
              break;
            case 'admin':
              navigate('/admin/dashboard');
              break;
            default:
              navigate('/');
          }
        }
      }, [user, authLoading, navigate, toast, addActivityLog]);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        setLoading(false);
      };

      const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
      };

      return (
        <>
          <Helmet>
            <title>Login - DentaLink Smart Matching System</title>
            <meta name="description" content="Login to your DentaLink account to access your dashboard and manage your dental care journey." />
          </Helmet>

          <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="w-full max-w-md">
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
                    <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                    <CardDescription>
                      Sign in to your account to continue your dental care journey
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="password">Password</Label>
                            <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-medium">
                                Forgot Password?
                            </Link>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full gradient-bg text-white"
                        disabled={loading || authLoading}
                      >
                        {loading || authLoading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Signing In...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <UserCheck className="h-4 w-4" />
                            <span>Sign In</span>
                          </div>
                        )}
                      </Button>

                      <div className="text-center space-y-2">
                        <p className="text-sm text-gray-600">
                          Don't have an account?{' '}
                          <Link to="/register" className="text-primary hover:text-primary/80 font-medium">
                            Sign up here
                          </Link>
                        </p>
                        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
                          ← Back to Home
                        </Link>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </>
      );
    };

    export default LoginPage;