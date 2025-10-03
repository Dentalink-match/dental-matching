import React, { useState } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { toast } from '@/components/ui/use-toast';
    import { FilePlus, Upload, ArrowLeft, Send, AlertTriangle, X } from 'lucide-react';
    import ImageLightbox from '@/components/ImageLightbox';

    const CaseSubmission = () => {
      const navigate = useNavigate();
      const { user } = useAuth();
      const { submitCase } = useData();
      const [formData, setFormData] = useState({
        title: '',
        description: '',
        treatmentNeeded: '',
        urgency: 'normal',
        images: [],
        affectedTeeth: [],
      });
      const [loading, setLoading] = useState(false);
      const [lightboxImage, setLightboxImage] = useState(null);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
          const newCase = await submitCase(formData);
          
          toast({
            title: "পর্যালোচনার জন্য কেস জমা দেওয়া হয়েছে!",
            description: `আপনার কেস (আইডি: ${newCase.id}) অ্যাসাইনমেন্টের জন্য আমাদের অ্যাডমিনের কাছে পাঠানো হয়েছে। ডাক্তারদের কাছে পাঠানো হলে আপনাকে জানানো হবে।`,
          });
          navigate('/patient/dashboard');
        } catch (error) {
          toast({
            title: "জমা দিতে ব্যর্থ",
            description: error.message || "কিছু একটা ভুল হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      };

      const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
      };

      const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setFormData(prev => ({ ...prev, images: [...prev.images, ...files] }));
        
        toast({
          title: "ফাইল নির্বাচিত",
          description: `${files.map(f => f.name).join(', ')} জমা দেওয়ার জন্য প্রস্তুত।`,
        });
      };
      
      const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
      };

      if (!user) {
        navigate('/login');
        return null;
      }

      return (
        <>
          <Helmet>
            <title>একটি কেস জমা দিন - ডেন্টালিন্ক</title>
            <meta name="description" content="যাচাইকৃত ডাক্তারদের কাছ থেকে চিকিৎসার প্রস্তাব পেতে আপনার ডেন্টাল কেস জমা দিন।" />
          </Helmet>

          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Card className="shadow-2xl border-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FilePlus className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle className="text-2xl font-bold">একটি নতুন কেস জমা দিন</CardTitle>
                          <CardDescription>
                            প্রস্তাব পেতে আপনার দাঁতের সমস্যার বিবরণ দিন
                          </CardDescription>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate('/patient/dashboard')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        ড্যাশবোর্ডে ফিরে যান
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title">কেসের শিরোনাম</Label>
                        <Input
                          id="title"
                          placeholder="যেমন, দাঁতে ব্যথা এবং সংবেদনশীলতা"
                          value={formData.title}
                          onChange={(e) => handleChange('title', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">লক্ষণ / বিবরণ</Label>
                        <Textarea
                          id="description"
                          placeholder="আপনার লক্ষণগুলো বিস্তারিতভাবে বর্ণনা করুন..."
                          value={formData.description}
                          onChange={(e) => handleChange('description', e.target.value)}
                          rows={4}
                          required
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="treatmentNeeded">প্রয়োজনীয় চিকিৎসা (যদি জানা থাকে)</Label>
                          <Select value={formData.treatmentNeeded} onValueChange={(value) => handleChange('treatmentNeeded', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="আপনার কোন ধরণের চিকিৎসা প্রয়োজন বলে মনে করেন তা নির্বাচন করুন" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="checkup">সাধারণ চেকআপ</SelectItem>
                              <SelectItem value="cleaning">ক্লিনিং ও স্কেলিং</SelectItem>
                              <SelectItem value="filling">ফিলিং</SelectItem>
                              <SelectItem value="root-canal">রুট ক্যানেল</SelectItem>
                              <SelectItem value="extraction">দাঁত তোলা</SelectItem>
                              <SelectItem value="braces">ব্রেসেস / অর্থোডন্টিক্স</SelectItem>
                              <SelectItem value="implant">ডেন্টাল ইমপ্লান্ট</SelectItem>
                              <SelectItem value="whitening">দাঁত সাদা করা</SelectItem>
                              <SelectItem value="other">অন্যান্য / নিশ্চিত নই</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="urgency">জরুরী অবস্থা</Label>
                          <Select value={formData.urgency} onValueChange={(value) => handleChange('urgency', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">কম - জরুরী নয়</SelectItem>
                              <SelectItem value="normal">সাধারণ - কিছুটা অস্বস্তি</SelectItem>
                              <SelectItem value="high">উচ্চ - উল্লেখযোগ্য ব্যথা</SelectItem>
                              <SelectItem value="emergency">জরুরী - অবিলম্বে মনোযোগ প্রয়োজন</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label>ছবি আপলোড করুন (এক্স-রে, ছবি, ইত্যাদি)</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                          <input
                            id="file-upload"
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*"
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">
                              <span className="font-semibold text-primary">আপলোড করতে ক্লিক করুন</span> অথবা ফাইল টেনে আনুন
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF (সর্বোচ্চ ১০MB)</p>
                          </label>
                        </div>
                        {formData.images.length > 0 && (
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {formData.images.map((file, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`Preview ${index}`}
                                  className="w-full h-24 object-cover rounded-md cursor-pointer"
                                  onClick={() => setLightboxImage(URL.createObjectURL(file))}
                                  onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <p className="text-sm text-yellow-700">
                          আপনার কেস ডাক্তারদের কাছে পাঠানোর আগে একজন অ্যাডমিন দ্বারা পর্যালোচনা করা হবে।
                        </p>
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'জমা দেওয়া হচ্ছে...' : 'পর্যালোচনার জন্য কেস জমা দিন'}
                        <Send className="h-4 w-4 ml-2" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          <ImageLightbox
            imageUrl={lightboxImage}
            open={!!lightboxImage}
            onOpenChange={setLightboxImage}
          />
        </>
      );
    };

    export default CaseSubmission;