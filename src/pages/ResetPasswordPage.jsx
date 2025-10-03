import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { Link, useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { toast } from '@/components/ui/use-toast';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Lock, Stethoscope, ArrowLeft } from 'lucide-react';

    const ResetPasswordPage = () => {
      const [password, setPassword] = useState('');
      const [confirmPassword, setConfirmPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const navigate = useNavigate();
      const { changePassword } = useAuth();

      useEffect(() => {
        const hash = window.location.hash;
        if (!hash.includes('type=recovery')) {
          toast({
            title: "Invalid Link",
            description: "This password reset link is invalid or has expired.",
            variant: "destructive",
          });
          navigate('/forgot-password');
        }
      }, [navigate]);

      const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
          toast({
            title: "Passwords do not match",
            variant: "destructive",
          });
          return;
        }
        setLoading(true);
        const { error } = await changePassword(password);
        setLoading(false);
        if (!error) {
          navigate('/login');
        }
      };

      return (
        <>
          <Helmet>
            <title>Reset Password - DentaLink</title>
          </Helmet>
          <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md"
            >
              <div className="text-center mb-8">
                <Link to="/" className="inline-flex items-center space-x-2">
                  <Stethoscope className="h-10 w-10 text-primary" />
                  <span className="text-2xl font-bold text-gradient">DentaLink</span>
                </Link>
              </div>

              <Card className="shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl">Reset Your Password</CardTitle>
                  <CardDescription>
                    Enter a new password for your account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter new password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-10"
                        />
                      </div>
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <Link to="/login" className="text-sm text-primary hover:text-primary/80 flex items-center justify-center">
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Login
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      );
    };

    export default ResetPasswordPage;