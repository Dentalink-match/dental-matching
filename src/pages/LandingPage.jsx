import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Stethoscope,
  Users,
  Brain,
  Shield,
  Star,
  MapPin,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const features = [
    {
      icon: Brain,
      title: "Smart Matching Algorithm",
      description: "AI-powered matching based on price, location, experience, and ratings"
    },
    {
      icon: Users,
      title: "Multi-Role Platform",
      description: "Seamless experience for patients, doctors, and administrators"
    },
    {
      icon: Shield,
      title: "Secure & Verified",
      description: "All doctors are verified with proper credentials and certifications"
    },
    {
      icon: DollarSign,
      title: "Transparent Pricing",
      description: "Compare treatment costs and choose the best value for your needs"
    }
  ];

  const stats = [
    { number: "500+", label: "Verified Doctors" },
    { number: "10,000+", label: "Happy Patients" },
    { number: "95%", label: "Success Rate" },
    { number: "24/7", label: "Support Available" }
  ];

  return (
    <>
      <Helmet>
        <title>DentaLink Smart Matching System - Connect with the Best Dental Professionals</title>
        <meta name="description" content="Find the perfect dental professional for your needs with our AI-powered smart matching system. Compare doctors, get treatment proposals, and make informed decisions." />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <Stethoscope className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-gradient">DentaLink</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <Button onClick={() => navigate('/register')}>
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-8 text-center lg:text-left"
              >
                <div className="space-y-4">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                    🚀 Smart Dental Matching Platform
                  </Badge>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                    Find Your Perfect
                    <span className="text-gradient block">Dental Professional</span>
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                    Connect with verified dental professionals through our intelligent matching system.
                    Get personalized treatment proposals and make informed decisions about your dental care.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button
                    size="lg"
                    className="gradient-bg text-white"
                    onClick={() => navigate('/register')}
                  >
                    Start Your Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" })}>
                    Learn More
                  </Button>
                </div>

                <div className="flex items-center justify-center lg:justify-start space-x-4 sm:space-x-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-primary">{stat.number}</div>
                      <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative mt-12 lg:mt-0"
              >
                <div className="relative z-10">
                  <img
                    className="rounded-2xl shadow-2xl animate-float"
                    alt="Modern dental clinic with advanced technology"
                    src="https://images.unsplash.com/photo-1629909613638-0e4a1fad8f81" />
                </div>
                <div className="absolute -top-4 -right-4 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-to-br from-primary to-accent rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-40 h-40 sm:w-64 sm:h-64 bg-gradient-to-br from-accent to-green-400 rounded-full opacity-20 animate-pulse"></div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose DentaLink?</h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                Our platform revolutionizes how patients connect with dental professionals,
                ensuring the best match for your specific needs.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                >
                  <Card className="h-full card-hover border-0 shadow-lg">
                    <CardHeader className="text-center">
                      <div className="mx-auto w-16 h-16 gradient-bg rounded-full flex items-center justify-center mb-4">
                        <feature.icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center text-gray-600">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-lg sm:text-xl text-gray-600">Simple steps to find your perfect dental match</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Submit Your Case",
                  description: "Describe your dental needs, upload images, and provide relevant information",
                  icon: CheckCircle
                },
                {
                  step: "02",
                  title: "Get Smart Matches",
                  description: "Our AI algorithm finds the best doctors based on your requirements",
                  icon: Brain
                },
                {
                  step: "03",
                  title: "Choose & Connect",
                  description: "Compare proposals, select your preferred doctor, and start treatment",
                  icon: Users
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  className="text-center"
                >
                  <div className="relative mb-8">
                    <div className="w-20 h-20 gradient-bg rounded-full flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-sm font-bold text-primary">{item.step}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 gradient-bg">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Ready to Find Your Perfect Dental Match?
              </h2>
              <p className="text-lg sm:text-xl text-primary-foreground/80">
                Join thousands of satisfied patients who found their ideal dental professionals through DentaLink
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate('/register')}
                  className="bg-white text-primary hover:bg-gray-100"
                >
                  Get Started Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/90 hover:text-primary"
                  onClick={() => toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" })}
                >
                  Contact Sales
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Stethoscope className="h-8 w-8 text-primary" />
                  <span className="text-xl font-bold">DentaLink</span>
                </div>
                <p className="text-gray-400">
                  Connecting patients with the best dental professionals through intelligent matching.
                </p>
              </div>

              <div>
                <p className="font-semibold mb-4">Platform</p>
                <ul className="space-y-2 text-gray-400">
                  <li>For Patients</li>
                  <li>For Doctors</li>
                  <li>For Clinics</li>
                  <li>API Access</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-4">Support</p>
                <ul className="space-y-2 text-gray-400">
                  <li>Help Center</li>
                  <li>Contact Us</li>
                  <li>Privacy Policy</li>
                  <li>Terms of Service</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-4">Company</p>
                <ul className="space-y-2 text-gray-400">
                  <li>About Us</li>
                  <li>Careers</li>
                  <li>Blog</li>
                  <li>Press</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; {new Date().getFullYear()} DentaLink Smart Matching System. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;