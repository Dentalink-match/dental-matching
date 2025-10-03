import React, { useState } from 'react';
    import { motion } from 'framer-motion';
    import { Link } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Mail, Stethoscope, ArrowLeft } from 'lucide-react';

    const ForgotPasswordPage = () => {
      const [email, setEmail] = useState('');
      const [loading, setLoading] = useState(false);
      const { sendPasswordResetEmail } = useAuth();

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await sendPasswordResetEmail(email);
        setLoading(false);
      };

      return (
        <>
          <Helmet>
            <title>Forgot Password - DentaLink</title>
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
                  <CardTitle className="text-2xl">Forgot Your Password?</CardTitle>
                  <CardDescription>
                    Enter your email address and we'll send you a link to reset your password.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Reset Link'}
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

    export default ForgotPasswordPage;