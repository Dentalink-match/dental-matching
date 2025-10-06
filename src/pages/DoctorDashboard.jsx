import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useData } from '@/contexts/DataContext';
    import { supabase } from '@/lib/customSupabaseClient';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { toast } from '@/components/ui/use-toast';
    import { Users, FileText, DollarSign, LogOut, Send, CheckCircle, AlertCircle, Briefcase, TrendingUp, UserPlus, FileSignature, BarChart2, AlertTriangle, ClipboardList, UserCog, FileDown, ClipboardX as ClipboardPlus, Settings, AlertTriangle as AlertTriangleIcon, Star, Phone, MessageSquare, Activity, Banknote, Percent, CalendarDays, Check, Coins as HandCoins, CreditCard, Hand, Upload, Eye, Calendar as CalendarIcon, Edit, ShoppingCart, Camera, PlayCircle, Square, ChevronDown } from 'lucide-react';
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
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import Invoice from '@/pages/Invoice';
    import Prescription from '@/pages/Prescription';
    import { generatePdf } from '@/lib/pdfGenerator';
    import CountdownTimer from '@/components/CountdownTimer';
    import ImageLightbox from '@/components/ImageLightbox';
    import LiveCamera from '@/components/LiveCamera';
    import StarRating from '@/components/ui/StarRating';
    import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar } from 'recharts';
    import { format, subDays, eachDayOfInterval, isWithinInterval, startOfDay, endOfDay, setHours, setMinutes, getDay, parseISO } from 'date-fns';
    import FinancialBreakdown from '@/components/FinancialBreakdown';
    import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuLabel,
      DropdownMenuSeparator,
      DropdownMenuTrigger,
    } from "@/components/ui/dropdown-menu";
    import { useSound } from '@/hooks/useSound';
    import { Calendar } from '@/components/ui/calendar';
    import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
    import { cn } from "@/lib/utils";

    const DoctorDashboard = () => {
      const navigate = useNavigate();
      const { user, signOut } = useAuth();
      const { cases, proposals, submitProposal, users, updateProposal, settings, submitIssue, issues, prescriptions, savePrescription, reviews, submitReview, transactions, payPlatformCommission, appointments, updateUser, uploadTreatmentPhoto, saveCase } = useData();
      
      const [availableCases, setAvailableCases] = useState([]);
      const [myProposals, setMyProposals] = useState([]);
      const [acceptedPatients, setAcceptedPatients] = useState([]);
      const [selectedCaseForProposal, setSelectedCaseForProposal] = useState(null);
      const [proposalForm, setProposalForm] = useState({ treatmentPlan: '', cost: '', duration: '', notes: '' });
      const [editingProposal, setEditingProposal] = useState(null);
      
      const [stats, setStats] = useState({
        pendingPayout: 0,
        payoutsReceived: 0,
        expectedRevenue: 0,
        acceptanceRate: 0,
        avgRating: 0,
        platformDues: 0,
      });
      const [chartData, setChartData] = useState([]);
      const [recentActivities, setRecentActivities] = useState([]);

      const [selectedCaseForIssue, setSelectedCaseForIssue] = useState(null);
      const [issueForm, setIssueForm] = useState({ title: '', description: '', category: '', attachments: [] });
      const [modalContent, setModalContent] = useState(null);
      const [isPayoutSettingsOpen, setIsPayoutSettingsOpen] = useState(false);
      const [isPayDuesOpen, setIsPayDuesOpen] = useState(false);
      const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
      const [payoutDetails, setPayoutDetails] = useState({ method: '', bankName: '', branchName: '', routingNumber: '', accountNumber: '', accountName: '', bkashNumber: '' });
      const [lightboxImage, setLightboxImage] = useState(null);
      const [cameraModal, setCameraModal] = useState({ isOpen: false, caseId: null, type: null });
      const [reviewModalCase, setReviewModalCase] = useState(null);
      const [reviewRating, setReviewRating] = useState(0);
      const [reviewComment, setReviewComment] = useState('');
      const [reportedIssues, setReportedIssues] = useState([]);
      const [isViewIssuesOpen, setIsViewIssuesOpen] = useState(false);
      const [availability, setAvailability] = useState({
        days: { "0": false, "1": true, "2": true, "3": true, "4": true, "5": true, "6": false },
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
      });
      const [doctorAppointments, setDoctorAppointments] = useState([]);
      const [selectedDate, setSelectedDate] = useState(new Date());

      const playNotificationSound = useSound('/notification.mp3');
      const availableCasesCountRef = useRef(0);

      const doctorDetails = useMemo(() => users.find(u => u.id === user?.id), [users, user]);

      const doctorFinancialData = useMemo(() => {
        if (!user || !doctorDetails) return null;

        const doctorProposals = proposals.filter(p => p.doctor_id === user.id);
        const completedProposals = doctorProposals.filter(p => p.status === 'completed');
        
        const completedAndPaidProposals = completedProposals.filter(p => {
          const caseInfo = cases.find(c => c.id === p.case_id);
          return caseInfo && caseInfo.payment_status === 'paid';
        });

        const completedAndCashPaidProposals = completedProposals.filter(p => {
          const caseInfo = cases.find(c => c.id === p.case_id);
          return caseInfo && caseInfo.payment_status === 'paid_in_cash';
        });

        const grossRevenueFromPaid = completedAndPaidProposals.reduce((acc, proposal) => acc + (proposal.cost || 0), 0);
        
        const commissionFromPaid = completedAndPaidProposals.reduce((acc, proposal) => {
          const cost = proposal.cost || 0;
          const commissionType = doctorDetails.commission?.type || settings.commission_type;
          const commissionRate = doctorDetails.commission?.rate || settings.commission_rate;
          return acc + (commissionType === 'percentage' ? cost * (commissionRate / 100) : Number(commissionRate));
        }, 0);

        const commissionFromCash = completedAndCashPaidProposals.reduce((acc, proposal) => {
          const cost = proposal.cost || 0;
          const commissionType = doctorDetails.commission?.type || settings.commission_type;
          const commissionRate = doctorDetails.commission?.rate || settings.commission_rate;
          return acc + (commissionType === 'percentage' ? cost * (commissionRate / 100) : Number(commissionRate));
        }, 0);

        const netIncome = grossRevenueFromPaid - commissionFromPaid;

        const doctorTransactions = transactions.filter(t => t.doctor_id === user.id);
        const totalPaid = doctorTransactions.filter(t => t.type === 'payout').reduce((acc, t) => acc + t.amount, 0);

        const commissionPaidByDoctor = doctorTransactions.filter(t => t.type === 'commission_payment').reduce((acc, t) => acc + t.amount, 0);

        return {
          ...doctorDetails,
          grossRevenue: grossRevenueFromPaid,
          commission: commissionFromPaid + commissionFromCash,
          commissionFromCash,
          commissionPaidByDoctor,
          netIncome,
          totalPaid,
          pendingBalance: netIncome - totalPaid,
          commissionDue: commissionFromCash - commissionPaidByDoctor,
        };
      }, [user, doctorDetails, proposals, cases, settings, transactions]);

      useEffect(() => {
        if (user && doctorDetails && doctorFinancialData) {
          if (doctorDetails.availability) {
            setAvailability(doctorDetails.availability);
          }
          const doctorProposals = proposals.filter(p => p.doctor_id === user.id);
          setMyProposals(doctorProposals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

          const openCases = cases.filter(c =>
            c.status === 'open' &&
            c.assigned_doctor_ids?.includes(user.id) &&
            !doctorProposals.some(p => p.case_id === c.id) &&
            new Date(c.proposal_deadline) > new Date()
          ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          if (openCases.length > availableCasesCountRef.current) {
            playNotificationSound();
            toast({
              title: "নতুন কেস উপলব্ধ!",
              description: "একটি নতুন কেস আপনাকে প্রস্তাবের জন্য বরাদ্দ করা হয়েছে।",
            });
          }
          setAvailableCases(openCases);
          availableCasesCountRef.current = openCases.length;

          const activeCases = cases.filter(c => c.chosen_proposal_id && doctorProposals.some(p => p.id === c.chosen_proposal_id) && c.status !== 'proposal_accepted');
          
          const patientsWithDetails = activeCases.map(c => ({
            ...c,
            patientInfo: users.find(u => u.id === c.patient_id),
            proposalInfo: doctorProposals.find(p => p.id === c.chosen_proposal_id),
          })).filter(c => c.proposalInfo).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setAcceptedPatients(patientsWithDetails);

          const ongoingCases = activeCases.filter(c => ['in-progress', 'treatment_started'].includes(c.status));
          const expectedRevenueTotal = ongoingCases.reduce((acc, c) => {
            const proposal = proposals.find(p => p.id === c.chosen_proposal_id);
            return acc + (proposal?.cost || 0);
          }, 0);
          
          const totalSubmitted = doctorProposals.length;
          const totalAccepted = doctorProposals.filter(p => ['accepted', 'treatment_started', 'in-progress', 'completed'].includes(p.status)).length;
          const acceptanceRate = totalSubmitted > 0 ? (totalAccepted / totalSubmitted) * 100 : 0;

          const doctorReviews = reviews.filter(r => r.reviewee_id === user.id);
          const avgRating = doctorReviews.length > 0 ? doctorReviews.reduce((acc, r) => acc + r.rating, 0) / doctorReviews.length : 0;

          setStats({
            pendingPayout: doctorFinancialData.pendingBalance,
            payoutsReceived: doctorFinancialData.totalPaid,
            expectedRevenue: expectedRevenueTotal,
            acceptanceRate: acceptanceRate,
            avgRating: avgRating,
            platformDues: doctorFinancialData.commissionDue,
          });

          const endDate = new Date();
          const startDate = subDays(endDate, 29);
          const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
          const completedProposals = doctorProposals.filter(p => p.status === 'completed');
          const processedChartData = dateInterval.map(date => {
            const dayStart = startOfDay(date);
            const dayEnd = endOfDay(date);
            const dayProposals = completedProposals.filter(p => {
                const caseInfo = cases.find(c => c.id === p.case_id);
                return caseInfo && (caseInfo.payment_status === 'paid' || caseInfo.payment_status === 'paid_in_cash') && p.accepted_at && isWithinInterval(new Date(p.accepted_at), { start: dayStart, end: dayEnd });
            });
            const dailyGross = dayProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
            return { date: format(date, 'MMM d'), Revenue: dailyGross };
          });
          setChartData(processedChartData);

          const proposalActivities = doctorProposals
            .filter(p => p.status === 'accepted')
            .map(p => ({ type: 'proposal_accepted', data: p, date: new Date(p.accepted_at) }));
          const reviewActivities = doctorReviews
            .map(r => ({ type: 'new_review', data: r, date: new Date(r.created_at) }));
          const caseActivities = openCases
            .map(c => ({ type: 'new_case', data: c, date: new Date(c.assignment_time) }));
          
          const allActivities = [...proposalActivities, ...reviewActivities, ...caseActivities]
            .sort((a, b) => b.date - a.date)
            .slice(0, 5);
          setRecentActivities(allActivities);

          if (doctorDetails.payout_details) {
            setPayoutDetails(prev => ({ ...prev, ...doctorDetails.payout_details }));
          }

          const myIssues = issues.filter(i => i.reporter_id === user.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
          setReportedIssues(myIssues);

          const myAppointments = appointments.filter(a => a.doctor_id === user.id).sort((a, b) => parseISO(a.appointment_time) - parseISO(b.appointment_time));
          setDoctorAppointments(myAppointments);

        }
      }, [cases, proposals, user, users, settings, reviews, transactions, doctorDetails, doctorFinancialData, issues, appointments, playNotificationSound, toast]);

      const handleLogout = async () => {
        const { success } = await signOut();
        if (success) {
          toast({ title: "লগ আউট", description: "আপনি সফলভাবে লগ আউট হয়েছেন।" });
          navigate('/');
        }
      };

      const handleCaseStatusChange = (caseId, newStatus) => {
        const caseToUpdate = cases.find(c => c.id === caseId);
        if (caseToUpdate) {
          saveCase({ ...caseToUpdate, status: newStatus });
          toast({ title: "কেসের অবস্থা আপডেট করা হয়েছে", description: `কেসের অবস্থা ${newStatus} এ পরিবর্তন করা হয়েছে।` });
        }
      };

      const handleEditProposal = (proposal) => {
        setEditingProposal({ ...proposal });
      };

      const handleUpdateProposalCost = async () => {
        if (!editingProposal) return;
        
        const updatedData = {
          id: editingProposal.id,
          cost: parseFloat(editingProposal.cost),
          previous_cost: myProposals.find(p => p.id === editingProposal.id).cost,
        };

        await updateProposal(updatedData);
        toast({ title: "প্রস্তাবের খরচ আপডেট করা হয়েছে", description: "চিকিৎসার খরচ সফলভাবে আপডেট করা হয়েছে।" });
        setEditingProposal(null);
      };

      const getCaseStatusBadge = (status) => {
        switch (status) {
          case 'pending_assignment': return <Badge className="bg-gray-100 text-gray-800">অ্যাসাইনমেন্টের জন্য অপেক্ষারত</Badge>;
          case 'open': return <Badge className="bg-blue-100 text-blue-800">প্রস্তাবের জন্য উন্মুক্ত</Badge>;
          case 'proposal_accepted': return <Badge className="bg-purple-100 text-purple-800">প্রস্তাব গৃহীত</Badge>;
          case 'in-progress': return <Badge className="bg-yellow-100 text-yellow-800">অ্যাপয়েন্টমেন্ট নিশ্চিত</Badge>;
          case 'treatment_started': return <Badge className="bg-orange-100 text-orange-800">চলমান</Badge>;
          case 'completed': return <Badge className="bg-green-100 text-green-800">সম্পন্ন</Badge>;
          case 'cancelled': return <Badge className="bg-red-100 text-red-800">বাতিল</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
        }
      };

      const getPaymentStatusBadge = (status) => {
        switch (status) {
          case 'paid': return <Badge className="bg-blue-100 text-blue-800 flex items-center"><CreditCard className="h-3 w-3 mr-1"/>অনলাইনে পরিশোধিত</Badge>;
          case 'paid_in_cash': return <Badge className="bg-teal-100 text-teal-800 flex items-center"><Hand className="h-3 w-3 mr-1"/>নগদে পরিশোধিত</Badge>;
          case 'unpaid':
          default: return <Badge variant="destructive">অপরিশোধিত</Badge>;
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

      const doctorIssueCategories = [
        { value: 'patient_communication', label: 'রোগীর সাথে যোগাযোগ সমস্যা' },
        { value: 'treatment_complications', label: 'চিকিৎসার জটিলতা' },
        { value: 'payment_disputes', label: 'পেমেন্ট সংক্রান্ত বিরোধ' },
        { value: 'platform_technical', label: 'প্ল্যাটফর্মের প্রযুক্তিগত সমস্যা' },
        { value: 'scheduling_conflicts', label: 'সময়সূচী সংক্রান্ত সমস্যা' },
        { value: 'medical_records', label: 'মেডিকেল রেকর্ড অ্যাক্সেস' },
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
          title: "ফাইল সংযুক্ত",
          description: `${fileNames.join(', ')} ফাইলগুলো রিপোর্টের সাথে সংযুক্ত করা হয়েছে।`,
        });
      };

      const handleSubmitProposal = (e) => {
        e.preventDefault();
        if (!selectedCaseForProposal) return;
        const proposalData = { caseId: selectedCaseForProposal.id, doctorId: user.id, doctorName: `Dr. ${user.name}`, patientId: selectedCaseForProposal.patient_id, ...proposalForm, cost: parseFloat(proposalForm.cost) };
        submitProposal(proposalData);
        toast({ title: "প্রস্তাব জমা দেওয়া হয়েছে!", description: "আপনার চিকিৎসার প্রস্তাব রোগীর কাছে পাঠানো হয়েছে।" });
        setSelectedCaseForProposal(null);
        setProposalForm({ treatmentPlan: '', cost: '', duration: '', notes: '' });
      };

      const handleSavePayoutSettings = () => {
        updateUser({ ...doctorDetails, payout_details: payoutDetails });
        toast({ title: "পে-আউট সেটিংস সংরক্ষিত", description: "আপনার পে-আউট তথ্য আপডেট করা হয়েছে।" });
        setIsPayoutSettingsOpen(false);
      };

      const handleIssueSubmit = (e) => {
        e.preventDefault();
        if (!selectedCaseForIssue) return;
        submitIssue({
          caseId: selectedCaseForIssue.id,
          reporterId: user.id,
          reporterName: `Dr. ${user.name}`,
          ...issueForm
        });
        toast({ title: "সমস্যা রিপোর্ট করা হয়েছে", description: "আপনার সমস্যাটি অ্যাডমিন দলের কাছে জমা দেওয়া হয়েছে।" });
        setSelectedCaseForIssue(null);
        setIssueForm({ title: '', description: '', category: '', attachments: [] });
      };

      const handleDownloadPdf = async (type, data) => {
        const elementId = type === 'invoice' ? 'invoice-content' : 'prescription-content';
        const fileName = `${type}-${data.caseData.id}`;
        await generatePdf(elementId, fileName);
      };

      const handleSavePrescription = (prescriptionData) => {
        savePrescription(prescriptionData);
        toast({ title: "প্রেসক্রিপশন সংরক্ষিত", description: "প্রেসক্রিপশনটি আপডেট করা হয়েছে।" });
      };

      const handlePayDues = () => {
        payPlatformCommission(user.id, stats.platformDues, 'Online Payment');
        toast({ title: "পেমেন্ট সফল", description: `আপনি প্ল্যাটফর্মের বকেয়া ৳${stats.platformDues} পরিশোধ করেছেন।` });
        setIsPayDuesOpen(false);
      };

      const handleAvailabilityChange = (field, value) => {
        setAvailability(prev => ({ ...prev, [field]: value }));
      };
    
      const handleDayToggle = (dayIndex) => {
        setAvailability(prev => ({
          ...prev,
          days: { ...prev.days, [dayIndex]: !prev.days[dayIndex] }
        }));
      };
    
      const handleSaveAvailability = async () => {
        try {
          await updateUser({ id: user.id, availability });
          toast({ title: "সফল", description: "আপনার সময়সূচী আপডেট করা হয়েছে।" });
        } catch (error) {
          toast({ title: "ত্রুটি", description: "সময়সূচী সংরক্ষণ করা যায়নি।", variant: "destructive" });
        }
      };

      const handlePhotoCapture = async (photoDataUrl) => {
        const { caseId, type } = cameraModal;
        if (!caseId || !type) return;
    
        try {
          await uploadTreatmentPhoto(caseId, photoDataUrl, type);
          
          toast({
            title: `চিকিৎসা ${type === 'start' ? 'শুরু হয়েছে' : 'সম্পন্ন হয়েছে'}`,
            description: `ছবিটি সংরক্ষিত হয়েছে এবং স্ট্যাটাস আপডেট করা হয়েছে।`,
          });
        } catch (error) {
          toast({
            title: "আপলোড ব্যর্থ",
            description: "ছবিটি সংরক্ষণ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
            variant: "destructive",
          });
        } finally {
          setCameraModal({ isOpen: false, caseId: null, type: null });
        }
      };

      const statCards = [
        { title: "প্রদেয় অর্থ", value: `৳${stats.pendingPayout.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
        { title: "প্রাপ্ত অর্থ", value: `৳${stats.payoutsReceived.toLocaleString()}`, icon: Banknote, color: "text-green-600" },
        { title: "প্ল্যাটফর্মের বকেয়া", value: `৳${stats.platformDues.toLocaleString()}`, icon: HandCoins, color: "text-red-600", action: () => stats.platformDues > 0 && setIsPayDuesOpen(true) },
        { title: "প্রত্যাশিত আয়", value: `৳${stats.expectedRevenue.toLocaleString()}`, icon: Activity, color: "text-orange-600" },
        { title: "গ্রহণের হার", value: `${stats.acceptanceRate.toFixed(1)}%`, icon: Percent, color: "text-blue-600" },
        { title: "গড় রেটিং", value: `${stats.avgRating.toFixed(1)}/5`, icon: Star, color: "text-yellow-500" },
      ];

      const renderActivity = (activity) => {
        const patient = activity.data.patient_id ? users.find(u => u.id === activity.data.patient_id) : null;
        const reviewer = activity.data.reviewer_id ? users.find(u => u.id === activity.data.reviewer_id) : null;
        switch (activity.type) {
          case 'proposal_accepted':
            return <><CheckCircle className="h-4 w-4 text-green-500" /> <p><strong>{patient?.name}</strong> এর জন্য প্রস্তাব গৃহীত হয়েছে।</p></>;
          case 'new_review':
            return <><Star className="h-4 w-4 text-yellow-500" /> <p>{reviewer?.name} থেকে নতুন <strong>{activity.data.rating}-স্টার</strong> রিভিউ।</p></>;
          case 'new_case':
            return <><Briefcase className="h-4 w-4 text-blue-500" /> <p>নতুন কেস উপলব্ধ: <strong>{activity.data.title}</strong>।</p></>;
          default:
            return null;
        }
      };

      if (!user) {
        navigate('/login');
        return null;
      }

      if (!user.is_verified) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="max-w-md text-center">
              <CardHeader><AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" /><CardTitle>প্রোফাইল পর্যালোচনার অধীনে</CardTitle><CardDescription>আপনার ডাক্তার প্রোফাইলটি বর্তমানে আমাদের অ্যাডমিন দল দ্বারা যাচাই করা হচ্ছে। অনুমোদিত হলে আপনি একটি ইমেল বিজ্ঞপ্তি পাবেন।</CardDescription></CardHeader>
              <CardContent><Button onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />লগ আউট</Button></CardContent>
            </Card>
          </div>
        );
      }

      return (
        <>
          <Helmet><title>ডাক্তার ড্যাশবোর্ড - ডেন্টালিন্ক</title><meta name="description" content="ডাক্তারদের জন্য বিশ্লেষণ এবং ব্যবস্থাপনা কেন্দ্র।" /></Helmet>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-40">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <h1 className="text-xl md:text-2xl font-bold text-gradient">ডাক্তার ড্যাশবোর্ড</h1>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <Avatar><AvatarImage src={user.avatar} /><AvatarFallback>{user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback></Avatar>
                      <div className="hidden md:block"><p className="text-sm font-medium">Dr. {user.name}</p><p className="text-xs text-gray-500">{user.specialization}</p></div>
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
                        <DropdownMenuItem onClick={() => navigate('/doctor/shop')}><ShoppingCart className="h-4 w-4 mr-2" />ডাক্তারের দোকান</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsPayoutSettingsOpen(true)}><Settings className="h-4 w-4 mr-2" />পে-আউট সেটিংস</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/doctor/revenue')}><BarChart2 className="h-4 w-4 mr-2" />আয়</DropdownMenuItem>
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
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
                <div className="flex justify-end mb-4">
                    <Button onClick={() => setIsBreakdownOpen(true)}><FileText className="h-4 w-4 mr-2" />আমার আর্থিক ইতিহাস</Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 mb-8">
                  {statCards.map((stat, index) => (
                    <Card key={index} className={`card-hover ${stat.action ? 'cursor-pointer' : ''}`} onClick={stat.action}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2"><p className="text-xs md:text-sm font-medium text-gray-600">{stat.title}</p><div className={`p-2 rounded-full bg-gray-100 ${stat.color}`}><stat.icon className="h-4 w-4" /></div></div>
                        <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                    <Card>
                      <CardHeader><CardTitle>৩০-দিনের আয়</CardTitle><CardDescription>গত ৩০ দিনে সম্পন্ন হওয়া সমস্ত কেস থেকে মোট আয়।</CardDescription></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `৳${value/1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)', border: '1px solid #e2e8f0' }} formatter={(value) => [`৳${value.toLocaleString()}`, 'আয়']} />
                            <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                    <Card>
                      <CardHeader><CardTitle>সাম্প্রতিক কার্যকলাপ</CardTitle><CardDescription>আপনার সর্বশেষ বিজ্ঞপ্তি।</CardDescription></CardHeader>
                      <CardContent>
                        <div className="space-y-4 max-h-[250px] overflow-y-auto">
                          {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-center space-x-3 text-sm">
                              {renderActivity(activity)}
                              <span className="text-xs text-gray-400 ml-auto">{format(activity.date, 'MMM d')}</span>
                            </div>
                          )) : <p className="text-center text-gray-500 py-8">কোনো সাম্প্রতিক কার্যকলাপ নেই।</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <Tabs defaultValue="accepted" className="mt-8">
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                    <TabsTrigger value="accepted">গৃহীত ({acceptedPatients.length})</TabsTrigger>
                    <TabsTrigger value="available">প্রস্তাবনা ({availableCases.length})</TabsTrigger>
                    <TabsTrigger value="proposals">আমার প্রস্তাব ({myProposals.length})</TabsTrigger>
                    <TabsTrigger value="schedule">সময়সূচী</TabsTrigger>
                  </TabsList>
                  <TabsContent value="accepted" className="mt-6">
                    <Card>
                      <CardHeader><CardTitle>গৃহীত রোগী</CardTitle><CardDescription>আপনার চলমান চিকিৎসা পরিচালনা করুন।</CardDescription></CardHeader>
                      <CardContent>
                        {acceptedPatients.length === 0 ? <div className="text-center py-8"><Users className="h-12 w-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-500">এখনও কোনো রোগী গৃহীত হয়নি।</p></div> : (
                          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {acceptedPatients.map(c => (
                              <div key={c.id} className="border rounded-lg p-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                  <div className="flex items-center space-x-4">
                                    <Avatar className="h-12 w-12"><AvatarImage src={c.patientInfo?.avatar} /><AvatarFallback>{c.patientInfo?.name.charAt(0)}</AvatarFallback></Avatar>
                                    <div>
                                      <h3 className="font-semibold">{c.patientInfo?.name}</h3>
                                      <p className="text-sm text-gray-600">{c.title}</p>
                                      <p className="text-xs text-gray-500">কেস আইডি: {c.id}</p>
                                      <p className="text-sm font-bold mt-1">খরচ: ৳{c.proposalInfo?.cost.toLocaleString()}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
                                    {getCaseStatusBadge(c.status)}
                                    {getPaymentStatusBadge(c.payment_status)}
                                  </div>
                                </div>
                                <div className="border-t mt-4 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <div className="flex items-center flex-wrap gap-2">
                                    {c.status === 'in-progress' && (
                                      <Button size="sm" onClick={() => setCameraModal({ isOpen: true, caseId: c.id, type: 'start' })}>
                                        <PlayCircle className="h-4 w-4 mr-2" /> চিকিৎসা শুরু
                                      </Button>
                                    )}
                                    {c.status === 'treatment_started' && (
                                      <Button size="sm" onClick={() => setCameraModal({ isOpen: true, caseId: c.id, type: 'end' })}>
                                        <Square className="h-4 w-4 mr-2" /> চিকিৎসা সম্পন্ন
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline" asChild><a href={`tel:${c.patientInfo?.phone}`}><Phone className="h-4 w-4 mr-2" />কল</a></Button>
                                    <Button size="sm" onClick={() => navigate(`/chat/${c.id}`)}><MessageSquare className="h-4 w-4 mr-2" />চ্যাট</Button>
                                    <Button size="sm" variant="destructive" onClick={() => setSelectedCaseForIssue(c)}><AlertTriangle className="h-4 w-4 mr-2" />রিপোর্ট</Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="available" className="mt-6">
                    <Card>
                      <CardHeader><CardTitle>উপলব্ধ কেস</CardTitle><CardDescription>নতুন কেস প্রস্তাবের জন্য অপেক্ষা করছে।</CardDescription></CardHeader>
                      <CardContent>
                        {availableCases.length === 0 ? <div className="text-center py-8"><Users className="h-12 w-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-500">কোনো নতুন কেস উপলব্ধ নেই।</p></div> : (
                          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {availableCases.map((case_) => (
                              <div key={case_.id} className="border rounded-lg p-3 hover:bg-gray-50">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className="font-medium text-sm">{case_.title}</h3>
                                    <p className="text-xs text-gray-500">কেস আইডি: {case_.id}</p>
                                    <p className="text-xs text-gray-500">জমা হয়েছে: {format(new Date(case_.created_at), 'PPpp')}</p>
                                  </div>
                                  {case_.proposal_deadline && <CountdownTimer deadline={case_.proposal_deadline} />}
                                </div>
                                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{case_.description}</p>
                                <Button size="sm" className="w-full" onClick={() => setSelectedCaseForProposal(case_)}><Send className="h-4 w-4 mr-2" />প্রস্তাব জমা দিন</Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="proposals" className="mt-6">
                    <Card>
                      <CardHeader><CardTitle>আমার প্রস্তাব</CardTitle><CardDescription>আপনার জমা দেওয়া প্রস্তাবগুলো পরিচালনা করুন।</CardDescription></CardHeader>
                      <CardContent className="max-h-[65vh] overflow-y-auto">
                        {myProposals.length === 0 ? <p className="text-center text-gray-500 py-8">এখনও কোনো প্রস্তাব জমা দেওয়া হয়নি।</p> : (
                          <div className="space-y-4">
                            {myProposals.map(proposal => {
                              const caseInfo = cases.find(c => c.id === proposal.case_id);
                              const patientInfo = users.find(u => u.id === proposal.patient_id);
                              const isCompleted = proposal.status === 'completed';
                              const pdfData = { caseData: caseInfo, proposal, patient: patientInfo, doctor: doctorDetails, settings };
                              const existingPrescription = prescriptions.find(p => p.case_id === caseInfo?.id);

                              return (
                                <div key={proposal.id} className="border rounded-lg p-4">
                                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                    <div>
                                      <h3 className="font-semibold">কেস: {caseInfo?.title || 'N/A'}</h3>
                                      <p className="text-sm text-gray-500">রোগী: {patientInfo?.name || 'N/A'}</p>
                                      <p className="text-xs text-gray-400">প্রস্তাব আইডি: {proposal.id}</p>
                                      <p className="text-xs text-gray-400">জমা হয়েছে: {format(new Date(proposal.created_at), 'PPpp')}</p>
                                      <div className="flex items-baseline gap-2 mt-1">
                                        <p className="text-sm font-bold">খরচ: ৳{proposal.cost?.toLocaleString()}</p>
                                        {proposal.previous_cost && (
                                          <p className="text-xs text-gray-500 line-through opacity-70">৳{proposal.previous_cost.toLocaleString()}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end space-y-2 self-start sm:self-auto">
                                      <Badge variant="outline">{proposal.status}</Badge>
                                      {isCompleted && caseInfo?.payment_status && (
                                        getPaymentStatusBadge(caseInfo.payment_status)
                                      )}
                                    </div>
                                  </div>
                                  <div className="border-t mt-4 pt-3 flex items-center justify-end flex-wrap gap-2">
                                    {proposal.status === 'pending' && (
                                      <Button size="sm" variant="outline" onClick={() => handleEditProposal(proposal)}>
                                        <Edit className="h-4 w-4 mr-2" /> খরচ সম্পাদনা
                                      </Button>
                                    )}
                                    {isCompleted && (
                                      <>
                                        <Button size="sm" variant="outline" onClick={() => setModalContent({ type: 'invoice', data: pdfData })}>
                                          <Eye className="h-4 w-4 mr-2" /> ইনভয়েস
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setModalContent({ type: 'prescription', data: { ...pdfData, existingPrescription } })}>
                                          <Eye className="h-4 w-4 mr-2" /> প্রেসক্রিপশন
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="schedule" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-1">
                        <Card>
                          <CardHeader>
                            <CardTitle>আপনার সময়সূচী সেট করুন</CardTitle>
                            <CardDescription>আপনার সাপ্তাহিক কাজের সময় এবং দিন নির্ধারণ করুন।</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label>কাজের দিন</Label>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'].map((day, index) => (
                                  <Button
                                    key={day}
                                    variant={availability.days[String(index)] ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleDayToggle(String(index))}
                                    className="flex-1"
                                  >
                                    {day}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="startTime">শুরুর সময়</Label>
                                <Input id="startTime" type="time" value={availability.startTime} onChange={(e) => handleAvailabilityChange('startTime', e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="endTime">শেষের সময়</Label>
                                <Input id="endTime" type="time" value={availability.endTime} onChange={(e) => handleAvailabilityChange('endTime', e.target.value)} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="slotDuration">স্লটের সময়কাল (মিনিট)</Label>
                              <Select value={String(availability.slotDuration)} onValueChange={(val) => handleAvailabilityChange('slotDuration', parseInt(val))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="15">১৫ মিনিট</SelectItem>
                                  <SelectItem value="30">৩০ মিনিট</SelectItem>
                                  <SelectItem value="45">৪৫ মিনিট</SelectItem>
                                  <SelectItem value="60">৬০ মিনিট</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleSaveAvailability} className="w-full">সময়সূচী সংরক্ষণ করুন</Button>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="lg:col-span-2">
                        <Card>
                          <CardHeader>
                            <CardTitle>আমার অ্যাপয়েন্টমেন্ট</CardTitle>
                            <CardDescription>আপনার নির্ধারিত অ্যাপয়েন্টমেন্টগুলো দেখুন।</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                className="rounded-md border"
                                disabled={(date) => date < startOfDay(new Date())}
                              />
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                <h4 className="font-semibold text-center">{format(selectedDate, 'PPP')}</h4>
                                {doctorAppointments.filter(a => format(parseISO(a.appointment_time), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                                  doctorAppointments
                                    .filter(a => format(parseISO(a.appointment_time), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
                                    .map(app => {
                                      const patient = users.find(u => u.id === app.patient_id);
                                      return (
                                        <div key={app.id} className="p-2 border rounded-md bg-blue-50">
                                          <p className="font-semibold text-sm">{format(parseISO(app.appointment_time), 'p')}</p>
                                          <p className="text-xs text-gray-600">রোগী: {patient?.name}</p>
                                          <p className="text-xs text-gray-500">কেস: {app.case_id}</p>
                                        </div>
                                      );
                                    })
                                ) : (
                                  <p className="text-sm text-gray-500 text-center pt-8">এই দিনের জন্য কোনো অ্যাপয়েন্টমেন্ট নেই।</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </main>

            <Dialog open={!!selectedCaseForProposal} onOpenChange={() => setSelectedCaseForProposal(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader><DialogTitle>"{selectedCaseForProposal?.title}" এর জন্য প্রস্তাব জমা দিন</DialogTitle><DialogDescription>আপনার চিকিৎসা পরিকল্পনার বিবরণ দিন। কেস আইডি: {selectedCaseForProposal?.id}</DialogDescription></DialogHeader>
                    <div className="bg-gray-50 rounded-lg p-4 my-4 space-y-4">
                      <div><h3 className="font-semibold mb-2">{selectedCaseForProposal?.title}</h3><p className="text-gray-600 mb-2">{selectedCaseForProposal?.description}</p></div>
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">রোগীর সংযুক্তি</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedCaseForProposal?.images?.map((url, index) => (
                            <div key={`img-${index}`} className="relative group">
                                <img src={url} alt={`Patient attachment ${index + 1}`} className="h-20 w-20 object-cover rounded-md cursor-pointer" onClick={() => setLightboxImage(url)} />
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye className="h-6 w-6 text-white" />
                                </div>
                            </div>
                          ))}
                          {(!selectedCaseForProposal?.images || selectedCaseForProposal.images.length === 0) && (<p className="text-xs text-gray-500">কোনো সংযুক্তি প্রদান করা হয়নি।</p>)}
                        </div>
                      </div>
                    </div>
                    <form id="proposal-form" onSubmit={handleSubmitProposal} className="space-y-4">
                      <div className="space-y-2"><Label htmlFor="treatmentPlan">চিকিৎসা পরিকল্পনা</Label><Textarea id="treatmentPlan" placeholder="আপনার প্রস্তাবিত চিকিৎসা পরিকল্পনা বর্ণনা করুন..." value={proposalForm.treatmentPlan} onChange={(e) => setProposalForm(prev => ({ ...prev, treatmentPlan: e.target.value }))} rows={4} required /></div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="cost">চিকিৎসার খরচ (৳)</Label><Input id="cost" type="number" placeholder="বিডিটি-তে খরচ লিখুন" value={proposalForm.cost} onChange={(e) => setProposalForm(prev => ({ ...prev, cost: e.target.value }))} required /></div>
                        <div className="space-y-2"><Label htmlFor="duration">চিকিৎসার সময়কাল</Label><Input id="duration" placeholder="যেমন, ২-৩ সপ্তাহ" value={proposalForm.duration} onChange={(e) => setProposalForm(prev => ({ ...prev, duration: e.target.value }))} required /></div>
                      </div>
                      <div className="space-y-2"><Label htmlFor="notes">অতিরিক্ত নোট</Label><Textarea id="notes" placeholder="যেকোনো অতিরিক্ত তথ্য..." value={proposalForm.notes} onChange={(e) => setProposalForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} /></div>
                    </form>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="outline">বাতিল</Button></DialogClose><Button type="submit" form="proposal-form"><Send className="h-4 w-4 mr-2" />জমা দিন</Button></DialogFooter>
                </DialogContent>
              </Dialog>

            <Dialog open={!!editingProposal} onOpenChange={() => setEditingProposal(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>প্রস্তাবের খরচ সম্পাদনা করুন</DialogTitle>
                  <DialogDescription>এই প্রস্তাবের জন্য চিকিৎসার খরচ আপডেট করুন।</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-cost">নতুন চিকিৎসার খরচ (৳)</Label>
                    <Input
                      id="edit-cost"
                      type="number"
                      value={editingProposal?.cost || ''}
                      onChange={(e) => setEditingProposal(prev => ({ ...prev, cost: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">বাতিল</Button></DialogClose><Button onClick={handleUpdateProposalCost}>পরিবর্তন সংরক্ষণ করুন</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isPayoutSettingsOpen} onOpenChange={setIsPayoutSettingsOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>পে-আউট সেটিংস</DialogTitle><DialogDescription>পে-আউট পাওয়ার জন্য আপনার পেমেন্ট তথ্য যোগ বা আপডেট করুন।</DialogDescription></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label>পে-আউট পদ্ধতি</Label><Select value={payoutDetails.method} onValueChange={(value) => setPayoutDetails(prev => ({ ...prev, method: value }))}><SelectTrigger><SelectValue placeholder="একটি পদ্ধতি নির্বাচন করুন" /></SelectTrigger><SelectContent><SelectItem value="bank">ব্যাংক ট্রান্সফার</SelectItem><SelectItem value="bkash">বিকাশ</SelectItem></SelectContent></Select></div>
                  {payoutDetails.method === 'bank' && (<div className="space-y-4 p-4 border rounded-md"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="bankName">ব্যাংকের নাম</Label><Input id="bankName" value={payoutDetails.bankName} onChange={(e) => setPayoutDetails(prev => ({ ...prev, bankName: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="branchName">শাখার নাম</Label><Input id="branchName" value={payoutDetails.branchName} onChange={(e) => setPayoutDetails(prev => ({ ...prev, branchName: e.target.value }))} /></div></div><div className="space-y-2"><Label htmlFor="accountName">অ্যাকাউন্টধারীর নাম</Label><Input id="accountName" value={payoutDetails.accountName} onChange={(e) => setPayoutDetails(prev => ({ ...prev, accountName: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="accountNumber">অ্যাকাউন্ট নম্বর</Label><Input id="accountNumber" value={payoutDetails.accountNumber} onChange={(e) => setPayoutDetails(prev => ({ ...prev, accountNumber: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="routingNumber">রাউটিং নম্বর</Label><Input id="routingNumber" value={payoutDetails.routingNumber} onChange={(e) => setPayoutDetails(prev => ({ ...prev, routingNumber: e.target.value }))} /></div></div>)}
                  {payoutDetails.method === 'bkash' && (<div className="space-y-4 p-4 border rounded-md"><div className="space-y-2"><Label htmlFor="bkashNumber">বিকাশ নম্বর</Label><Input id="bkashNumber" value={payoutDetails.bkashNumber} onChange={(e) => setPayoutDetails(prev => ({ ...prev, bkashNumber: e.target.value }))} /></div></div>)}
                </div>
                <DialogFooter><DialogClose asChild><Button variant="outline">বাতিল</Button></DialogClose><Button onClick={handleSavePayoutSettings}>সেটিংস সংরক্ষণ করুন</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            
            {selectedCaseForIssue && (
              <Dialog open={!!selectedCaseForIssue} onOpenChange={() => setSelectedCaseForIssue(null)}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader><DialogTitle>একটি সমস্যা রিপোর্ট করুন</DialogTitle><DialogDescription>কেস সম্পর্কিত আপনার সমস্যার বর্ণনা দিন: {selectedCaseForIssue?.title}</DialogDescription></DialogHeader>
                  <div className="bg-gray-50 rounded-lg p-4 my-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">কেসের বিবরণ</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="font-medium">কেস আইডি:</span> {selectedCaseForIssue.id}</div>
                        <div><span className="font-medium">রোগী:</span> {selectedCaseForIssue.patientInfo?.name}</div>
                        <div><span className="font-medium">অবস্থা:</span> {selectedCaseForIssue.status}</div>
                        <div><span className="font-medium">খরচ:</span> ৳{selectedCaseForIssue.proposalInfo?.cost?.toLocaleString()}</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600"><span className="font-medium">বিবরণ:</span> {selectedCaseForIssue.description}</p>
                    </div>
                  </div>
                  <form id="issue-form" onSubmit={handleIssueSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="issueCategory">সমস্যার বিভাগ</Label>
                      <Select value={issueForm.category} onValueChange={(value) => setIssueForm(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="সমস্যার বিভাগ নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctorIssueCategories.map(cat => (
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
                            {issueForm.attachments.length > 0 ? `${issueForm.attachments.length} ফাইল সংযুক্ত` : 'প্রমাণ ফাইল আপলোড করতে ক্লিক করুন'}
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
                  </form>
                  <DialogFooter><DialogClose asChild><Button type="button" variant="outline">বাতিল</Button></DialogClose><Button type="submit" form="issue-form">সমস্যা জমা দিন</Button></DialogFooter>
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
                  {reportedIssues.length === 0 ? (
                    <div className="text-center py-8">
                      <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">এখনও কোনো সমস্যা রিপোর্ট করা হয়নি।</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reportedIssues.map(issue => {
                        const caseInfo = cases.find(c => c.id === issue.case_id);
                        const patientInfo = users.find(u => u.id === caseInfo?.patient_id);
                        return (
                          <div key={issue.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  {getIssueStatusBadge(issue.status)}
                                  <h3 className="font-semibold">{issue.title}</h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                              </div>
                            </div>
                            {caseInfo && (
                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <h4 className="font-semibold text-sm mb-2">সম্পর্কিত কেসের বিবরণ</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div><span className="font-medium">কেস:</span> {caseInfo.title}</div>
                                  <div><span className="font-medium">রোগী:</span> {patientInfo?.name}</div>
                                  <div><span className="font-medium">কেস আইডি:</span> {caseInfo.id}</div>
                                  <div><span className="font-medium">অবস্থা:</span> {caseInfo.status}</div>
                                </div>
                              </div>
                            )}
                            {issue.evidence_urls && issue.evidence_urls.length > 0 && (
                              <div className="mb-3">
                                <h4 className="font-semibold text-sm mb-2">সংযুক্তি</h4>
                                <div className="flex flex-wrap gap-2">
                                  {issue.evidence_urls.map((url, index) => (
                                    <img 
                                      key={`issue-attachment-${index}`} 
                                      src={url} 
                                      alt={`Evidence ${index + 1}`} 
                                      className="h-16 w-16 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => setLightboxImage(url)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-gray-500">রিপোর্ট করা হয়েছে: {new Date(issue.created_at).toLocaleString()}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button>বন্ধ করুন</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isPayDuesOpen} onOpenChange={setIsPayDuesOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>প্ল্যাটফর্মের বকেয়া পরিশোধ করুন</DialogTitle>
                        <DialogDescription>নগদে পরিশোধিত কেসের জন্য আপনার বকেয়া কমিশন পরিশোধ করুন।</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-gray-600">মোট বকেয়া পরিমাণ:</p>
                        <p className="text-3xl font-bold">৳{stats.platformDues.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-2">এই পরিমাণটি সেইসব কেস থেকে প্ল্যাটফর্মের কমিশন যেখানে আপনি সরাসরি রোগীর কাছ থেকে নগদে পেমেন্ট পেয়েছেন।</p>
                        <div className="text-center text-sm text-gray-500 p-4 bg-yellow-50 rounded-md mt-4">
                            <p>আপনার লেনদেন সম্পূর্ণ করতে আপনাকে একটি সুরক্ষিত পেমেন্ট গেটওয়েতে পুনঃনির্দেশিত করা হবে।</p>
                            <p>(এটি একটি সিমুলেশন)</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">বাতিল</Button></DialogClose>
                        <Button onClick={handlePayDues}>এখনই পরিশোধ করুন</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>আপনার আর্থিক বিবরণী</DialogTitle>
                        <DialogDescription>আপনার আর্থিক কার্যকলাপের একটি বিস্তারিত ওভারভিউ।</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <FinancialBreakdown doctorData={doctorFinancialData} transactions={transactions} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button>বন্ধ করুন</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!modalContent} onOpenChange={() => setModalContent(null)}>
              <DialogContent className="max-w-4xl">
                {modalContent?.type === 'invoice' && (
                  <>
                    <DialogHeader>
                      <DialogTitle>ইনভয়েস</DialogTitle>
                      <DialogDescription>নিচের ইনভয়েসটি পর্যালোচনা করুন। পিডিএফ পেতে ডাউনলোড ক্লিক করুন।</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1">
                      <Invoice {...modalContent.data} />
                    </div>
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
                    <DialogHeader>
                      <DialogTitle>প্রেসক্রিপশন</DialogTitle>
                      <DialogDescription>প্রেসক্রিপশন পর্যালোচনা, সম্পাদনা এবং সংরক্ষণ করুন। পিডিএফ পেতে ডাউনলোড ক্লিক করুন।</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1">
                      <Prescription {...modalContent.data} onSave={handleSavePrescription} isDoctor={true} />
                    </div>
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

            {cameraModal.isOpen && (
              <Dialog open={cameraModal.isOpen} onOpenChange={() => setCameraModal({ isOpen: false, caseId: null, type: null })}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>চিকিৎসার ছবি তুলুন</DialogTitle>
                    <DialogDescription>
                      চিকিৎসার প্রমাণ হিসাবে একটি লাইভ ছবি তুলুন ({cameraModal.type})। এটি বাধ্যতামূলক।
                    </DialogDescription>
                  </DialogHeader>
                  <LiveCamera
                    onCapture={handlePhotoCapture}
                    onCancel={() => setCameraModal({ isOpen: false, caseId: null, type: null })}
                  />
                </DialogContent>
              </Dialog>
            )}

            <ImageLightbox imageUrl={lightboxImage} open={!!lightboxImage} onOpenChange={setLightboxImage} />
          </div>
        </>
      );
    };

    export default DoctorDashboard;