
    import React, { useState, useEffect, useMemo } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { toast } from '@/components/ui/use-toast';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Plus, FileText, Clock, CheckCircle, Star, Eye, LogOut, MessageSquare, Calendar, AlertTriangle, UserCog, FileDown, ClipboardX as ClipboardPlus, Wallet, CreditCard, Coins as HandCoins, Phone, Upload, ShoppingCart, ChevronDown } from 'lucide-react';
    import {
      Dialog,
      DialogContent,
      DialogDescription,
      DialogHeader,
      DialogTitle,
      DialogFooter,
      DialogClose
    } from "@/components/ui/dialog";
    import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
    } from "@/components/ui/select";
    import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
    import Invoice from '@/pages/Invoice';
    import Prescription from '@/pages/Prescription';
    import { generatePdf } from '@/lib/pdfGenerator';
    import CountdownTimer from '@/components/CountdownTimer';
    import ImageLightbox from '@/components/ImageLightbox';
    import StarRating from '@/components/ui/StarRating';
    import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuLabel,
      DropdownMenuSeparator,
      DropdownMenuTrigger,
    } from "@/components/ui/dropdown-menu";
    import { format, parseISO, getDay, setHours, setMinutes, addMinutes, isBefore, startOfDay } from 'date-fns';

    const PatientDashboard = () => {
      const navigate = useNavigate();
      const { user, signOut } = useAuth();
      const { cases, proposals, submitIssue, users, issues, prescriptions, settings, makePaymentForCase, reviews, submitReview, appointments, bookAppointment } = useData();
      const [userCases, setUserCases] = useState([]);
      const [userAppointments, setUserAppointments] = useState([]);
      const [selectedCaseForIssue, setSelectedCaseForIssue] = useState(null);
      const [issueForm, setIssueForm] = useState({ title: '', description: '', category: '', attachments: [] });
      const [reportedIssues, setReportedIssues] = useState([]);
      const [modalContent, setModalContent] = useState(null);
      const [paymentModalCase, setPaymentModalCase] = useState(null);
      const [paymentMethod, setPaymentMethod] = useState('wallet');
      const [lightboxImage, setLightboxImage] = useState(null);
      const [reviewModalCase, setReviewModalCase] = useState(null);
      const [reviewRating, setReviewRating] = useState(0);
      const [reviewComment, setReviewComment] = useState('');
      const [isViewIssuesOpen, setIsViewIssuesOpen] = useState(false);
      const [activeMobileTab, setActiveMobileTab] = useState('cases');
      const [appointmentModalCase, setAppointmentModalCase] = useState(null);
      const [selectedAppointmentDate, setSelectedAppointmentDate] = useState(new Date());
      const [availableSlots, setAvailableSlots] = useState([]);
      const [selectedSlot, setSelectedSlot] = useState(null);

      const patientDetails = users.find(u => u.id === user?.id);

      useEffect(() => {
        if (user) {
          const patientCases = cases.filter(c => c.patient_id === user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setUserCases(patientCases);
          
          const myIssues = issues.filter(i => i.reporter_id === user.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
          setReportedIssues(myIssues);

          const myAppointments = appointments.filter(a => a.patient_id === user.id).sort((a, b) => parseISO(b.appointment_time) - parseISO(a.appointment_time));
          setUserAppointments(myAppointments);
        }
      }, [cases, user, issues, appointments]);

      const doctorForAppointment = useMemo(() => {
        if (!appointmentModalCase) return null;
        const proposal = proposals.find(p => p.id === appointmentModalCase.chosen_proposal_id);
        if (!proposal) return null;
        return users.find(u => u.id === proposal.doctor_id);
      }, [appointmentModalCase, proposals, users]);

      useEffect(() => {
        if (doctorForAppointment && doctorForAppointment.availability && selectedAppointmentDate) {
          const dayOfWeek = getDay(selectedAppointmentDate);
          const doctorAvailability = doctorForAppointment.availability;
          
          if (!doctorAvailability.days[String(dayOfWeek)]) {
            setAvailableSlots([]);
            return;
          }

          const [startHour, startMinute] = doctorAvailability.startTime.split(':').map(Number);
          const [endHour, endMinute] = doctorAvailability.endTime.split(':').map(Number);
          const slotDuration = doctorAvailability.slotDuration;

          let slots = [];
          let currentTime = setMinutes(setHours(selectedAppointmentDate, startHour), startMinute);
          const endTime = setMinutes(setHours(selectedAppointmentDate, endHour), endMinute);
          
          const doctorAppointmentsOnDate = appointments
            .filter(a => a.doctor_id === doctorForAppointment.id && format(parseISO(a.appointment_time), 'yyyy-MM-dd') === format(selectedAppointmentDate, 'yyyy-MM-dd'))
            .map(a => parseISO(a.appointment_time).getTime());

          while (isBefore(currentTime, endTime)) {
            const isBooked = doctorAppointmentsOnDate.includes(currentTime.getTime());
            const isPast = isBefore(currentTime, new Date());

            if (!isBooked && !isPast) {
              slots.push(new Date(currentTime));
            }
            currentTime = addMinutes(currentTime, slotDuration);
          }
          setAvailableSlots(slots);
        } else {
          setAvailableSlots([]);
        }
      }, [doctorForAppointment, selectedAppointmentDate, appointments]);

      const handleLogout = async () => {
        const { success } = await signOut();
        if (success) {
          toast({
            title: "লগ আউট",
            description: "আপনি সফলভাবে লগ আউট হয়েছেন।",
          });
          navigate('/');
        }
      };

      const getStatusInfo = (status) => {
        switch (status) {
          case 'open': return { text: 'প্রস্তাবের জন্য অপেক্ষারত', color: 'bg-cyan-100 text-cyan-800' };
          case 'proposal_accepted': return { text: 'প্রস্তাব গৃহীত', color: 'bg-purple-100 text-purple-800' };
          case 'in-progress': return { text: 'অ্যাপয়েন্টমেন্ট নিশ্চিত', color: 'bg-yellow-100 text-yellow-800' };
          case 'treatment_started': return { text: 'চলমান', color: 'bg-orange-100 text-orange-800' };
          case 'completed': return { text: 'সম্পন্ন', color: 'bg-green-100 text-green-800' };
          case 'closed': return { text: 'বন্ধ', color: 'bg-gray-100 text-gray-800' };
          case 'pending_assignment': return { text: 'অ্যাডমিন পর্যালোচনার জন্য অপেক্ষারত', color: 'bg-orange-100 text-orange-800' };
          default: return { text: status, color: 'bg-gray-100 text-gray-800' };
        }
      };
      
        const getIssueStatusBadge = (status) => {
            switch (status) {
                case 'new': return <Badge className="bg-red-100 text-red-800">নতুন</Badge>;
                case 'investigation': return <Badge className="bg-yellow-100 text-yellow-800">তদন্তাধীন</Badge>;
                case 'in-progress': return <Badge className="bg-cyan-100 text-cyan-800">চলমান</Badge>;
                case 'solved': return <Badge className="bg-green-100 text-green-800">সমাধান হয়েছে</Badge>;
                default: return <Badge variant="outline">{status}</Badge>;
            }
        };

      const getPaymentStatusBadge = (status) => {
        switch (status) {
          case 'paid': return <Badge className="bg-blue-100 text-blue-800 flex items-center"><CreditCard className="h-3 w-3 mr-1"/>অনলাইনে পরিশোধিত</Badge>;
          case 'paid_in_cash': return <Badge className="bg-teal-100 text-teal-800 flex items-center"><HandCoins className="h-3 w-3 mr-1"/>নগদে পরিশোধিত</Badge>;
          case 'unpaid':
          default: return <Badge variant="destructive">অপরিশোধিত</Badge>;
        }
      };

      const getAppointmentStatusBadge = (status) => {
        switch (status) {
            case 'scheduled': return <Badge className="bg-blue-100 text-blue-800">নির্ধারিত</Badge>;
            case 'completed': return <Badge className="bg-green-100 text-green-800">সম্পন্ন</Badge>;
            case 'cancelled': return <Badge className="bg-red-100 text-red-800">বাতিল</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

      const patientIssueCategories = [
        { value: 'service_quality', label: 'সেবার মান সংক্রান্ত সমস্যা' },
        { value: 'billing_payment', label: 'বিল এবং পেমেন্ট সংক্রান্ত সমস্যা' },
        { value: 'appointment_scheduling', label: 'অ্যাপয়েন্টমেন্ট সময়সূচী' },
        { value: 'doctor_behavior', label: 'ডাক্তারের আচরণ/পেশাদারিত্ব' },
        { value: 'treatment_outcome', label: 'চিকিৎসার ফলাফল সংক্রান্ত উদ্বেগ' },
        { value: 'platform_technical', label: 'প্ল্যাটফর্মের প্রযুক্তিগত সমস্যা' },
        { value: 'other', label: 'অন্যান্য সমস্যা' }
      ];

      const convertFileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
          reader.readAsDataURL(file);
        });
      };

      const handleFileChange = async (files) => {
        const fileArray = Array.from(files);
        const fileNames = fileArray.map(file => file.name);
        const dataUrls = await Promise.all(fileArray.map(convertFileToDataURL));
        setIssueForm(prev => ({ ...prev, attachments: [...prev.attachments, ...dataUrls] }));
        toast({
          title: "ফাইল সংযুক্ত হয়েছে",
          description: `${fileNames.join(', ')} ফাইলগুলো রিপোর্টের সাথে সংযুক্ত করা হয়েছে।`,
        });
      };

      const handleSubmitIssue = (e) => {
        e.preventDefault();
        if (!selectedCaseForIssue) return;
        
        const chosenProposal = proposals.find(p => p.id === selectedCaseForIssue.chosen_proposal_id);
        if (!chosenProposal) {
            toast({ title: "ত্রুটি", description: "সমস্যা রিপোর্ট করা যাচ্ছে না কারণ নির্বাচিত ডাক্তার খুঁজে পাওয়া যায়নি।", variant: "destructive" });
            return;
        }
        const doctor = users.find(u => u.id === chosenProposal.doctor_id);
        if (!doctor) {
            toast({ title: "ত্রুটি", description: "সমস্যা রিপোর্ট করা যাচ্ছে না কারণ ডাক্তারের বিবরণ খুঁজে পাওয়া যায়নি।", variant: "destructive" });
            return;
        }

        const issueData = {
            caseId: selectedCaseForIssue.id,
            title: issueForm.title,
            description: issueForm.description,
            category: issueForm.category,
            attachments: issueForm.attachments,
            reporterId: user.id,
            reporterName: user.name,
        };
        submitIssue(issueData);
        toast({
            title: "সমস্যা রিপোর্ট করা হয়েছে",
            description: "আপনার সমস্যাটি পর্যালোচনার জন্য অ্যাডমিনের কাছে জমা দেওয়া হয়েছে।",
        });
        setSelectedCaseForIssue(null);
        setIssueForm({ title: '', description: '', category: '', attachments: [] });
      };

      const handlePayment = async () => {
        if (!paymentModalCase) return;
        const chosenProposal = proposals.find(p => p.id === paymentModalCase.chosen_proposal_id);
        if (!chosenProposal) return;

        const result = await makePaymentForCase(paymentModalCase.id, user.id, chosenProposal.cost, paymentMethod);
        
        if (result.success) {
          toast({ title: "পেমেন্ট সফল", description: `${paymentMethod} এর মাধ্যমে ৳${chosenProposal.cost} পেমেন্ট রেকর্ড করা হয়েছে।` });
        } else {
          toast({ title: "পেমেন্ট ব্যর্থ", description: result.message, variant: "destructive" });
        }
        setPaymentModalCase(null);
      };

      const handleReviewSubmit = () => {
        if (!reviewModalCase || reviewRating === 0) {
          toast({ title: "অবৈধ রিভিউ", description: "অনুগ্রহ করে একটি রেটিং দিন।", variant: "destructive" });
          return;
        }
        const chosenProposal = proposals.find(p => p.id === reviewModalCase.chosen_proposal_id);
        if (!chosenProposal) return;

        const reviewData = {
          caseId: reviewModalCase.id,
          reviewerId: user.id,
          revieweeId: chosenProposal.doctor_id,
          revieweeRole: 'doctor',
          rating: reviewRating,
          comment: reviewComment,
        };

        submitReview(reviewData);
        toast({ title: "রিভিউ জমা দেওয়া হয়েছে", description: "আপনার মতামতের জন্য ধন্যবাদ!" });
        setReviewModalCase(null);
        setReviewRating(0);
        setReviewComment('');
      };

      const handleBookAppointment = async () => {
        if (!appointmentModalCase || !selectedSlot || !doctorForAppointment) return;
        
        const appointmentData = {
          case_id: appointmentModalCase.id,
          patient_id: user.id,
          doctor_id: doctorForAppointment.id,
          appointment_time: selectedSlot.toISOString(),
        };

        try {
          await bookAppointment(appointmentData);
          toast({
            title: "অ্যাপয়েন্টমেন্ট বুক করা হয়েছে!",
            description: `আপনার অ্যাপয়েন্টমেন্ট ${format(selectedSlot, 'PPpp')} তারিখে সফলভাবে বুক করা হয়েছে।`,
          });
          setAppointmentModalCase(null);
          setSelectedSlot(null);
        } catch (error) {
          toast({
            title: "অ্যাপয়েন্টমেন্ট বুক করতে ব্যর্থ",
            description: "একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
            variant: "destructive",
          });
        }
      };


      const stats = [
        {
          title: "মোট কেস",
          value: userCases.length,
          icon: FileText,
          color: "text-primary"
        },
        {
          title: "চলমান কেস",
          value: userCases.filter(c => c.status === 'open').length,
          icon: Clock,
          color: "text-yellow-600"
        },
        {
          title: "সম্পন্ন কেস",
          value: userCases.filter(c => c.status === 'completed').length,
          icon: CheckCircle,
          color: "text-green-600"
        },
        {
          title: "ওয়ালেট",
          value: `৳${(patientDetails?.credit || 0).toLocaleString()}`,
          icon: Wallet,
          color: "text-indigo-600"
        }
      ];

      const handleDownloadPdf = async (type, data) => {
        const elementId = type === 'invoice' ? 'invoice-content' : 'prescription-content';
        const fileName = `${type}-${data.caseData.id}`;
        await generatePdf(elementId, fileName);
      };

      if (!user) {
        navigate('/login');
        return null;
      }

      return (
        <>
          <Helmet>
            <title>রোগীর ড্যাশবোর্ড - ডেন্টালিন্ক</title>
            <meta name="description" content="আপনার ডেন্টাল কেস এবং প্রস্তাবগুলো পরিচালনা করুন।" />
          </Helmet>
          <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            <header className="bg-white shadow-sm border-b sticky top-0 z-40">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <h1 className="text-xl md:text-2xl font-bold text-gradient">আমার ড্যাশবোর্ড</h1>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <Avatar><AvatarImage src={user.avatar} /><AvatarFallback>{user.name?.charAt(0)}</AvatarFallback></Avatar>
                      <div className="hidden md:block"><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          Menu
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>আমার অ্যাকাউন্ট</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/profile')}><UserCog className="h-4 w-4 mr-2" />প্রোফাইল</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/patient/shop')}><ShoppingCart className="h-4 w-4 mr-2" />রোগীর দোকান</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/patient/wallet')}><Wallet className="h-4 w-4 mr-2" />ওয়ালেট</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsViewIssuesOpen(true)}><AlertTriangle className="h-4 w-4 mr-2" />আমার সমস্যা ({reportedIssues.length})</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                          <LogOut className="h-4 w-4 mr-2" />লগ আউট
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                  {stats.map((stat, index) => (
                    <Card key={index} className="card-hover">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2"><p className="text-xs md:text-sm font-medium text-gray-600">{stat.title}</p><div className={`p-2 rounded-full bg-gray-100 ${stat.color}`}><stat.icon className="h-4 w-4" /></div></div>
                        <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end mb-6">
                  <Button onClick={() => navigate('/patient/submit-case')} className="gradient-bg text-white w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    নতুন কেস জমা দিন
                  </Button>
                </div>

                <Tabs defaultValue="cases" onValueChange={setActiveMobileTab} className="w-full">
                  <TabsList className="hidden md:grid w-full grid-cols-3">
                    <TabsTrigger value="cases">আমার কেস ({userCases.length})</TabsTrigger>
                    <TabsTrigger value="appointments">আমার অ্যাপয়েন্টমেন্ট ({userAppointments.length})</TabsTrigger>
                    <TabsTrigger value="issues">রিপোর্ট করা সমস্যা ({reportedIssues.length})</TabsTrigger>
                  </TabsList>
                  
                  <div className="hidden md:block">
                    <TabsContent value="cases" className="mt-6"><CaseList /></TabsContent>
                    <TabsContent value="appointments" className="mt-6"><AppointmentList /></TabsContent>
                    <TabsContent value="issues" className="mt-6"><IssueList /></TabsContent>
                  </div>

                  <div className="md:hidden">
                    {activeMobileTab === 'cases' && <CaseList />}
                    {activeMobileTab === 'appointments' && <AppointmentList />}
                    {activeMobileTab === 'issues' && <IssueList />}
                  </div>

                  <TabsList className="md:hidden fixed bottom-0 left-0 right-0 grid w-full grid-cols-3 h-16 bg-white border-t z-50">
                    <TabsTrigger value="cases" className="flex-col h-full text-xs p-1"><FileText className="h-5 w-5 mb-1" />কেস</TabsTrigger>
                    <TabsTrigger value="appointments" className="flex-col h-full text-xs p-1"><Calendar className="h-5 w-5 mb-1" />অ্যাপয়েন্টমেন্ট</TabsTrigger>
                    <TabsTrigger value="issues" className="flex-col h-full text-xs p-1"><AlertTriangle className="h-5 w-5 mb-1" />সমস্যা</TabsTrigger>
                  </TabsList>
                </Tabs>

              </motion.div>
            </main>

            {selectedCaseForIssue && (
              <Dialog open={!!selectedCaseForIssue} onOpenChange={() => setSelectedCaseForIssue(null)}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader><DialogTitle>একটি সমস্যা রিপোর্ট করুন</DialogTitle><DialogDescription>কেস সম্পর্কিত আপনার সমস্যার বর্ণনা দিন: {selectedCaseForIssue.title}</DialogDescription></DialogHeader>
                  <div className="bg-gray-50 rounded-lg p-4 my-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">কেসের বিবরণ</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="font-medium">কেস আইডি:</span> {selectedCaseForIssue.id}</div>
                        <div><span className="font-medium">অবস্থা:</span> {selectedCaseForIssue.status}</div>
                        <div><span className="font-medium">শিরোনাম:</span> {selectedCaseForIssue.title}</div>
                        <div><span className="font-medium">জমা হয়েছে:</span> {new Date(selectedCaseForIssue.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600"><span className="font-medium">বিবরণ:</span> {selectedCaseForIssue.description}</p>
                    </div>
                  </div>
                  <form onSubmit={handleSubmitIssue} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="issueCategory">সমস্যার বিভাগ</Label>
                      <Select value={issueForm.category} onValueChange={(value) => setIssueForm(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="সমস্যার বিভাগ নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {patientIssueCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label htmlFor="issueTitle">সমস্যার শিরোনাম</Label><Input id="issueTitle" value={issueForm.title} onChange={(e) => setIssueForm(prev => ({ ...prev, title: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label htmlFor="issueDescription">বিবরণ</Label><Textarea id="issueDescription" value={issueForm.description} onChange={(e) => setIssueForm(prev => ({ ...prev, description: e.target.value }))} required /></div>
                    <div className="space-y-2">
                      <Label htmlFor="attachments">প্রমাণ সংযুক্ত করুন (ঐচ্ছিক)</Label>
                      <div className="relative">
                        <Input
                          id="attachments"
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={(e) => handleFileChange(e.target.files)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                        <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50">
                          <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            {issueForm.attachments.length > 0 ? `${issueForm.attachments.length} টি ফাইল সংযুক্ত` : 'প্রমাণ ফাইল আপলোড করতে ক্লিক করুন'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {issueForm.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {issueForm.attachments.map((url, index) => (
                          <img 
                            key={`attachment-${index}`} 
                            src={url} 
                            alt={`Evidence ${index + 1}`} 
                            className="h-16 w-16 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImage(url)}
                          />
                        ))}
                      </div>
                    )}
                    <DialogFooter><DialogClose asChild><Button type="button" variant="outline">বাতিল</Button></DialogClose><Button type="submit">সমস্যা জমা দিন</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={isViewIssuesOpen} onOpenChange={setIsViewIssuesOpen}>
              <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                  <DialogTitle>আমার রিপোর্ট করা সমস্যা</DialogTitle>
                  <DialogDescription>আপনার রিপোর্ট করা সমস্ত সমস্যার অবস্থা ট্র্যাক করুন।</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                  <IssueList />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button>বন্ধ করুন</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {paymentModalCase && (
              <Dialog open={!!paymentModalCase} onOpenChange={() => setPaymentModalCase(null)}>
                <DialogContent>
                  <DialogHeader><DialogTitle>আপনার পেমেন্ট সম্পূর্ণ করুন</DialogTitle><DialogDescription>কেস: {paymentModalCase.title}</DialogDescription></DialogHeader>
                  <div className="py-4">
                    <p className="text-lg font-semibold">মোট পরিমাণ: <span className="text-primary">৳{proposals.find(p => p.id === paymentModalCase.chosen_proposal_id)?.cost.toLocaleString()}</span></p>
                    <div className="mt-4 space-y-2">
                      <Label>পেমেন্ট পদ্ধতি নির্বাচন করুন</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wallet"><div className="flex items-center"><Wallet className="h-4 w-4 mr-2" />ওয়ালেট (ব্যালেন্স: ৳{patientDetails?.credit || 0})</div></SelectItem>
                          <SelectItem value="card"><div className="flex items-center"><CreditCard className="h-4 w-4 mr-2" />ক্রেডিট/ডেবিট কার্ড</div></SelectItem>
                          <SelectItem value="cash"><div className="flex items-center"><HandCoins className="h-4 w-4 mr-2" />ক্লিনিকে নগদে পরিশোধ</div></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {paymentMethod === 'wallet' && (patientDetails?.credit || 0) < proposals.find(p => p.id === paymentModalCase.chosen_proposal_id)?.cost && (
                      <p className="text-red-500 text-sm mt-2">অপর্যাপ্ত ওয়ালেট ব্যালেন্স। অনুগ্রহ করে ফান্ড যোগ করুন বা অন্য পদ্ধতি বেছে নিন।</p>
                    )}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">বাতিল</Button></DialogClose>
                    <Button onClick={handlePayment} disabled={paymentMethod === 'wallet' && (patientDetails?.credit || 0) < proposals.find(p => p.id === paymentModalCase.chosen_proposal_id)?.cost}>
                      এখনই পরিশোধ করুন
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {reviewModalCase && (
              <Dialog open={!!reviewModalCase} onOpenChange={() => setReviewModalCase(null)}>
                <DialogContent>
                  <DialogHeader><DialogTitle>একটি রিভিউ দিন</DialogTitle><DialogDescription>আপনার অভিজ্ঞতা শেয়ার করুন: {reviewModalCase.title}</DialogDescription></DialogHeader>
                  <div className="py-4 space-y-4">
                    <div><Label>রেটিং</Label><StarRating rating={reviewRating} setRating={setReviewRating} /></div>
                    <div><Label htmlFor="reviewComment">মন্তব্য</Label><Textarea id="reviewComment" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="আপনার অভিজ্ঞতা বর্ণনা করুন..." /></div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">বাতিল</Button></DialogClose>
                    <Button onClick={handleReviewSubmit}>রিভিউ জমা দিন</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {appointmentModalCase && (
              <Dialog open={!!appointmentModalCase} onOpenChange={() => setAppointmentModalCase(null)}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>অ্যাপয়েন্টমেন্ট বুক করুন</DialogTitle>
                    <DialogDescription>ডাক্তার {doctorForAppointment?.name} এর সাথে আপনার অ্যাপয়েন্টমেন্টের জন্য একটি তারিখ এবং সময় নির্বাচন করুন।</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={selectedAppointmentDate}
                        onSelect={setSelectedAppointmentDate}
                        disabled={(date) => {
                          const day = getDay(date);
                          return date < startOfDay(new Date()) || !doctorForAppointment?.availability?.days[String(day)];
                        }}
                      />
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      <h3 className="font-semibold mb-2 text-center">{format(selectedAppointmentDate, 'PPP')}</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.length > 0 ? availableSlots.map(slot => (
                          <Button
                            key={slot.toISOString()}
                            variant={selectedSlot?.getTime() === slot.getTime() ? 'default' : 'outline'}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {format(slot, 'p')}
                          </Button>
                        )) : (
                          <p className="col-span-3 text-center text-gray-500">এই তারিখে কোনো স্লট উপলব্ধ নেই।</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">বাতিল</Button></DialogClose>
                    <Button onClick={handleBookAppointment} disabled={!selectedSlot}>অ্যাপয়েন্টমেন্ট নিশ্চিত করুন</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={!!modalContent} onOpenChange={() => setModalContent(null)}>
              <DialogContent className="max-w-4xl">
                {modalContent?.type === 'invoice' && (
                  <>
                    <DialogHeader><DialogTitle>ইনভয়েস</DialogTitle><DialogDescription>নিচের ইনভয়েসটি পর্যালোচনা করুন। পিডিএফ পেতে ডাউনলোড ক্লিক করুন।</DialogDescription></DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1"><Invoice {...modalContent.data} /></div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => handleDownloadPdf('invoice', modalContent.data)}>
                        <FileDown className="h-4 w-4 mr-2" />
                        পিডিএফ ডাউনলোড করুন
                      </Button>
                    </DialogFooter>
                  </>
                )}
                {modalContent?.type === 'prescription' && (
                  <>
                    <DialogHeader><DialogTitle>প্রেসক্রিপশন</DialogTitle><DialogDescription>এটি আপনার ডাক্তারের দেওয়া প্রেসক্রিপশন।</DialogDescription></DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1"><Prescription {...modalContent.data} isDoctor={false} /></div>
                     <DialogFooter>
                      <Button variant="outline" onClick={() => handleDownloadPdf('prescription', modalContent.data)}>
                        <FileDown className="h-4 w-4 mr-2" />
                        পিডিএফ ডাউনলোড করুন
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>

            <ImageLightbox imageUrl={lightboxImage} open={!!lightboxImage} onOpenChange={setLightboxImage} />
          </div>
        </>
      );

      function CaseList() {
        return (
          <Card>
            <CardHeader>
              <CardTitle>আমার কেস</CardTitle>
              <CardDescription>আপনার জমা দেওয়া সমস্ত কেসের অবস্থা ট্র্যাক করুন।</CardDescription>
            </CardHeader>
            <CardContent>
              {userCases.length === 0 ? (
                <div className="text-center py-16"><FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-medium text-gray-700">এখনও কোনো কেস জমা দেওয়া হয়নি</h3><p className="text-gray-500">শুরু করতে "নতুন কেস জমা দিন" এ ক্লিক করুন।</p></div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {userCases.map(c => {
                    const proposalsForCase = proposals.filter(p => p.case_id === c.id);
                    const statusInfo = getStatusInfo(c.status);
                    const chosenProposal = proposals.find(p => p.id === c.chosen_proposal_id);
                    const doctor = chosenProposal ? users.find(u => u.id === chosenProposal.doctor_id) : null;
                    const pdfData = { caseData: c, proposal: chosenProposal, patient: patientDetails, doctor, settings };
                    const existingPrescription = prescriptions.find(p => p.case_id === c.id);
                    const existingReview = reviews.find(r => r.case_id === c.id && r.reviewer_id === user.id);

                    return (
                      <div key={c.id} className="border rounded-lg p-3 sm:p-4 transition-colors hover:bg-white">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center mb-2 flex-wrap gap-2">
                              <Badge className={`${statusInfo.color} text-xs`}>{statusInfo.text}</Badge>
                              <h3 className="font-semibold text-base sm:text-lg">{c.title}</h3>
                            </div>
                            <p className="text-xs text-gray-500">কেস আইডি: {c.id}</p>
                            <p className="text-xs text-gray-500 mb-2">জমা হয়েছে: {format(new Date(c.created_at), 'PPp')}</p>
                            {chosenProposal && <p className="text-sm font-bold mt-1">চিকিৎসার খরচ: ৳{chosenProposal.cost.toLocaleString()}</p>}
                            {c.status === 'open' && c.proposal_deadline && <div className="mt-2"><CountdownTimer deadline={c.proposal_deadline} /></div>}
                          </div>
                          <div className="flex flex-col items-stretch sm:items-end space-y-2 w-full sm:w-auto">
                            {chosenProposal && getPaymentStatusBadge(c.payment_status)}
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              {(c.status === 'open') && (
                                <Button size="sm" onClick={() => navigate(`/patient/proposals/${c.id}`)} className="w-full">
                                  <Eye className="h-4 w-4 mr-2" /> প্রস্তাব দেখুন ({proposalsForCase.length})
                                </Button>
                              )}
                              {c.status === 'proposal_accepted' && (
                                <Button size="sm" onClick={() => setAppointmentModalCase(c)} className="w-full">
                                  <Calendar className="h-4 w-4 mr-2" /> অ্যাপয়েন্টমেন্ট বুক করুন
                                </Button>
                              )}
                              {c.status === 'in-progress' && doctor && (
                                <>
                                  <Button size="sm" variant="outline" asChild className="flex-1"><a href={`tel:${doctor.phone}`}><Phone className="h-4 w-4 mr-2" />কল করুন</a></Button>
                                  <Button size="sm" onClick={() => navigate(`/chat/${c.id}`)} className="flex-1"><MessageSquare className="h-4 w-4 mr-2" />চ্যাট</Button>
                                </>
                              )}
                              {(c.status === 'in-progress' || c.status === 'completed' || c.status === 'treatment_started') && c.payment_status === 'unpaid' && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full" onClick={() => setPaymentModalCase(c)}>
                                  <CreditCard className="h-4 w-4 mr-2" /> পেমেন্ট করুন
                                </Button>
                              )}
                              {c.status === 'completed' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => setModalContent({ type: 'invoice', data: pdfData })} className="flex-1"><Eye className="h-4 w-4 mr-2" />ইনভয়েস</Button>
                                  <Button size="sm" variant="outline" onClick={() => setModalContent({ type: 'prescription', data: { ...pdfData, existingPrescription } })} className="flex-1"><Eye className="h-4 w-4 mr-2" />প্রেসক্রিপশন</Button>
                                </>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              {c.status === 'completed' && !existingReview && <Button size="sm" onClick={() => setReviewModalCase(c)} className="w-full"><Star className="h-4 w-4 mr-2" />রিভিউ দিন</Button>}
                              {['in-progress', 'completed', 'treatment_started'].includes(c.status) && (
                                <Button size="sm" variant="destructive" onClick={() => setSelectedCaseForIssue(c)} className="w-full">
                                  <AlertTriangle className="h-4 w-4 mr-2" /> সমস্যা রিপোর্ট করুন
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {(c.treatment_start_photo || c.treatment_end_photo) && (
                          <div className="border-t mt-4 pt-3">
                            <h4 className="text-sm font-semibold mb-2">চিকিৎসার ছবি</h4>
                            <div className="flex gap-4">
                              {c.treatment_start_photo && (
                                <div>
                                  <p className="text-xs text-center mb-1 font-medium">শুরু</p>
                                  <img src={c.treatment_start_photo} alt="Treatment Start" className="h-20 w-20 object-cover rounded-md cursor-pointer" onClick={() => setLightboxImage(c.treatment_start_photo)} />
                                </div>
                              )}
                              {c.treatment_end_photo && (
                                <div>
                                  <p className="text-xs text-center mb-1 font-medium">শেষ</p>
                                  <img src={c.treatment_end_photo} alt="Treatment End" className="h-20 w-20 object-cover rounded-md cursor-pointer" onClick={() => setLightboxImage(c.treatment_end_photo)} />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      }

      function AppointmentList() {
        return (
          <Card>
            <CardHeader><CardTitle>আমার অ্যাপয়েন্টমেন্ট</CardTitle><CardDescription>আপনার আসন্ন এবং অতীত অ্যাপয়েন্টমেন্টগুলো দেখুন।</CardDescription></CardHeader>
            <CardContent>
                {userAppointments.length === 0 ? (
                    <div className="text-center py-16"><Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-medium text-gray-700">কোনো অ্যাপয়েন্টমেন্ট বুক করা হয়নি</h3><p className="text-gray-500">আপনি একটি কেসের জন্য ডাক্তার নির্বাচন করার পরে অ্যাপয়েন্টমেন্ট বুক করতে পারেন।</p></div>
                ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {userAppointments.map(appointment => {
                            const doctor = users.find(u => u.id === appointment.doctor_id);
                            return (
                                <div key={appointment.id} className="border rounded-lg p-3 sm:p-4">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                                        <div>
                                            <p className="font-semibold text-base sm:text-lg">{format(parseISO(appointment.appointment_time), 'PPpp')}</p>
                                            <p className="text-sm text-gray-600">ডাক্তার: Dr. {doctor?.name || 'N/A'}</p>
                                            <p className="text-xs text-gray-500">কেস আইডি: {appointment.case_id}</p>
                                        </div>
                                        <div className="self-start sm:self-center">
                                            {getAppointmentStatusBadge(appointment.status)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
          </Card>
        );
      }

      function IssueList() {
        return (
          <Card>
            <CardHeader><CardTitle>আমার রিপোর্ট করা সমস্যা</CardTitle><CardDescription>আপনার রিপোর্ট করা সমস্যাগুলোর অবস্থা ট্র্যাক করুন।</CardDescription></CardHeader>
            <CardContent>
              {reportedIssues.length === 0 ? (
                <div className="text-center py-16"><ClipboardPlus className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-medium text-gray-700">কোনো সমস্যা রিপোর্ট করা হয়নি</h3><p className="text-gray-500">আপনি একটি সক্রিয় কেস থেকে সমস্যা রিপোর্ট করতে পারেন।</p></div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {reportedIssues.map(issue => {
                    const caseInfo = cases.find(c => c.id === issue.case_id);
                    const chosenProposal = proposals.find(p => p.id === caseInfo?.chosen_proposal_id);
                    const doctor = chosenProposal ? users.find(u => u.id === chosenProposal.doctor_id) : null;
                    return (
                      <div key={issue.id} className="border rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getIssueStatusBadge(issue.status)}
                              <h3 className="font-semibold text-base">{issue.title}</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                            {caseInfo && (
                              <div className="bg-gray-50 rounded-lg p-3 mb-2 text-xs">
                                <h4 className="font-semibold mb-1">সম্পর্কিত কেস</h4>
                                <p><span className="font-medium">কেস:</span> {caseInfo.title}</p>
                                <p><span className="font-medium">ডাক্তার:</span> Dr. {doctor?.name || 'N/A'}</p>
                              </div>
                            )}
                            <p className="text-xs text-gray-500">রিপোর্ট করা হয়েছে: {format(new Date(issue.created_at), 'PPp')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      }
    };

    export default PatientDashboard;
  