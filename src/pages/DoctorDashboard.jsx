import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Users, FileText, DollarSign, LogOut, Send, CheckCircle, AlertCircle, Briefcase, TrendingUp, UserPlus, FileSignature, BarChart2, AlertTriangle, ClipboardList, UserCog, FileDown, Settings, Star, Phone, MessageSquare, Activity, Banknote, Percent, CalendarDays, Check, Coins as HandCoins, CreditCard, Hand, Upload, Eye, Calendar as CalendarIcon, Edit, Camera, PlayCircle, Square, ChevronDown, Clock, Info, ShoppingCart } from 'lucide-react';
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
import Invoice from '@/components/Invoice';
import Prescription from '@/components/Prescription';
import { generatePdf } from '@/lib/pdfGenerator';
import CountdownTimer from '@/components/CountdownTimer';
import ImageLightbox from '@/components/ImageLightbox';
import LiveCamera from '@/components/LiveCamera';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, eachDayOfInterval, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import LoadingIndicator from '@/components/LoadingIndicator';
import { supabase } from '@/lib/customSupabaseClient';


const DoctorDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user: authUser, userData: doctorDetails, signOut, loading: authLoading } = useAuth();
    const {
        cases, proposals, users, settings, issues, prescriptions, reviews, transactions, appointments,
        loading: dataLoading,
        submitProposal, updateProposal, submitIssue, savePrescription, payPlatformCommission, updateUser, uploadTreatmentPhoto
    } = useData();
    
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
        pendingTreatmentPayment: 0,
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
    const [activeTab, setActiveTab] = useState('accepted');

    const [unreadCounts, setUnreadCounts] = useState({ accepted: 0, available: 0, proposals: 0 });
    const lastViewedTimestamp = useRef(Date.now());

    const playNotificationSound = useSound('/notification.mp3');

    useEffect(() => {
        if (!authLoading && !authUser) {
          navigate('/login');
        }
      }, [authUser, authLoading, navigate]);

    const doctorFinancialData = useMemo(() => {
        if (!authUser || !doctorDetails || !cases || !proposals) return null;

        const doctorProposals = proposals.filter(p => p.doctor_id === authUser.id);
        const completedProposals = doctorProposals.filter(p => {
            const caseInfo = cases.find(c => c.id === p.case_id);
            return caseInfo && caseInfo.status === 'completed';
        });
        
        const completedAndPaidProposals = completedProposals.filter(p => {
            const caseInfo = cases.find(c => c.id === p.case_id);
            return caseInfo && caseInfo.payment_status === 'paid';
        });

        const completedAndCashPaidProposals = completedProposals.filter(p => {
            const caseInfo = cases.find(c => c.id === p.case_id);
            return caseInfo && caseInfo.payment_status === 'paid_in_cash';
        });
        
        const completedAndUnpaidCases = cases.filter(c => 
            c.status === 'completed' && 
            c.payment_status === 'unpaid' && 
            doctorProposals.some(p => p.id === c.chosen_proposal_id)
        );
        const pendingTreatmentPayment = completedAndUnpaidCases.reduce((acc, currentCase) => {
            const proposal = doctorProposals.find(p => p.id === currentCase.chosen_proposal_id);
            return acc + (proposal?.cost || 0);
        }, 0);

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

        const doctorTransactions = transactions.filter(t => t.doctor_id === authUser.id);
        const totalPaid = doctorTransactions.filter(t => t.type === 'payout').reduce((acc, t) => acc + t.amount, 0);

        const commissionPaidByDoctor = doctorTransactions.filter(t => t.type === 'commission_payment').reduce((acc, t) => acc + t.amount, 0);

        return {
            ...doctorDetails,
            grossRevenue: grossRevenueFromPaid,
            commission: commissionFromPaid + commissionFromCash,
            commissionPaidByDoctor,
            netIncome,
            totalPaid,
            pendingBalance: netIncome - totalPaid,
            commissionDue: commissionFromCash - commissionPaidByDoctor,
            pendingTreatmentPayment
        };
    }, [authUser, doctorDetails, proposals, cases, settings, transactions]);

    useEffect(() => {
        if (!authUser || !doctorDetails) return;
        
        if (doctorDetails.availability) {
            setAvailability(doctorDetails.availability);
        }
        if (doctorDetails.payout_details) {
            setPayoutDetails(prev => ({ ...prev, ...doctorDetails.payout_details }));
        }

        const doctorProposals = proposals.filter(p => p.doctor_id === authUser.id);
        setMyProposals(doctorProposals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

        const openCases = cases.filter(c =>
            (c.status === 'open' || c.status === 'pending_assignment') &&
            c.assigned_doctor_ids?.includes(authUser.id) &&
            !doctorProposals.some(p => p.case_id === c.id) &&
            (!c.proposal_deadline || new Date(c.proposal_deadline) > new Date())
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        const newAvailableCasesCount = openCases.filter(c => new Date(c.assignment_time) > lastViewedTimestamp.current).length;
        if (newAvailableCasesCount > 0) {
            setUnreadCounts(prev => ({ ...prev, available: prev.available + newAvailableCasesCount }));
            playNotificationSound();
            toast({ title: "New Case Available!", description: "A new case has been assigned to you." });
        }
        setAvailableCases(openCases);

        const activeCases = cases.filter(c => c.chosen_proposal_id && doctorProposals.some(p => p.id === c.chosen_proposal_id));
        
        const patientsWithDetails = activeCases.map(c => ({
            ...c,
            patientInfo: users.find(u => u.auth_id === c.patient_id),
            proposalInfo: doctorProposals.find(p => p.id === c.chosen_proposal_id),
        })).filter(c => c.proposalInfo).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        const newAcceptedCount = patientsWithDetails.filter(p => p.proposalInfo && p.proposalInfo.accepted_at && new Date(p.proposalInfo.accepted_at) > lastViewedTimestamp.current).length;
        if (newAcceptedCount > 0) {
            setUnreadCounts(prev => ({ ...prev, accepted: prev.accepted + newAcceptedCount }));
        }
        setAcceptedPatients(patientsWithDetails);

        const ongoingCases = activeCases.filter(c => ['in-progress', 'treatment_started'].includes(c.status));
        const expectedRevenueTotal = ongoingCases.reduce((acc, c) => {
            const proposal = proposals.find(p => p.id === c.chosen_proposal_id);
            return acc + (proposal?.cost || 0);
        }, 0);
        
        const totalSubmitted = doctorProposals.length;
        const totalAccepted = doctorProposals.filter(p => ['accepted', 'treatment_started', 'in-progress', 'completed', 'proposal_accepted'].includes(p.status)).length;
        const acceptanceRate = totalSubmitted > 0 ? (totalAccepted / totalSubmitted) * 100 : 0;

        const doctorReviews = reviews.filter(r => r.reviewee_id === authUser.id);
        const avgRating = doctorReviews.length > 0 ? doctorReviews.reduce((acc, r) => acc + r.rating, 0) / doctorReviews.length : 0;

        if (doctorFinancialData) {
            setStats({
                pendingPayout: doctorFinancialData.pendingBalance,
                payoutsReceived: doctorFinancialData.totalPaid,
                expectedRevenue: expectedRevenueTotal,
                acceptanceRate: acceptanceRate,
                avgRating: avgRating,
                platformDues: doctorFinancialData.commissionDue,
                pendingTreatmentPayment: doctorFinancialData.pendingTreatmentPayment,
            });
        }

        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
        const completedProposals = doctorProposals.filter(p => {
            const caseInfo = cases.find(c => c.id === p.case_id);
            return caseInfo && caseInfo.status === 'completed';
        });
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

        const myIssues = issues.filter(i => i.reporter_id === authUser.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        setReportedIssues(myIssues);

        const myAppointments = appointments.filter(a => a.doctor_id === authUser.id).sort((a, b) => parseISO(a.appointment_time) - parseISO(b.appointment_time));
        setDoctorAppointments(myAppointments);

        const newActivities = [];
        openCases.forEach(c => newActivities.push({ type: 'NEW_CASE', data: c, timestamp: c.assignment_time }));
        doctorProposals.filter(p => p.status === 'accepted').forEach(p => newActivities.push({ type: 'PROPOSAL_ACCEPTED', data: p, timestamp: p.accepted_at }));
        transactions.filter(t => t.doctor_id === authUser.id && t.type === 'payout').forEach(t => newActivities.push({ type: 'PAYOUT', data: t, timestamp: t.date }));
        doctorReviews.forEach(r => newActivities.push({ type: 'NEW_REVIEW', data: r, timestamp: r.created_at }));
        
        setRecentActivities(newActivities.filter(a=>a.timestamp).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5));

    }, [authUser, doctorDetails, doctorFinancialData, cases, proposals, users, settings, reviews, transactions, issues, appointments, playNotificationSound, toast]);

    const handleTabClick = (tabName) => {
        setActiveTab(tabName);
        if (unreadCounts[tabName] > 0) {
            setUnreadCounts(prev => ({ ...prev, [tabName]: 0 }));
            lastViewedTimestamp.current = Date.now();
        }
    };

    const handleLogout = async () => {
        await signOut();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        navigate('/');
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
        toast({ title: "Proposal Cost Updated", description: "Treatment cost successfully updated." });
        setEditingProposal(null);
    };

    const getCaseStatusBadge = (status) => {
        switch (status) {
            case 'pending_assignment': return <Badge className="bg-gray-100 text-gray-800">Pending Assignment</Badge>;
            case 'open': return <Badge className="bg-blue-100 text-blue-800">Open for Proposals</Badge>;
            case 'proposal_accepted': return <Badge className="bg-purple-100 text-purple-800">Proposal Accepted</Badge>;
            case 'in-progress': return <Badge className="bg-yellow-100 text-yellow-800">Appointment Confirmed</Badge>;
            case 'treatment_started': return <Badge className="bg-orange-100 text-orange-800">In Progress</Badge>;
            case 'completed': return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
            case 'cancelled': return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPaymentStatusBadge = (status) => {
        switch (status) {
            case 'paid': return <Badge className="bg-blue-100 text-blue-800 flex items-center"><CreditCard className="h-3 w-3 mr-1"/>Paid Online</Badge>;
            case 'paid_in_cash': return <Badge className="bg-teal-100 text-teal-800 flex items-center"><Hand className="h-3 w-3 mr-1"/>Paid in Cash</Badge>;
            case 'unpaid':
            default: return <Badge variant="destructive">Unpaid</Badge>;
        }
    };

    const getIssueStatusBadge = (status) => {
        switch (status) {
            case 'new': return <Badge className="bg-red-100 text-red-800">New</Badge>;
            case 'investigation': return <Badge className="bg-yellow-100 text-yellow-800">Investigation</Badge>;
            case 'in-progress': return <Badge className="bg-cyan-100 text-cyan-800">In Progress</Badge>;
            case 'solved': return <Badge className="bg-green-100 text-green-800">Solved</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const doctorIssueCategories = [
        { value: 'patient_communication', label: 'Patient Communication Issue' },
        { value: 'treatment_complications', label: 'Treatment Complications' },
        { value: 'payment_disputes', label: 'Payment Disputes' },
        { value: 'platform_technical', label: 'Platform Technical Issue' },
        { value: 'scheduling_conflicts', label: 'Scheduling Conflicts' },
        { value: 'medical_records', label: 'Medical Records Access' },
        { value: 'other', label: 'Other Issues' }
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
            title: "Files Attached",
            description: `${fileNames.join(', ')} files have been attached to the report.`,
        });
    };

    const handleSubmitProposalForm = (e) => {
        e.preventDefault();
        if (!selectedCaseForProposal) return;
        const proposalData = { 
            case_id: selectedCaseForProposal.id, 
            doctor_id: authUser.id, 
            doctor_name: `Dr. ${doctorDetails.name}`, 
            patient_id: selectedCaseForProposal.patient_id, 
            ...proposalForm, 
            cost: parseFloat(proposalForm.cost) 
        };
        submitProposal(proposalData);
        toast({ title: "Proposal Submitted!", description: "Your treatment proposal has been sent to the patient." });
        setSelectedCaseForProposal(null);
        setProposalForm({ treatmentPlan: '', cost: '', duration: '', notes: '' });
    };

    const handleSavePayoutSettings = () => {
        updateUser({ auth_id: authUser.id, payout_details: payoutDetails });
        toast({ title: "Payout Settings Saved", description: "Your payout information has been updated." });
        setIsPayoutSettingsOpen(false);
    };

    const handleIssueSubmit = (e) => {
        e.preventDefault();
        if (!selectedCaseForIssue) return;
        submitIssue({
            case_id: selectedCaseForIssue.id,
            reporter_id: authUser.id,
            reporter_name: `Dr. ${doctorDetails.name}`,
            ...issueForm
        });
        toast({ title: "Issue Reported", description: "Your issue has been submitted to the admin team." });
        setSelectedCaseForIssue(null);
        setIssueForm({ title: '', description: '', category: '', attachments: [] });
    };

    const handleDownloadPdf = async (type, data) => {
        const elementId = type === 'invoice' ? 'invoice-content' : 'prescription-content';
        const fileName = `${type}-${data.caseData.id}`;
        await generatePdf(elementId, fileName);
    };

    const handleSavePrescription = async (prescriptionData) => {
        try {
            await savePrescription(prescriptionData);
            toast({ title: "Prescription Saved", description: "The prescription has been successfully updated." });
            setModalContent(null);
        } catch (error) {
            toast({ title: "Error", description: "Failed to save prescription.", variant: "destructive" });
        }
    };


    const handlePayDues = () => {
        payPlatformCommission(authUser.id, stats.platformDues, 'Online Payment');
        toast({ title: "Payment Successful", description: `You have paid ৳${stats.platformDues} platform dues.` });
        setIsPayDuesOpen(false);
    };

    const handleAvailabilityChange = (field, value) => {
        setAvailability(prev => ({ ...prev, [field]: value }));
    };

    const handleDayToggle = (dayIndex) => {
        setAvailability(prev => ({
            ...prev,
            days: { ...prev.days, [String(dayIndex)]: !prev.days[String(dayIndex)] }
        }));
    };

    const handleSaveAvailability = async () => {
        try {
            await updateUser({ auth_id: authUser.id, availability });
            toast({ title: "Success", description: "Your schedule has been updated." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to save schedule.", variant: "destructive" });
        }
    };

    const handlePhotoCapture = async (photoDataUrl) => {
        const { caseId, type } = cameraModal;
        if (!caseId || !type) return;

        try {
            await uploadTreatmentPhoto(caseId, photoDataUrl, type);
            
            toast({
            title: `Treatment ${type === 'start' ? 'Started' : 'Completed'}`,
            description: `Photo saved and status updated.`,
            });
        } catch (error) {
            toast({
            title: "Upload Failed",
            description: "Failed to save photo. Please try again.",
            variant: "destructive",
            });
        } finally {
            setCameraModal({ isOpen: false, caseId: null, type: null });
        }
    };

    const statCards = [
        { title: "Pending Payout", value: `৳${stats.pendingPayout.toLocaleString()}`, icon: <DollarSign className="h-5 w-5 text-primary" />, color: "bg-blue-100" },
        { title: "Payouts Received", value: `৳${stats.payoutsReceived.toLocaleString()}`, icon: <Banknote className="h-5 w-5 text-green-600" />, color: "bg-green-100" },
        { title: "Platform Dues", value: `৳${stats.platformDues.toLocaleString()}`, icon: <HandCoins className="h-5 w-5 text-red-600" />, color: "bg-red-100", action: () => stats.platformDues > 0 && setIsPayDuesOpen(true) },
        { title: "Expected Revenue", value: `৳${stats.expectedRevenue.toLocaleString()}`, icon: <Activity className="h-5 w-5 text-orange-600" />, color: "bg-orange-100" },
        { title: "Acceptance Rate", value: `${stats.acceptanceRate.toFixed(1)}%`, icon: <Percent className="h-5 w-5 text-indigo-600" />, color: "bg-indigo-100" },
        { title: "Average Rating", value: `${stats.avgRating.toFixed(1)}/5`, icon: <Star className="h-5 w-5 text-yellow-500" />, color: "bg-yellow-100" },
        { title: "Pending Treatment Payment", value: `৳${stats.pendingTreatmentPayment.toLocaleString()}`, icon: <CreditCard className="h-5 w-5 text-pink-600" />, color: "bg-pink-100" },
    ];

    const renderActivity = (activity) => {
        const { type, data, timestamp } = activity;
        const timeAgo = format(new Date(timestamp), 'PPp');
        switch (type) {
            case 'NEW_CASE':
                return <><Briefcase className="h-4 w-4 text-blue-500 flex-shrink-0" /> <p className="text-sm">New case <strong>{data.id}</strong> available for proposal. <span className="text-xs text-gray-400 ml-2">{timeAgo}</span></p></>;
            case 'PROPOSAL_ACCEPTED':
                return <><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> <p className="text-sm">Proposal for case <strong>{data.case_id}</strong> was accepted. <span className="text-xs text-gray-400 ml-2">{timeAgo}</span></p></>;
            case 'PAYOUT':
                return <><Banknote className="h-4 w-4 text-purple-500 flex-shrink-0" /> <p className="text-sm">A payout of <strong>৳{data.amount.toLocaleString()}</strong> was sent. <span className="text-xs text-gray-400 ml-2">{timeAgo}</span></p></>;
            case 'NEW_REVIEW':
                return <><Star className="h-4 w-4 text-yellow-500 flex-shrink-0" /> <p className="text-sm">Received a new <strong>{data.rating}-star</strong> review. <span className="text-xs text-gray-400 ml-2">{timeAgo}</span></p></>;
            default:
                return <><Info className="h-4 w-4 text-gray-500 flex-shrink-0" /> <p className="text-sm">{type.replace(/_/g, ' ').toLowerCase()} <span className="text-xs text-gray-400 ml-2">{timeAgo}</span></p></>;
        }
    };
    
    if (authLoading || dataLoading || !doctorDetails) {
        return <LoadingIndicator />;
    }
    
    if (!authUser) {
        return null;
    }

    if (!doctorDetails.is_verified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md text-center">
                    <CardHeader><AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" /><CardTitle>Profile Under Review</CardTitle><CardDescription>Your doctor profile is currently being verified by our admin team. You will receive an email notification once approved.</CardDescription></CardHeader>
                    <CardContent><Button onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Logout</Button></CardContent>
                </Card>
            </div>
        );
    }

    const StatCard = ({ title, value, icon, color, action }) => (
        <Card className={`shadow-md border-0 ${action ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`} onClick={action}>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${color}`}>
                    {icon}
                </div>
            </CardContent>
        </Card>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'accepted':
                return (
                    <Card>
                        <CardHeader><CardTitle>Accepted Patients</CardTitle><CardDescription>Manage your ongoing treatments.</CardDescription></CardHeader>
                        <CardContent>
                            {acceptedPatients.length === 0 ? <div className="text-center py-8"><Users className="h-12 w-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-500">No accepted patients yet.</p></div> : (
                                <div className="space-y-4">
                                    {acceptedPatients.map(c => (
                                        <Collapsible key={c.id} className="border rounded-lg">
                                            <div className="p-4">
                                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                                    <div className="flex items-center space-x-4">
                                                        <Avatar className="h-12 w-12"><AvatarImage src={c.patientInfo?.avatar} /><AvatarFallback>{c.patientInfo?.name?.charAt(0)}</AvatarFallback></Avatar>
                                                        <div>
                                                            <h3 className="font-semibold">{c.patientInfo?.name}</h3>
                                                            <p className="text-sm text-gray-600">{c.title}</p>
                                                            <p className="text-sm font-bold mt-1">Cost: ৳{c.proposalInfo?.cost.toLocaleString()}</p>
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
                                                                <PlayCircle className="h-4 w-4 mr-2" /> Start Treatment
                                                            </Button>
                                                        )}
                                                        {c.status === 'treatment_started' && (
                                                            <Button size="sm" onClick={() => setCameraModal({ isOpen: true, caseId: c.id, type: 'end' })}>
                                                                <Square className="h-4 w-4 mr-2" /> Complete Treatment
                                                            </Button>
                                                        )}
                                                        <Button size="sm" variant="outline" asChild><a href={`tel:${c.patientInfo?.phone}`}><Phone className="h-4 w-4 mr-2" />Call</a></Button>
                                                        <Button size="sm" onClick={() => navigate(`/chat/${c.id}`)}><MessageSquare className="h-4 w-4 mr-2" />Chat</Button>
                                                        <Button size="sm" variant="destructive" onClick={() => setSelectedCaseForIssue(c)}><AlertTriangle className="h-4 w-4 mr-2" />Report</Button>
                                                    </div>
                                                    <CollapsibleTrigger asChild>
                                                        <Button variant="ghost" size="sm">Details <ChevronDown className="h-4 w-4 ml-1" /></Button>
                                                    </CollapsibleTrigger>
                                                </div>
                                            </div>
                                            <CollapsibleContent className="p-4 pt-0">
                                                <div className="bg-gray-50/50 p-3 rounded-lg space-y-2 text-xs text-gray-500">
                                                    <p><span className="font-medium text-gray-700">Case ID:</span> {c.id}</p>
                                                    <p><span className="font-medium text-gray-700">Submitted:</span> {format(new Date(c.created_at), 'PPp')}</p>
                                                    <p><span className="font-medium text-gray-700">Proposal ID:</span> {c.proposalInfo.id}</p>
                                                    {c.status === 'completed' && c.updated_at && <p><span className="font-medium text-gray-700">Completed:</span> {format(new Date(c.updated_at), 'PPp')}</p>}
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            case 'available':
                return (
                    <Card>
                        <CardHeader><CardTitle>Available Cases</CardTitle><CardDescription>New cases are waiting for your proposal.</CardDescription></CardHeader>
                        <CardContent>
                            {availableCases.length === 0 ? <div className="text-center py-8"><Users className="h-12 w-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-500">No new cases available.</p></div> : (
                                <div className="space-y-4">
                                    {availableCases.map((case_) => (
                                        <Collapsible key={case_.id} className="border rounded-lg">
                                            <div className="p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h3 className="font-medium text-sm">{case_.title}</h3>
                                                        <p className="text-xs text-gray-500">Case ID: {case_.id}</p>
                                                    </div>
                                                    {case_.proposal_deadline && <CountdownTimer deadline={case_.proposal_deadline} />}
                                                </div>
                                                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{case_.description}</p>
                                                <div className="flex justify-between items-center">
                                                    <Button size="sm" className="w-full sm:w-auto" onClick={() => setSelectedCaseForProposal(case_)}><Send className="h-4 w-4 mr-2" />Submit Proposal</Button>
                                                    <CollapsibleTrigger asChild>
                                                        <Button variant="ghost" size="sm">Details <ChevronDown className="h-4 w-4 ml-1" /></Button>
                                                    </CollapsibleTrigger>
                                                </div>
                                            </div>
                                            <CollapsibleContent className="p-4 pt-0">
                                                <div className="bg-gray-50/50 p-3 rounded-lg space-y-2 text-xs text-gray-500">
                                                    <p><span className="font-medium text-gray-700">Submitted:</span> {format(new Date(case_.created_at), 'PPp')}</p>
                                                    <p><span className="font-medium text-gray-700">Urgency:</span> <Badge variant="outline">{case_.urgency}</Badge></p>
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            case 'proposals':
                return (
                    <Card>
                        <CardHeader><CardTitle>My Proposals</CardTitle><CardDescription>Manage your submitted proposals.</CardDescription></CardHeader>
                        <CardContent>
                            {myProposals.length === 0 ? <p className="text-center text-gray-500 py-8">No proposals submitted yet.</p> : (
                                <div className="space-y-4">
                                    {myProposals.map(proposal => {
                                        const caseInfo = cases.find(c => c.id === proposal.case_id);
                                        const patientInfo = users.find(u => u.auth_id === proposal.patient_id);
                                        const isCompleted = caseInfo?.status === 'completed';
                                        const pdfData = { caseData: caseInfo, proposal, patient: patientInfo, doctor: doctorDetails, settings };
                                        const existingPrescription = prescriptions.find(p => p.case_id === caseInfo?.id);
                                        
                                        const acceptedStatuses = ['accepted', 'treatment_started', 'in-progress', 'completed', 'proposal_accepted'];
                                        const displayStatus = acceptedStatuses.includes(proposal.status) && caseInfo ? caseInfo.status : proposal.status;

                                        return (
                                            <Collapsible key={proposal.id} className="border rounded-lg">
                                                <div className="p-4">
                                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                                        <div>
                                                            <h3 className="font-semibold">Case: {caseInfo?.title || 'N/A'}</h3>
                                                            <p className="text-sm text-gray-500">Patient: {patientInfo?.name || 'N/A'}</p>
                                                            <div className="flex items-baseline gap-2 mt-1">
                                                                <p className="text-sm font-bold">Cost: ৳{proposal.cost?.toLocaleString()}</p>
                                                                {proposal.previous_cost && (
                                                                    <p className="text-xs text-gray-500 line-through opacity-70">৳{proposal.previous_cost.toLocaleString()}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end space-y-2 self-start sm:self-auto">
                                                            {getCaseStatusBadge(displayStatus)}
                                                            {isCompleted && caseInfo?.payment_status && getPaymentStatusBadge(caseInfo.payment_status)}
                                                        </div>
                                                    </div>
                                                    <div className="border-t mt-4 pt-3 flex items-center justify-between flex-wrap gap-2">
                                                        <div className="flex items-center gap-2">
                                                            {proposal.status === 'pending' && (
                                                                <Button size="sm" variant="outline" onClick={() => handleEditProposal(proposal)}>
                                                                    <Edit className="h-4 w-4 mr-2" /> Edit Cost
                                                                </Button>
                                                            )}
                                                            {isCompleted && (
                                                                <>
                                                                    <Button size="sm" variant="outline" onClick={() => setModalContent({ type: 'invoice', data: pdfData })}>
                                                                        <FileDown className="h-4 w-4 mr-2" /> Invoice
                                                                    </Button>
                                                                    <Button size="sm" variant="outline" onClick={() => setModalContent({ type: 'prescription', data: { ...pdfData, existingPrescription } })}>
                                                                        <FileText className="h-4 w-4 mr-2" /> Prescription
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                        <CollapsibleTrigger asChild>
                                                            <Button variant="ghost" size="sm">Details <ChevronDown className="h-4 w-4 ml-1" /></Button>
                                                        </CollapsibleTrigger>
                                                    </div>
                                                </div>
                                                <CollapsibleContent className="p-4 pt-0">
                                                    <div className="bg-gray-50/50 p-3 rounded-lg space-y-2 text-xs text-gray-500">
                                                        <p><span className="font-medium text-gray-700">Proposal ID:</span> {proposal.id}</p>
                                                        <p><span className="font-medium text-gray-700">Submitted:</span> {format(new Date(proposal.created_at), 'PPp')}</p>
                                                        <p><span className="font-medium text-gray-700">Case ID:</span> {proposal.case_id}</p>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            case 'schedule':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Set Your Schedule</CardTitle>
                                    <CardDescription>Define your weekly working hours and days.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label>Working Days</Label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
                                                <Button
                                                    key={day}
                                                    variant={availability.days[String(dayIndex)] ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleDayToggle(dayIndex)}
                                                    className="flex-1"
                                                >
                                                    {day}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="startTime">Start Time</Label>
                                            <Input id="startTime" type="time" value={availability.startTime} onChange={(e) => handleAvailabilityChange('startTime', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="endTime">End Time</Label>
                                            <Input id="endTime" type="time" value={availability.endTime} onChange={(e) => handleAvailabilityChange('endTime', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
                                        <Select value={String(availability.slotDuration)} onValueChange={(val) => handleAvailabilityChange('slotDuration', parseInt(val))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="15">15 minutes</SelectItem>
                                                <SelectItem value="30">30 minutes</SelectItem>
                                                <SelectItem value="45">45 minutes</SelectItem>
                                                <SelectItem value="60">60 minutes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleSaveAvailability} className="w-full">Save Schedule</Button>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>My Appointments</CardTitle>
                                    <CardDescription>View your scheduled appointments.</CardDescription>
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
                                            <h4 className="font-semibold text-center">{selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}</h4>
                                            {doctorAppointments.filter(a => format(parseISO(a.appointment_time), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                                                doctorAppointments
                                                    .filter(a => format(parseISO(a.appointment_time), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
                                                    .map(app => {
                                                        const patient = users.find(u => u.auth_id === app.patient_id);
                                                        return (
                                                            <div key={app.id} className="p-2 border rounded-md bg-blue-50">
                                                                <p className="font-semibold text-sm">{format(parseISO(app.appointment_time), 'p')}</p>
                                                                <p className="text-xs text-gray-600">Patient: {patient?.name}</p>
                                                                <p className="text-xs text-gray-500">Case: {app.case_id}</p>
                                                            </div>
                                                        );
                                                    })
                                            ) : (
                                                <p className="text-sm text-gray-500 text-center pt-8">No appointments for this day.</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const TabButton = ({ tabName, icon, label }) => (
        <button onClick={() => handleTabClick(tabName)} className={`relative flex flex-col items-center justify-center text-xs font-medium ${activeTab === tabName ? 'text-primary' : 'text-gray-500'}`}>
            {icon}
            {label}
            {unreadCounts[tabName] > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">{unreadCounts[tabName]}</Badge>
            )}
        </button>
    );

    return (
        <>
            <Helmet><title>Doctor Dashboard - DentaLink</title><meta name="description" content="Analytics and management hub for doctors." /></Helmet>
            <div className="min-h-screen bg-gray-50 pb-24">
                <header className="bg-white shadow-sm border-b sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <h1 className="text-xl md:text-2xl font-bold text-gradient">Doctor Dashboard</h1>
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => navigate('/doctor/shop')}><ShoppingCart className="h-5 w-5" /></Button>
                                <Avatar><AvatarImage src={doctorDetails.avatar} /><AvatarFallback>{doctorDetails.name?.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback></Avatar>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Dr. {doctorDetails.name}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => navigate('/profile')}><UserCog className="h-4 w-4 mr-2" />Profile</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsPayoutSettingsOpen(true)}><Settings className="h-4 w-4 mr-2" />Payout Settings</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsBreakdownOpen(true)}><BarChart2 className="h-4 w-4 mr-2" />My Financials</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsViewIssuesOpen(true)}><AlertTriangle className="h-4 w-4 mr-2" />My Issues ({reportedIssues.length})</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600"><LogOut className="h-4 w-4 mr-2" />Logout</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                            {statCards.map((stat, index) => (
                                <StatCard key={index} {...stat} />
                            ))}
                        </div>

                        <div className="grid lg:grid-cols-3 gap-8 mb-8">
                            <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                                <Card>
                                    <CardHeader><CardTitle>30-Day Revenue</CardTitle><CardDescription>Total revenue from all completed cases in the last 30 days.</CardDescription></CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `৳${value / 1000}k`} />
                                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)', border: '1px solid #e2e8f0' }} formatter={(value) => [`৳${value.toLocaleString()}`, 'Revenue']} />
                                                <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                                <Card>
                                    <CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>Your latest notifications.</CardDescription></CardHeader>
                                    <CardContent>
                                        <div className="space-y-3 max-h-[250px] overflow-y-auto">
                                            {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                                                <div key={index} className="flex items-start space-x-3">
                                                    {renderActivity(activity)}
                                                </div>
                                            )) : <p className="text-center text-gray-500 py-8">No recent activity.</p>}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                        
                        {renderContent()}

                    </motion.div>
                </main>

                <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-top z-50">
                    <div className="grid grid-cols-4 h-16">
                        <TabButton tabName="accepted" icon={<CheckCircle className="h-5 w-5 mb-1" />} label="Accepted" />
                        <TabButton tabName="available" icon={<Briefcase className="h-5 w-5 mb-1" />} label="Available" />
                        <TabButton tabName="proposals" icon={<FileSignature className="h-5 w-5 mb-1" />} label="Proposals" />
                        <TabButton tabName="schedule" icon={<CalendarDays className="h-5 w-5 mb-1" />} label="Schedule" />
                    </div>
                </div>

                <Dialog open={!!selectedCaseForProposal} onOpenChange={() => setSelectedCaseForProposal(null)}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader><DialogTitle>Submit Proposal for "{selectedCaseForProposal?.title}"</DialogTitle><DialogDescription>Detail your treatment plan. Case ID: {selectedCaseForProposal?.id}</DialogDescription></DialogHeader>
                        <div className="bg-gray-50 rounded-lg p-4 my-4 space-y-4">
                            <div><h3 className="font-semibold mb-2">{selectedCaseForProposal?.title}</h3><p className="text-gray-600 mb-2">{selectedCaseForProposal?.description}</p></div>
                            <div>
                                <h4 className="font-semibold mb-2 text-sm">Patient Attachments</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedCaseForProposal?.images?.map((url, index) => (
                                        <div key={`img-${index}`} className="relative group">
                                            <img src={url} alt={`Patient attachment ${index + 1}`} className="h-20 w-20 object-cover rounded-md cursor-pointer" onClick={() => setLightboxImage(url)} />
                                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Eye className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedCaseForProposal?.images || selectedCaseForProposal.images.length === 0) && (<p className="text-xs text-gray-500">No attachments provided.</p>)}
                                </div>
                            </div>
                        </div>
                        <form id="proposal-form" onSubmit={handleSubmitProposalForm} className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="treatmentPlan">Treatment Plan</Label><Textarea id="treatmentPlan" placeholder="Describe your proposed treatment plan..." value={proposalForm.treatmentPlan} onChange={(e) => setProposalForm(prev => ({ ...prev, treatmentPlan: e.target.value }))} rows={4} required /></div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label htmlFor="cost">Treatment Cost (৳)</Label><Input id="cost" type="number" placeholder="Enter cost in BDT" value={proposalForm.cost} onChange={(e) => setProposalForm(prev => ({ ...prev, cost: e.target.value }))} required /></div>
                                <div className="space-y-2"><Label htmlFor="duration">Treatment Duration</Label><Input id="duration" placeholder="e.g., 2-3 weeks" value={proposalForm.duration} onChange={(e) => setProposalForm(prev => ({ ...prev, duration: e.target.value }))} required /></div>
                            </div>
                            <div className="space-y-2"><Label htmlFor="notes">Additional Notes</Label><Textarea id="notes" placeholder="Any extra information..." value={proposalForm.notes} onChange={(e) => setProposalForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} /></div>
                        </form>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="proposal-form"><Send className="h-4 w-4 mr-2" />Submit</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!editingProposal} onOpenChange={() => setEditingProposal(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Proposal Cost</DialogTitle>
                            <DialogDescription>Update the treatment cost for this proposal.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-cost">New Treatment Cost (৳)</Label>
                                <Input
                                    id="edit-cost"
                                    type="number"
                                    value={editingProposal?.cost || ''}
                                    onChange={(e) => setEditingProposal(prev => ({ ...prev, cost: e.target.value }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleUpdateProposalCost}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isPayoutSettingsOpen} onOpenChange={setIsPayoutSettingsOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader><DialogTitle>Payout Settings</DialogTitle><DialogDescription>Add or update your payment information to receive payouts.</DialogDescription></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2"><Label>Payout Method</Label><Select value={payoutDetails.method} onValueChange={(value) => setPayoutDetails(prev => ({ ...prev, method: value }))}><SelectTrigger><SelectValue placeholder="Select a method" /></SelectTrigger><SelectContent><SelectItem value="bank">Bank Transfer</SelectItem><SelectItem value="bkash">bKash</SelectItem></SelectContent></Select></div>
                            {payoutDetails.method === 'bank' && (<div className="space-y-4 p-4 border rounded-md"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="bankName">Bank Name</Label><Input id="bankName" value={payoutDetails.bankName} onChange={(e) => setPayoutDetails(prev => ({ ...prev, bankName: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="branchName">Branch Name</Label><Input id="branchName" value={payoutDetails.branchName} onChange={(e) => setPayoutDetails(prev => ({ ...prev, branchName: e.target.value }))} /></div></div><div className="space-y-2"><Label htmlFor="accountName">Account Holder's Name</Label><Input id="accountName" value={payoutDetails.accountName} onChange={(e) => setPayoutDetails(prev => ({ ...prev, accountName: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="accountNumber">Account Number</Label><Input id="accountNumber" value={payoutDetails.accountNumber} onChange={(e) => setPayoutDetails(prev => ({ ...prev, accountNumber: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="routingNumber">Routing Number</Label><Input id="routingNumber" value={payoutDetails.routingNumber} onChange={(e) => setPayoutDetails(prev => ({ ...prev, routingNumber: e.target.value }))} /></div></div>)}
                            {payoutDetails.method === 'bkash' && (<div className="space-y-4 p-4 border rounded-md"><div className="space-y-2"><Label htmlFor="bkashNumber">bKash Number</Label><Input id="bkashNumber" value={payoutDetails.bkashNumber} onChange={(e) => setPayoutDetails(prev => ({ ...prev, bkashNumber: e.target.value }))} /></div></div>)}
                        </div>
                        <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleSavePayoutSettings}>Save Settings</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
                
                {selectedCaseForIssue && (
                    <Dialog open={!!selectedCaseForIssue} onOpenChange={() => setSelectedCaseForIssue(null)}>
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader><DialogTitle>Report an Issue</DialogTitle><DialogDescription>Describe your issue regarding case: {selectedCaseForIssue?.title}</DialogDescription></DialogHeader>
                            <div className="bg-gray-50 rounded-lg p-4 my-4 space-y-3">
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Case Details</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><span className="font-medium">Case ID:</span> {selectedCaseForIssue.id}</div>
                                        <div><span className="font-medium">Patient:</span> {selectedCaseForIssue.patientInfo?.name}</div>
                                        <div><span className="font-medium">Status:</span> {selectedCaseForIssue.status}</div>
                                        <div><span className="font-medium">Cost:</span> ৳{selectedCaseForIssue.proposalInfo?.cost?.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600"><span className="font-medium">Description:</span> {selectedCaseForIssue.description}</p>
                                </div>
                            </div>
                            <form id="issue-form" onSubmit={handleIssueSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="issueCategory">Issue Category</Label>
                                    <Select value={issueForm.category} onValueChange={(value) => setIssueForm(prev => ({ ...prev, category: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select issue category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {doctorIssueCategories.map(cat => (
                                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label htmlFor="issueTitle">Issue Title</Label><Input id="issueTitle" value={issueForm.title} onChange={(e) => setIssueForm(prev => ({ ...prev, title: e.target.value }))} required /></div>
                                <div className="space-y-2"><Label htmlFor="issueDescription">Description</Label><Textarea id="issueDescription" value={issueForm.description} onChange={(e) => setIssueForm(prev => ({ ...prev, description: e.target.value }))} required /></div>
                                <div className="space-y-2">
                                    <Label htmlFor="attachments">Attach Evidence (optional)</Label>
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
                                                {issueForm.attachments.length > 0 ? `${issueForm.attachments.length} files attached` : 'Click to upload evidence files'}
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
                            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="issue-form">Submit Issue</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                <Dialog open={isViewIssuesOpen} onOpenChange={setIsViewIssuesOpen}>
                    <DialogContent className="sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>My Reported Issues</DialogTitle>
                            <DialogDescription>Track the status of all issues you have reported.</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                            {reportedIssues.length === 0 ? (
                                <div className="text-center py-8">
                                    <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">No issues reported yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reportedIssues.map(issue => {
                                        const caseInfo = cases.find(c => c.id === issue.case_id);
                                        const patientInfo = users.find(u => u.auth_id === caseInfo?.patient_id);
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
                                                    <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs">
                                                        <h4 className="font-semibold mb-1">Related Case</h4>
                                                        <p><span className="font-medium">Case:</span> {caseInfo.title}</p>
                                                        <p><span className="font-medium">Patient:</span> {patientInfo?.name}</p>
                                                        <p><span className="font-medium">Case ID:</span> {caseInfo.id}</p>
                                                        <p><span className="font-medium">Status:</span> {caseInfo.status}</p>
                                                    </div>
                                                )}
                                                {issue.evidence_urls && issue.evidence_urls.length > 0 && (
                                                    <div className="mb-3">
                                                        <h4 className="font-semibold text-sm mb-2">Attachments</h4>
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
                                                <p className="text-xs text-gray-500">Reported on: {new Date(issue.created_at).toLocaleString()}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button>Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isPayDuesOpen} onOpenChange={setIsPayDuesOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Pay Platform Dues</DialogTitle>
                            <DialogDescription>Settle your outstanding commission for cash-paid cases.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-gray-600">Total amount due:</p>
                            <p className="text-3xl font-bold">৳{stats.platformDues.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-2">This amount is the platform commission from cases where you received payment directly from the patient in cash.</p>
                            <div className="text-center text-sm text-gray-500 p-4 bg-yellow-50 rounded-md mt-4">
                                <p>You will be redirected to a secure payment gateway to complete your transaction.</p>
                                <p>(This is a simulation)</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handlePayDues}>Pay Now</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Your Financial Breakdown</DialogTitle>
                            <DialogDescription>A detailed overview of your financial activities.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <FinancialBreakdown doctorData={doctorFinancialData} transactions={transactions} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button>Close</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!modalContent} onOpenChange={() => setModalContent(null)}>
                    <DialogContent className="max-w-4xl">
                        {modalContent?.type === 'invoice' && (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Invoice</DialogTitle>
                                    <DialogDescription>Review the invoice below. Click Download to get the PDF.</DialogDescription>
                                </DialogHeader>
                                <div className="max-h-[70vh] overflow-y-auto p-1" id="invoice-content">
                                    <Invoice {...modalContent.data} />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => handleDownloadPdf('invoice', modalContent.data)}>
                                        <FileDown className="h-4 w-4 mr-2" />
                                        Download PDF
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                        {modalContent?.type === 'prescription' && (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Prescription</DialogTitle>
                                    <DialogDescription>Review, edit, and save the prescription. Click Download to get the PDF.</DialogDescription>
                                </DialogHeader>
                                <div className="max-h-[70vh] overflow-y-auto p-1" id="prescription-content">
                                    <Prescription {...modalContent.data} onSave={handleSavePrescription} isDoctor={true} />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => handleDownloadPdf('prescription', modalContent.data)}>
                                        <FileDown className="h-4 w-4 mr-2" />
                                        Download PDF
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>


                <Dialog open={cameraModal.isOpen} onOpenChange={(open) => !open && setCameraModal({ isOpen: false, caseId: null, type: null })}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Take Treatment Photo</DialogTitle>
                            <DialogDescription>
                                Take a live photo as proof of treatment ({cameraModal.type}). This is mandatory.
                            </DialogDescription>
                        </DialogHeader>
                        <LiveCamera
                            onCapture={handlePhotoCapture}
                            onCancel={() => setCameraModal({ isOpen: false, caseId: null, type: null })}
                        />
                    </DialogContent>
                </Dialog>

                <ImageLightbox imageUrl={lightboxImage} onOpenChange={setLightboxImage} />
            </div>
        </>
    );
};

export default DoctorDashboard;
