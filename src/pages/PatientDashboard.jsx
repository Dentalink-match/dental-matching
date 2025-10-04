import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    import { toast } from '@/components/ui/use-toast';
    import { FileText, LogOut, Send, CheckCircle, Briefcase, UserCog, FileDown, Star, Phone, MessageSquare, Activity, Hand, Upload, Eye, Calendar as CalendarIcon, Wallet as WalletIcon, X, ShieldCheck, ShieldX, Hourglass, ThumbsUp, Scale, FileWarning, CreditCard, CalendarDays, PlusCircle, Clock, Info, ChevronDown, ShoppingCart } from 'lucide-react';
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
    import ImageLightbox from '@/components/ImageLightbox';
    import StarRating from '@/components/ui/StarRating';
    import { format, parseISO, getDay, startOfDay } from 'date-fns';
    import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuLabel,
      DropdownMenuSeparator,
      DropdownMenuTrigger,
    } from "@/components/ui/dropdown-menu";
    import { Calendar } from '@/components/ui/calendar';
    import { cn } from "@/lib/utils";
    import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
    import LoadingIndicator from '@/components/LoadingIndicator';
    import { supabase } from '@/lib/customSupabaseClient';

    const PatientDashboard = () => {
      const navigate = useNavigate();
      const { user: patient, userData, signOut, loading: authLoading } = useAuth();
      const { 
        cases, proposals, users, settings, issues, prescriptions, reviews, transactions, appointments, 
        loading: dataLoading, refetchData, submitIssue, submitReview, bookAppointment
      } = useData();

      const [myCases, setMyCases] = useState([]);
      const [selectedCaseForIssue, setSelectedCaseForIssue] = useState(null);
      const [issueForm, setIssueForm] = useState({ title: '', description: '', category: '', attachments: [] });
      const [modalContent, setModalContent] = useState(null);
      const [lightboxImage, setLightboxImage] = useState(null);
      const [reviewModalCase, setReviewModalCase] = useState(null);
      const [reviewRating, setReviewRating] = useState(0);
      const [reviewComment, setReviewComment] = useState('');
      const [reportedIssues, setReportedIssues] = useState([]);
      const [appointmentModalCase, setAppointmentModalCase] = useState(null);
      const [selectedDate, setSelectedDate] = useState(null);
      const [selectedTime, setSelectedTime] = useState('');
      const [availableSlots, setAvailableSlots] = useState([]);
      const [patientAppointments, setPatientAppointments] = useState([]);
      const [activeTab, setActiveTab] = useState('cases');
      const [pendingPayment, setPendingPayment] = useState(0);

      useEffect(() => {
        if (!authLoading && !patient) {
          navigate('/login');
        }
      }, [patient, authLoading, navigate]);

      useEffect(() => {
        if (!patient || !cases) return;

        const userCases = cases.filter(c => c.patient_id === patient.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const casesWithDetails = userCases.map(c => {
          const caseProposals = proposals.filter(p => p.case_id === c.id);
          const chosenProposal = caseProposals.find(p => p.id === c.chosen_proposal_id);
          const doctor = chosenProposal ? users.find(u => u.auth_id === chosenProposal.doctor_id) : null;
          const caseReviews = reviews.filter(r => r.case_id === c.id);
          const paymentTransaction = transactions.find(t => t.case_id === c.id && t.type === 'treatment_payment');
          return { ...c, proposals: caseProposals, chosenProposal, doctor, reviews: caseReviews, paymentTransaction };
        });
        setMyCases(casesWithDetails);

        const myIssues = (issues || []).filter(i => i.reporter_id === patient.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        setReportedIssues(myIssues);

        const myAppointments = (appointments || []).filter(a => a.patient_id === patient.id).sort((a, b) => parseISO(a.appointment_time) - parseISO(b.appointment_time));
        setPatientAppointments(myAppointments);
        
        const pendingPaymentCases = cases.filter(c => c.patient_id === patient.id && c.status === 'completed' && c.payment_status === 'unpaid');
        const totalPending = pendingPaymentCases.reduce((acc, currentCase) => {
            const proposal = proposals.find(p => p.id === currentCase.chosen_proposal_id);
            return acc + (proposal?.cost || 0);
        }, 0);
        setPendingPayment(totalPending);

      }, [cases, proposals, patient, users, reviews, issues, appointments, transactions]);

      useEffect(() => {
        if (appointmentModalCase && selectedDate) {
          const doctor = users.find(u => u.auth_id === appointmentModalCase.chosenProposal.doctor_id);
          if (doctor?.availability) {
            const { days, startTime, endTime, slotDuration } = doctor.availability;
            const dayOfWeek = getDay(selectedDate);
            if (days && days[dayOfWeek]) {
              const slots = [];
              let currentTime = new Date(selectedDate);
              const [startHour, startMinute] = startTime.split(':').map(Number);
              currentTime.setHours(startHour, startMinute, 0, 0);

              const [endHour, endMinute] = endTime.split(':').map(Number);
              const endDateTime = new Date(selectedDate);
              endDateTime.setHours(endHour, endMinute, 0, 0);

              while (currentTime < endDateTime) {
                const slotTime = format(currentTime, 'HH:mm');
                const isBooked = (appointments || []).some(app => app.doctor_id === doctor.auth_id && format(parseISO(app.appointment_time), 'yyyy-MM-dd HH:mm') === format(currentTime, 'yyyy-MM-dd HH:mm'));
                if (!isBooked) {
                  slots.push(slotTime);
                }
                currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
              }
              setAvailableSlots(slots);
            } else {
              setAvailableSlots([]);
            }
          }
        } else {
          setAvailableSlots([]);
        }
      }, [appointmentModalCase, selectedDate, users, appointments]);

      const handleLogout = async () => {
        await signOut();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        navigate('/');
      };

      const handlePayment = (caseId) => {
        navigate(`/patient/wallet?caseId=${caseId}`);
      };

      const handleCashPayment = async (caseId) => {
        try {
          const { error } = await supabase
            .from('cases')
            .update({ payment_status: 'paid_in_cash' })
            .eq('id', caseId);

          if (error) throw error;

          toast({ title: "Cash Payment Noted", description: "Your payment will be confirmed by the doctor." });
          refetchData();
        } catch (error) {
          console.error("Error updating payment status:", error);
          toast({ title: "Error", description: "Could not update payment status. " + error.message, variant: "destructive" });
        }
      };

      const getCaseStatusBadge = (status) => {
        switch (status) {
          case 'pending_assignment': return <Badge className="bg-gray-100 text-gray-800 flex items-center"><Hourglass className="h-3 w-3 mr-1"/>Pending Assignment</Badge>;
          case 'open': return <Badge className="bg-blue-100 text-blue-800 flex items-center"><Scale className="h-3 w-3 mr-1"/>Open for Proposals</Badge>;
          case 'proposal_accepted': return <Badge className="bg-purple-100 text-purple-800 flex items-center"><ThumbsUp className="h-3 w-3 mr-1"/>Proposal Accepted</Badge>;
          case 'in-progress': return <Badge className="bg-yellow-100 text-yellow-800 flex items-center"><CalendarDays className="h-3 w-3 mr-1"/>Appointment Confirmed</Badge>;
          case 'treatment_started': return <Badge className="bg-orange-100 text-orange-800 flex items-center"><Activity className="h-3 w-3 mr-1"/>In Progress</Badge>;
          case 'completed': return <Badge className="bg-green-100 text-green-800 flex items-center"><CheckCircle className="h-3 w-3 mr-1"/>Completed</Badge>;
          case 'cancelled': return <Badge className="bg-red-100 text-red-800 flex items-center"><X className="h-3 w-3 mr-1"/>Cancelled</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
        }
      };

      const getPaymentStatusBadge = (status) => {
        switch (status) {
          case 'paid': return <Badge className="bg-green-100 text-green-800 flex items-center"><ShieldCheck className="h-3 w-3 mr-1"/>Paid Online</Badge>;
          case 'paid_in_cash': return <Badge className="bg-teal-100 text-teal-800 flex items-center"><Hand className="h-3 w-3 mr-1"/>Paid in Cash</Badge>;
          case 'unpaid':
          default: return <Badge variant="destructive" className="flex items-center"><ShieldX className="h-3 w-3 mr-1"/>Unpaid</Badge>;
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

      const patientIssueCategories = [
        { value: 'doctor_communication', label: 'Doctor Communication Issue' },
        { value: 'treatment_quality', label: 'Treatment Quality Concern' },
        { value: 'billing_discrepancy', label: 'Billing Discrepancy' },
        { value: 'platform_technical', label: 'Platform Technical Issue' },
        { value: 'scheduling_problem', label: 'Scheduling Problem' },
        { value: 'privacy_concern', label: 'Privacy Concern' },
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

      const handleIssueSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCaseForIssue) return;
        try {
          await submitIssue({
            case_id: selectedCaseForIssue.id,
            reporter_id: patient.id,
            reporter_name: userData.name,
            ...issueForm
          });
          toast({ title: "Issue Reported", description: "Your issue has been submitted to the admin team." });
          setSelectedCaseForIssue(null);
          setIssueForm({ title: '', description: '', category: '', attachments: [] });
          refetchData();
        } catch (error) {
          toast({ title: "Error", description: "Could not submit issue.", variant: "destructive" });
        }
      };

      const handleDownloadPdf = async (type, data) => {
        setModalContent({ type, data });
        setTimeout(async () => {
          const elementId = type === 'invoice' ? 'invoice-content' : 'prescription-content';
          const fileName = `${type}-${data.caseData.id}`;
          await generatePdf(elementId, fileName);
          setModalContent(null);
        }, 500);
      };

      const handleReviewSubmit = async () => {
        if (!reviewModalCase || reviewRating === 0) {
          toast({ title: "Incomplete Review", description: "Please provide a rating.", variant: "destructive" });
          return;
        }
        try {
          await submitReview({
            case_id: reviewModalCase.id,
            reviewer_id: patient.id,
            reviewee_id: reviewModalCase.doctor.auth_id,
            rating: reviewRating,
            comment: reviewComment,
          });
          toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
          setReviewModalCase(null);
          setReviewRating(0);
          setReviewComment('');
          refetchData();
        } catch (error) {
          toast({ title: "Error", description: "Could not submit review.", variant: "destructive" });
        }
      };

      const handleBookAppointment = async () => {
        if (!appointmentModalCase || !selectedDate || !selectedTime) {
          toast({ title: "Incomplete Information", description: "Please select a date and time.", variant: "destructive" });
          return;
        }
        const [hour, minute] = selectedTime.split(':').map(Number);
        const appointmentTime = new Date(selectedDate);
        appointmentTime.setHours(hour, minute, 0, 0);

        try {
          await bookAppointment({
            case_id: appointmentModalCase.id,
            patient_id: patient.id,
            doctor_id: appointmentModalCase.chosenProposal.doctor_id,
            appointment_time: appointmentTime.toISOString(),
            status: 'confirmed'
          });
          toast({ title: "Appointment Booked!", description: `Your appointment is confirmed for ${format(appointmentTime, 'PPP p')}.` });
          setAppointmentModalCase(null);
          setSelectedDate(null);
          setSelectedTime('');
          refetchData();
        } catch (error) {
          toast({ title: "Error", description: "Could not book appointment.", variant: "destructive" });
        }
      };

      if (authLoading || dataLoading) {
        return <LoadingIndicator />;
      }

      if (!patient || !userData) {
        return null;
      }

      const renderContent = () => {
        switch (activeTab) {
          case 'cases':
            return (
              <Card>
                <CardHeader><CardTitle>My Cases</CardTitle><CardDescription>Track the status and manage all your submitted cases.</CardDescription></CardHeader>
                <CardContent>
                  {myCases.length === 0 ? (
                    <div className="text-center py-12"><Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">You haven't submitted any cases yet.</p></div>
                  ) : (
                    <div className="space-y-6">
                      {myCases.map(c => {
                        const isReviewed = c.reviews && c.reviews.some(r => r.reviewer_id === patient.id);
                        const pdfData = { caseData: c, proposal: c.chosenProposal, patient: userData, doctor: c.doctor, settings };
                        const existingPrescription = prescriptions.find(p => p.case_id === c.id);
                        return (
                          <Collapsible key={c.id} className="border rounded-lg">
                            <div className="p-4">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                <div>
                                  <h3 className="font-semibold">{c.title}</h3>
                                  <p className="text-sm text-gray-600 line-clamp-2">{c.description}</p>
                                  {c.doctor && <p className="text-sm text-primary font-medium mt-1">Doctor: {c.doctor.name}</p>}
                                </div>
                                <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
                                  {getCaseStatusBadge(c.status)}
                                  {c.chosenProposal && getPaymentStatusBadge(c.payment_status)}
                                </div>
                              </div>
                              {c.chosenProposal && <p className="font-semibold mt-2">Treatment Cost: ৳{c.chosenProposal.cost.toLocaleString()}</p>}
                              <div className="border-t mt-4 pt-4 space-y-2">
                                {c.status === 'open' && (
                                  <Button className="w-full" onClick={() => navigate(`/patient/proposals/${c.id}`)}>
                                    <FileText className="h-4 w-4 mr-2" />View Proposals ({c.proposals.length})
                                  </Button>
                                )}
                                {c.chosenProposal && (c.status === 'proposal_accepted' || (c.status === 'completed' && c.payment_status === 'unpaid')) && (
                                    <div className="text-center space-y-2">
                                        <p className="text-sm font-medium">Payment Required</p>
                                        <div className="flex justify-center gap-2">
                                            <Button onClick={() => handlePayment(c.id)}><CreditCard className="h-4 w-4 mr-2" />Pay ৳{c.chosenProposal.cost.toLocaleString()}</Button>
                                            <Button variant="outline" onClick={() => handleCashPayment(c.id)}><Hand className="h-4 w-4 mr-2" />Pay in Cash</Button>
                                        </div>
                                    </div>
                                )}
                                {c.status === 'proposal_accepted' && c.payment_status !== 'unpaid' && (
                                  <Button className="w-full" onClick={() => setAppointmentModalCase(c)}><CalendarDays className="h-4 w-4 mr-2" />Book Appointment</Button>
                                )}
                                {(c.status === 'in-progress' || c.status === 'treatment_started') && c.doctor && (
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center space-x-3">
                                      <Avatar><AvatarImage src={c.doctor.avatar} /><AvatarFallback>{c.doctor.name.charAt(0)}</AvatarFallback></Avatar>
                                      <div>
                                        <p className="font-semibold">Dr. {c.doctor.name}</p>
                                        <p className="text-sm text-gray-500">{c.doctor.specialization}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button size="sm" variant="outline" asChild><a href={`tel:${c.doctor.phone}`}><Phone className="h-4 w-4 mr-2" />Call</a></Button>
                                      <Button size="sm" onClick={() => navigate(`/chat/${c.id}`)}><MessageSquare className="h-4 w-4 mr-2" />Chat</Button>
                                    </div>
                                  </div>
                                )}
                                {c.status === 'completed' && c.payment_status !== 'unpaid' && (
                                  <div className="grid grid-cols-1 gap-2">
                                    <Button variant="outline" onClick={() => setModalContent({ type: 'invoice', data: pdfData })}><FileText className="h-4 w-4 mr-2" />Invoice</Button>
                                    {existingPrescription && <Button variant="outline" onClick={() => setModalContent({ type: 'prescription', data: { ...pdfData, existingPrescription } })}><FileText className="h-4 w-4 mr-2" />Prescription</Button>}
                                    {!isReviewed && <Button onClick={() => setReviewModalCase(c)}><Star className="h-4 w-4 mr-2" />Leave a Review</Button>}
                                  </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <Button variant="destructive" size="sm" onClick={() => setSelectedCaseForIssue(c)}><FileWarning className="h-4 w-4 mr-2" />Report Issue</Button>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm">Details <ChevronDown className="h-4 w-4 ml-1" /></Button>
                                    </CollapsibleTrigger>
                                </div>
                              </div>
                            </div>
                            <CollapsibleContent className="p-4 pt-0">
                                <div className="bg-gray-50/50 p-3 rounded-lg space-y-2 text-xs text-gray-500">
                                    <p><span className="font-medium text-gray-700">Case ID:</span> {c.id}</p>
                                    <p><span className="font-medium text-gray-700">Submitted:</span> {format(new Date(c.created_at), 'PPp')}</p>
                                    {c.chosenProposal && <p><span className="font-medium text-gray-700">Proposal ID:</span> {c.chosenProposal.id}</p>}
                                    {c.status === 'completed' && c.updated_at && <p><span className="font-medium text-gray-700">Completed:</span> {format(new Date(c.updated_at), 'PPp')}</p>}
                                    {c.paymentTransaction && <p><span className="font-medium text-gray-700">Payment ID:</span> {c.paymentTransaction.id}</p>}
                                    {c.images && c.images.length > 0 && (
                                        <div className="pt-2">
                                            <h4 className="text-sm font-medium mb-2 text-gray-700">Your Attachments</h4>
                                            <div className="flex flex-wrap gap-2">
                                            {c.images.map((url, index) => (
                                                <div key={`img-${index}`} className="relative group">
                                                <img src={url} alt={`Attachment ${index + 1}`} className="h-16 w-16 object-cover rounded-md cursor-pointer" onClick={() => setLightboxImage(url)} />
                                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Eye className="h-5 w-5 text-white" /></div>
                                                </div>
                                            ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          case 'appointments':
            return (
              <Card>
                <CardHeader><CardTitle>My Appointments</CardTitle><CardDescription>View your upcoming and past appointments.</CardDescription></CardHeader>
                <CardContent>
                  {patientAppointments.length === 0 ? (
                    <div className="text-center py-12"><CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">You have no appointments scheduled.</p></div>
                  ) : (
                    <div className="space-y-4">
                      {patientAppointments.map(app => {
                        const doctor = users.find(u => u.auth_id === app.doctor_id);
                        const isPast = new Date(app.appointment_time) < new Date();
                        return (
                          <div key={app.id} className={`border rounded-lg p-4 ${isPast ? 'bg-gray-50 opacity-70' : ''}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className={`font-semibold ${isPast ? 'text-gray-600' : 'text-primary'}`}>{format(parseISO(app.appointment_time), 'PPP p')}</p>
                                <p className="text-sm text-gray-600">with Dr. {doctor?.name}</p>
                                <p className="text-xs text-gray-500">Case ID: {app.case_id}</p>
                                <p className="text-xs text-gray-500">Appointment ID: {app.id}</p>
                              </div>
                              <Badge variant={isPast ? 'outline' : 'default'}>{isPast ? 'Completed' : 'Upcoming'}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          case 'issues':
            return (
              <Card>
                <CardHeader><CardTitle>My Reported Issues</CardTitle><CardDescription>Track the status of all issues you have reported.</CardDescription></CardHeader>
                <CardContent>
                  {reportedIssues.length === 0 ? (
                    <div className="text-center py-12"><FileWarning className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No issues reported yet.</p></div>
                  ) : (
                    <div className="space-y-4">
                      {reportedIssues.map(issue => {
                        const caseInfo = cases.find(c => c.id === issue.case_id);
                        return (
                          <div key={issue.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">{getIssueStatusBadge(issue.status)}<h3 className="font-semibold">{issue.title}</h3></div>
                                <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                                <p className="text-xs text-gray-500">Issue ID: {issue.id}</p>
                              </div>
                            </div>
                            {caseInfo && (<div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs"><h4 className="font-semibold mb-1">Related Case</h4><p><span className="font-medium">Case:</span> {caseInfo.title}</p><p><span className="font-medium">Case ID:</span> {caseInfo.id}</p></div>)}
                            {issue.evidence_urls && issue.evidence_urls.length > 0 && (
                              <div className="mb-3">
                                <h4 className="font-semibold text-sm mb-2">Attachments</h4>
                                <div className="flex flex-wrap gap-2">{issue.evidence_urls.map((url, index) => (<img key={`issue-attachment-${index}`} src={url} alt={`Evidence ${index + 1}`} className="h-16 w-16 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxImage(url)} />))}</div>
                              </div>
                            )}
                            <p className="text-xs text-gray-500">Reported on: {new Date(issue.created_at).toLocaleString()}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          default:
            return null;
        }
      };

      const StatCard = ({ title, value, icon, color }) => (
        <Card className="shadow-md border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
            <div className={`p-2 rounded-full ${color}`}>
              {icon}
            </div>
          </CardContent>
        </Card>
      );

      return (
        <>
          <Helmet><title>Patient Dashboard - DentaLink</title><meta name="description" content="Manage your dental cases and treatment plans." /></Helmet>
          <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white shadow-sm border-b sticky top-0 z-40">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <h1 className="text-xl md:text-2xl font-bold text-gradient">My Dashboard</h1>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/patient/shop')}><ShoppingCart className="h-5 w-5" /></Button>
                    <Avatar><AvatarImage src={userData.avatar} /><AvatarFallback>{userData.name?.charAt(0)}</AvatarFallback></Avatar>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{userData.name}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/profile')}><UserCog className="h-4 w-4 mr-2" />Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/patient/wallet')}><WalletIcon className="h-4 w-4 mr-2" />My Wallet</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/patient/submit-case')}><Send className="h-4 w-4 mr-2" />Submit New Case</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600"><LogOut className="h-4 w-4 mr-2" />Logout</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <StatCard title="Total Cases" value={myCases.length} icon={<FileText className="h-5 w-5 text-blue-600" />} color="bg-blue-100" />
                  <StatCard title="Ongoing Cases" value={myCases.filter(c => ['in-progress', 'treatment_started'].includes(c.status)).length} icon={<Clock className="h-5 w-5 text-yellow-600" />} color="bg-yellow-100" />
                  <StatCard title="Completed Cases" value={myCases.filter(c => c.status === 'completed').length} icon={<CheckCircle className="h-5 w-5 text-green-600" />} color="bg-green-100" />
                  <StatCard title="Wallet" value={`৳${(userData.credit || 0).toLocaleString()}`} icon={<WalletIcon className="h-5 w-5 text-purple-600" />} color="bg-purple-100" />
                  <StatCard title="Pending Payments" value={`৳${pendingPayment.toLocaleString()}`} icon={<CreditCard className="h-5 w-5 text-red-600" />} color="bg-red-100" />
                </div>

                <Button className="w-full h-12 text-lg font-semibold gradient-bg text-white shadow-lg" onClick={() => navigate('/patient/submit-case')}>
                  <PlusCircle className="h-6 w-6 mr-2" />
                  Submit New Case
                </Button>

                <div className="mt-8">
                  {renderContent()}
                </div>
              </motion.div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-top z-50">
              <div className="grid grid-cols-3 h-16">
                <button
                  onClick={() => setActiveTab('cases')}
                  className={`flex flex-col items-center justify-center text-sm font-medium ${activeTab === 'cases' ? 'text-primary' : 'text-gray-500'}`}
                >
                  <Briefcase className="h-6 w-6 mb-1" />
                  Cases
                </button>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`flex flex-col items-center justify-center text-sm font-medium ${activeTab === 'appointments' ? 'text-primary' : 'text-gray-500'}`}
                >
                  <CalendarIcon className="h-6 w-6 mb-1" />
                  Appointments
                </button>
                <button
                  onClick={() => setActiveTab('issues')}
                  className={`flex flex-col items-center justify-center text-sm font-medium ${activeTab === 'issues' ? 'text-primary bg-red-50 rounded-lg' : 'text-gray-500'}`}
                >
                  <FileWarning className="h-6 w-6 mb-1" />
                  Issues
                </button>
              </div>
            </div>

            {selectedCaseForIssue && (
              <Dialog open={!!selectedCaseForIssue} onOpenChange={() => setSelectedCaseForIssue(null)}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader><DialogTitle>Report an Issue</DialogTitle><DialogDescription>Describe your issue regarding case: {selectedCaseForIssue?.title}</DialogDescription></DialogHeader>
                  <form id="issue-form" onSubmit={handleIssueSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="issueCategory">Issue Category</Label>
                      <Select value={issueForm.category} onValueChange={(value) => setIssueForm(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger><SelectValue placeholder="Select issue category" /></SelectTrigger>
                        <SelectContent>{patientIssueCategories.map(cat => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label htmlFor="issueTitle">Issue Title</Label><Input id="issueTitle" value={issueForm.title} onChange={(e) => setIssueForm(prev => ({ ...prev, title: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label htmlFor="issueDescription">Description</Label><Textarea id="issueDescription" value={issueForm.description} onChange={(e) => setIssueForm(prev => ({ ...prev, description: e.target.value }))} required /></div>
                    <div className="space-y-2">
                      <Label htmlFor="attachments">Attach Evidence (optional)</Label>
                      <div className="relative">
                        <Input id="attachments" type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => handleFileChange(e.target.files)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                        <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50">
                          <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">{issueForm.attachments.length > 0 ? `${issueForm.attachments.length} files attached` : 'Click to upload evidence files'}</p>
                        </div>
                      </div>
                    </div>
                    {issueForm.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {issueForm.attachments.map((url, index) => (<img key={`attachment-${index}`} src={url} alt={`Evidence ${index + 1}`} className="h-16 w-16 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxImage(url)} />))}
                      </div>
                    )}
                  </form>
                  <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="issue-form">Submit Issue</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={!!modalContent} onOpenChange={() => setModalContent(null)}>
              <DialogContent className="max-w-4xl">
                <div id="pdf-content">
                  {modalContent?.type === 'invoice' && <Invoice {...modalContent.data} />}
                  {modalContent?.type === 'prescription' && <Prescription {...modalContent.data} isDoctor={false} />}
                </div>
                
                {modalContent?.type === 'invoice' && (
                  <>
                    <DialogHeader><DialogTitle>Invoice</DialogTitle><DialogDescription>Review the invoice below. Click Download to get the PDF.</DialogDescription></DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1" id="invoice-content"><Invoice {...modalContent.data} /></div>
                    <DialogFooter><Button variant="outline" onClick={() => handleDownloadPdf('invoice', modalContent.data)}><FileDown className="h-4 w-4 mr-2" />Download PDF</Button></DialogFooter>
                  </>
                )}
                {modalContent?.type === 'prescription' && (
                  <>
                    <DialogHeader><DialogTitle>Prescription</DialogTitle><DialogDescription>Review the prescription from your doctor.</DialogDescription></DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1" id="prescription-content"><Prescription {...modalContent.data} isDoctor={false} /></div>
                    <DialogFooter><Button variant="outline" onClick={() => handleDownloadPdf('prescription', modalContent.data)}><FileDown className="h-4 w-4 mr-2" />Download PDF</Button></DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={!!reviewModalCase} onOpenChange={() => setReviewModalCase(null)}>
              <DialogContent>
                <DialogHeader><DialogTitle>Rate Your Doctor</DialogTitle><DialogDescription>Share your experience with Dr. {reviewModalCase?.doctor?.name} for case: {reviewModalCase?.title}</DialogDescription></DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="flex justify-center"><StarRating rating={reviewRating} setRating={setReviewRating} /></div>
                  <Textarea placeholder="Share details of your experience..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={handleReviewSubmit}>Submit Review</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={!!appointmentModalCase} onOpenChange={() => setAppointmentModalCase(null)}>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>Book Appointment</DialogTitle><DialogDescription>Select a date and time for your appointment with Dr. {appointmentModalCase?.doctor?.name}.</DialogDescription></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    disabled={(date) => date < startOfDay(new Date()) || !appointmentModalCase?.doctor?.availability?.days[getDay(date)]}
                  />
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    <h4 className="font-semibold text-center">{selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}</h4>
                    {selectedDate && availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedTime === slot ? 'default' : 'outline'}
                            onClick={() => setSelectedTime(slot)}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-gray-500 pt-8">{selectedDate ? 'No available slots for this day.' : 'Select a date to see available slots.'}</p>
                    )}
                  </div>
                </div>
                <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleBookAppointment} disabled={!selectedDate || !selectedTime}>Confirm Booking</Button></DialogFooter>
              </DialogContent>
            </Dialog>

            <ImageLightbox imageUrl={lightboxImage} onOpenChange={setLightboxImage} />
          </div>
        </>
      );
    };

    export default PatientDashboard;
