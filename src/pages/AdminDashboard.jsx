import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    import { Users, FileText, DollarSign, LogOut, UserCheck, UserX, Briefcase, TrendingUp, UserPlus, FileSignature, BarChart2, AlertTriangle, Settings, Search, AlertTriangle as AlertTriangleIcon, FilePlus, Activity, Hand, FileDown, Trash2, UserCog, Download, FileClock, Stethoscope, Eye, CreditCard, Coins as HandCoins, Menu, Map, Calendar, BrainCircuit, Users2, PiggyBank, ShoppingCart, ChevronDown } from 'lucide-react';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import { Input } from '@/components/ui/input';
    import CountdownTimer from '@/components/CountdownTimer';
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
      AlertDialogTrigger,
    } from "@/components/ui/alert-dialog";
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
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuLabel,
      DropdownMenuSeparator,
      DropdownMenuTrigger,
    } from "@/components/ui/dropdown-menu";
    import Invoice from '@/pages/Invoice';
    import Prescription from '@/pages/Prescription';
    import { generatePdf } from '@/lib/pdfGenerator';
    import { format } from 'date-fns';
    import { useSound } from '@/hooks/useSound';

    const AdminDashboard = () => {
      const navigate = useNavigate();
      const { user, signOut } = useAuth();
      const { users, cases, proposals, updateUserStatus, deleteUser, settings, issues, prescriptions, savePrescription, transactions } = useData();
      const [stats, setStats] = useState({
        totalUsers: 0,
        totalDoctors: 0,
        totalPatients: 0,
        pendingDoctors: 0,
        totalCases: 0,
        grossRevenue: 0,
        platformEarnings: 0,
        runningRevenue: 0,
        totalPaidInCash: 0,
        activeProposals: 0,
        activeTreatments: 0,
        cashCommissionDue: 0,
      });
      const [searchTerm, setSearchTerm] = useState('');
      const [activeTab, setActiveTab] = useState("newCases");
      const [modalContent, setModalContent] = useState(null);
      const playNotificationSound = useSound('/notification.mp3');
      const issuesCountRef = useRef(0);

      useEffect(() => {
        const newIssuesCount = issues.filter(i => i.status === 'new').length;
        if (newIssuesCount > issuesCountRef.current) {
          playNotificationSound();
          toast({
            title: "🚨 New Issue Reported!",
            description: "A new issue requires your attention in the Issue Management section.",
            variant: "destructive",
            duration: 10000,
          });
        }
        issuesCountRef.current = newIssuesCount;
      }, [issues, playNotificationSound, toast]);

      useEffect(() => {
        const doctors = users.filter(u => u.role === 'doctor');
        const patients = users.filter(u => u.role === 'patient');
        
        const completedProposals = proposals.filter(p => p.status === 'completed');

        const completedAndPaidProposals = completedProposals.filter(p => {
            const caseInfo = cases.find(c => c.id === p.case_id);
            return caseInfo && caseInfo.payment_status === 'paid';
        });

        const completedAndCashPaidProposals = completedProposals.filter(p => {
            const caseInfo = cases.find(c => c.id === p.case_id);
            return caseInfo && caseInfo.payment_status === 'paid_in_cash';
        });

        const runningProposals = proposals.filter(p => {
          return (p.status === 'accepted' || p.status === 'in-progress');
        });

        const grossRevenueFromPaid = completedAndPaidProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
        const grossRevenueFromCash = completedAndCashPaidProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
        const grossRevenue = grossRevenueFromPaid + grossRevenueFromCash;
        
        const runningRevenue = runningProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
        
        const allCompletedProposals = [...completedAndPaidProposals, ...completedAndCashPaidProposals];
        const platformEarnings = allCompletedProposals.reduce((acc, p) => {
          const doctor = doctors.find(d => d.id === p.doctor_id);
          const cost = p.cost || 0;
          const commissionType = doctor?.commission?.type || settings.commission_type;
          const commissionRate = doctor?.commission?.rate || settings.commission_rate;
          const commissionAmount = commissionType === 'percentage' ? cost * (Number(commissionRate) / 100) : Number(commissionRate || 0);
          return acc + commissionAmount;
        }, 0);

        const totalCommissionFromCash = completedAndCashPaidProposals.reduce((acc, p) => {
            const doctor = doctors.find(d => d.id === p.doctor_id);
            const cost = p.cost || 0;
            const commissionType = doctor?.commission?.type || settings.commission_type;
            const commissionRate = doctor?.commission?.rate || settings.commission_rate;
            const commissionAmount = commissionType === 'percentage' ? cost * (Number(commissionRate) / 100) : Number(commissionRate || 0);
            return acc + commissionAmount;
        }, 0);

        const totalCommissionPaidByDoctors = transactions.filter(t => t.type === 'commission_payment').reduce((acc, t) => acc + t.amount, 0);
        const cashCommissionDue = totalCommissionFromCash - totalCommissionPaidByDoctors;

        const activeProposals = proposals.filter(p => p.status === 'pending').length;
        const activeTreatments = cases.filter(c => c.status === 'in-progress' || c.status === 'treatment_started').length;

        setStats({
          totalUsers: users.length,
          totalDoctors: doctors.length,
          totalPatients: patients.length,
          pendingDoctors: doctors.filter(d => !d.is_verified && d.status !== 'rejected').length,
          totalCases: cases.length,
          grossRevenue,
          platformEarnings,
          runningRevenue,
          totalPaidInCash: grossRevenueFromCash,
          activeProposals,
          activeTreatments,
          cashCommissionDue,
        });
      }, [users, cases, proposals, settings, transactions]);

      const handleLogout = async () => {
        const { success } = await signOut();
        if (success) {
          toast({
            title: "Logged Out",
            description: "You have been successfully logged out.",
          });
          navigate('/');
        }
      };

      const handleUserVerification = async (userId, status) => {
        const userToUpdate = users.find(u => u.id === userId);
        if (userToUpdate) {
          const result = await updateUserStatus(userId, status);
          if (result.success) {
            toast({
              title: `Doctor ${status === 'approved' ? 'Approved' : 'Rejected'}`,
              description: `Dr. ${userToUpdate.name}'s status has been updated.`,
            });
          } else {
            toast({
              title: "Update Failed",
              description: result.error.message,
              variant: "destructive",
            });
          }
        }
      };

      const handleUserDelete = async (userToDelete) => {
        const result = await deleteUser(userToDelete.auth_id);
        if (result.success) {
          toast({
            title: "User Deleted",
            description: `${userToDelete.name} has been permanently deleted.`,
          });
        } else {
          toast({
            title: "Deletion Failed",
            description: result.error.message,
            variant: "destructive",
          });
        }
      };

      const filteredUsers = useMemo(() => {
        return users.filter(u =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }, [users, searchTerm]);

      const filteredCases = useMemo(() => {
        return cases.filter(c =>
          c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }, [cases, searchTerm]);

      const filteredProposals = useMemo(() => {
        const filtered = proposals.filter(p => {
          if (!searchTerm) return true;
          const lowercasedFilter = searchTerm.toLowerCase();
          const caseInfo = cases.find(c => c.id === p.case_id);
          return (
            p.id.toLowerCase().includes(lowercasedFilter) ||
            p.doctor_name?.toLowerCase().includes(lowercasedFilter) ||
            caseInfo?.patient_name?.toLowerCase().includes(lowercasedFilter) ||
            caseInfo?.title?.toLowerCase().includes(lowercasedFilter)
          );
        });
        return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }, [proposals, cases, searchTerm]);

      const handleDownloadPdf = async (type, data) => {
        const elementId = type === 'invoice' ? 'invoice-content' : 'prescription-content';
        const fileName = `${type}-${data.caseData.id}`;
        await generatePdf(elementId, fileName);
      };

      const handleSavePrescription = (prescriptionData) => {
        savePrescription(prescriptionData);
        toast({ title: "Prescription Saved", description: "The prescription has been updated." });
      };

      const getPaymentStatusBadge = (status) => {
        switch (status) {
          case 'paid': return <Badge className="bg-blue-100 text-blue-800 flex items-center text-xs"><CreditCard className="h-3 w-3 mr-1"/>অনলাইনে পরিশোধিত</Badge>;
          case 'paid_in_cash': return <Badge className="bg-teal-100 text-teal-800 flex items-center text-xs"><HandCoins className="h-3 w-3 mr-1"/>নগদে পরিশোধিত</Badge>;
          case 'unpaid':
          default: return <Badge variant="destructive" className="text-xs">অপরিশোধিত</Badge>;
        }
      };

      const getProposalStatusBadge = (status) => {
        switch (status) {
          case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 text-xs">অপেক্ষমান</Badge>;
          case 'accepted': return <Badge className="bg-green-100 text-green-800 text-xs">গৃহীত</Badge>;
          case 'rejected': return <Badge className="bg-red-100 text-red-800 text-xs">প্রত্যাখ্যাত</Badge>;
          case 'cancelled': return <Badge className="bg-gray-100 text-gray-800 text-xs">বাতিল</Badge>;
          case 'in_progress': return <Badge className="bg-cyan-100 text-cyan-800 text-xs">চলমান</Badge>;
          case 'completed': return <Badge className="bg-primary/20 text-primary text-xs">সম্পন্ন</Badge>;
          default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
        }
      };

      const getCaseStatusBadge = (status) => {
        switch (status) {
          case 'pending_assignment': return <Badge className="bg-gray-100 text-gray-800">অ্যাসাইনমেন্টের জন্য অপেক্ষারত</Badge>;
          case 'open': return <Badge className="bg-blue-100 text-blue-800">প্রস্তাবের জন্য উন্মুক্ত</Badge>;
          case 'proposal_accepted': return <Badge className="bg-purple-100 text-purple-800">প্রস্তাব গৃহীত</Badge>;
          case 'in-progress': return <Badge className="bg-yellow-100 text-yellow-800">চিকিৎসা শুরু</Badge>;
          case 'treatment_started': return <Badge className="bg-orange-100 text-orange-800">চলমান</Badge>;
          case 'completed': return <Badge className="bg-green-100 text-green-800">সম্পন্ন</Badge>;
          case 'cancelled': return <Badge className="bg-red-100 text-red-800">বাতিল</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
        }
      };

      const statCards = [
        { title: "Total Users", value: stats.totalUsers, icon: Users },
        { title: "Total Doctors", value: stats.totalDoctors, icon: UserPlus },
        { title: "Total Patients", value: stats.totalPatients, icon: Users },
        { title: "Pending Doctors", value: stats.pendingDoctors, icon: UserX, color: "text-yellow-600" },
        { title: "Total Cases", value: stats.totalCases, icon: Briefcase },
        { title: "Active Proposals", value: stats.activeProposals, icon: FileClock, color: "text-blue-600" },
        { title: "Active Treatments", value: stats.activeTreatments, icon: Stethoscope, color: "text-purple-600" },
      ];

      const financialStatCards = [
        { title: "Gross Revenue", value: `৳${stats.grossRevenue.toLocaleString()}`, icon: TrendingUp },
        { title: "Paid in Cash", value: `৳${stats.totalPaidInCash.toLocaleString()}`, icon: Hand, color: "text-teal-600" },
        { title: "Running Revenue", value: `৳${stats.runningRevenue.toLocaleString()}`, icon: Activity, color: "text-orange-600" },
        { title: "Platform Earnings", value: `৳${stats.platformEarnings.toLocaleString()}`, icon: DollarSign },
        { title: "Cash Commission Due", value: `৳${stats.cashCommissionDue.toLocaleString()}`, icon: HandCoins, color: "text-red-600", action: () => navigate('/admin/finance') },
      ];

      const DeleteUserDialog = ({ userToDelete }) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" className="w-full sm:w-auto">
              <Trash2 className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="mx-4 max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user account for <span className="font-bold">{userToDelete.name}</span> and remove all associated data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleUserDelete(userToDelete)} className="w-full sm:w-auto">
                Yes, delete user
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      const renderUserManagement = () => {
        const doctors = filteredUsers.filter(u => u.role === 'doctor');
        const patients = filteredUsers.filter(u => u.role === 'patient');

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Doctors</CardTitle>
                <CardDescription>Manage doctor profiles and verification status.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {doctors.map(doctor => (
                    <div key={doctor.id} className="flex flex-col space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={doctor.avatar} />
                          <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">Dr. {doctor.name}</p>
                          <p className="text-xs text-gray-500 truncate">{doctor.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {doctor.is_verified ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                        ) : doctor.status === 'rejected' ? (
                          <Badge variant="destructive" className="text-xs">Rejected</Badge>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleUserVerification(doctor.id, 'approved')} className="flex-1 sm:flex-none">
                              <UserCheck className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Approve</span>
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleUserVerification(doctor.id, 'rejected')} className="flex-1 sm:flex-none">
                              <UserX className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Reject</span>
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/user/edit/${doctor.id}`)} className="flex-1 sm:flex-none">Edit</Button>
                        <DeleteUserDialog userToDelete={doctor} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Patients</CardTitle>
                <CardDescription>View and manage patient profiles.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {patients.map(patient => (
                    <div key={patient.id} className="flex flex-col space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={patient.avatar} />
                          <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{patient.name}</p>
                          <p className="text-xs text-gray-500 truncate">{patient.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/user/edit/${patient.id}`)} className="flex-1">Edit</Button>
                        <DeleteUserDialog userToDelete={patient} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      };

      const renderCaseManagement = () => {
        const newCases = filteredCases.filter(c => c.status === 'pending_assignment');
        const runningCases = filteredCases.filter(c => ['open', 'proposal_accepted', 'in-progress', 'treatment_started'].includes(c.status));
        const completedCases = filteredCases.filter(c => c.status === 'completed');

        return (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="newCases" className="text-xs sm:text-sm">New ({newCases.length})</TabsTrigger>
              <TabsTrigger value="runningCases" className="text-xs sm:text-sm">Running ({runningCases.length})</TabsTrigger>
              <TabsTrigger value="completedCases" className="text-xs sm:text-sm">Completed ({completedCases.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="newCases">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">New Case Submissions</CardTitle>
                  <CardDescription>Review new cases and assign them to doctors.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {newCases.length > 0 ? newCases.map(c => (
                      <div key={c.id} className="border rounded-lg p-3 sm:p-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-sm sm:text-base flex-1">{c.title}</h3>
                            {c.urgency === 'immediate' && (
                              <Badge variant="destructive" className="flex items-center text-xs">
                                <AlertTriangleIcon className="h-3 w-3 mr-1" />
                                Immediate
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-xs sm:text-sm">
                            <p className="text-gray-600">Patient: {c.patient_name}</p>
                            <p className="text-gray-500">Case ID: {c.id}</p>
                            <p className="text-gray-500">Submitted: {format(new Date(c.created_at), 'PPp')}</p>
                          </div>
                          <Button size="sm" onClick={() => navigate(`/admin/case/edit/${c.id}`)} className="w-full sm:w-auto">Manage Case</Button>
                        </div>
                      </div>
                    )) : <p className="text-center text-gray-500 py-8">No new cases.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="runningCases">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Running Cases</CardTitle>
                  <CardDescription>Monitor cases that are open for proposals or in progress.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {runningCases.length > 0 ? runningCases.map(c => {
                      const proposalCount = proposals.filter(p => p.case_id === c.id).length;
                      const chosenProposal = proposals.find(p => p.id === c.chosen_proposal_id);
                      return (
                        <div key={c.id} className="border rounded-lg p-3 sm:p-4">
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold text-sm sm:text-base">{c.title}</h3>
                              <div className="space-y-1 text-xs sm:text-sm mt-2">
                                <p className="text-gray-600">Patient: {c.patient_name}</p>
                                <p className="text-gray-500">Case ID: {c.id}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Status:</span>
                                  {getCaseStatusBadge(c.status)}
                                </div>
                                {chosenProposal && <p className="font-bold text-sm">Cost: ৳{chosenProposal.cost.toLocaleString()}</p>}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {c.status === 'open' && c.proposal_deadline && <CountdownTimer deadline={c.proposal_deadline} />}
                              {(c.status === 'in-progress' || c.status === 'treatment_started' || c.status === 'proposal_accepted') && getPaymentStatusBadge(c.payment_status)}
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/case/${c.id}/proposals`)} className="flex-1">
                                  Proposals ({proposalCount})
                                </Button>
                                <Button size="sm" onClick={() => navigate(`/admin/case/edit/${c.id}`)} className="flex-1">Manage</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }) : <p className="text-center text-gray-500 py-8">No running cases.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="completedCases">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Completed Cases</CardTitle>
                  <CardDescription>View history of all completed cases.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {completedCases.length > 0 ? completedCases.map(c => {
                      const chosenProposal = proposals.find(p => p.id === c.chosen_proposal_id);
                      const doctor = chosenProposal ? users.find(u => u.id === chosenProposal.doctor_id) : null;
                      const patient = users.find(u => u.id === c.patient_id);
                      const pdfData = { caseData: c, proposal: chosenProposal, patient, doctor, settings };
                      const existingPrescription = prescriptions.find(p => p.case_id === c.id);
                      return (
                        <div key={c.id} className="border rounded-lg p-3 sm:p-4 bg-green-50">
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold text-sm sm:text-base">{c.title}</h3>
                              <div className="space-y-1 text-xs sm:text-sm mt-2">
                                <p className="text-gray-600">Patient: {c.patient_name}</p>
                                <p className="text-gray-500">Case ID: {c.id}</p>
                                {chosenProposal && <p className="text-gray-600">Doctor: {chosenProposal.doctor_name}</p>}
                                <p className="text-gray-500">Completed: {chosenProposal?.accepted_at ? format(new Date(chosenProposal.accepted_at), 'PPp') : 'N/A'}</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="font-bold text-green-700 text-sm sm:text-base">৳{chosenProposal?.cost.toLocaleString()}</p>
                              {getPaymentStatusBadge(c.payment_status)}
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button size="sm" variant="outline" onClick={() => setModalContent({ type: 'invoice', data: pdfData })} className="flex-1">
                                  <Eye className="h-4 w-4 mr-2" /> Invoice
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setModalContent({ type: 'prescription', data: { ...pdfData, existingPrescription } })} className="flex-1">
                                  <Eye className="h-4 w-4 mr-2" /> Prescription
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/case/edit/${c.id}`)} className="flex-1">Details</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }) : <p className="text-center text-gray-500 py-8">No completed cases.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        );
      };

      const renderProposalManagement = () => {
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Proposals</CardTitle>
              <CardDescription>View and manage all proposals across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {filteredProposals.length > 0 ? filteredProposals.map(p => {
                  const caseInfo = cases.find(c => c.id === p.case_id);
                  return (
                    <div key={p.id} className="border rounded-lg p-3 sm:p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base">Case: {caseInfo?.title || 'N/A'}</h3>
                          <div className="space-y-1 text-xs sm:text-sm mt-2">
                            <p className="text-gray-600">Doctor: {p.doctor_name}</p>
                            <p className="text-gray-600">Patient: {caseInfo?.patient_name || 'N/A'}</p>
                            <p className="text-gray-500">Proposal ID: {p.id}</p>
                            <p className="text-gray-500">Submitted: {format(new Date(p.created_at), 'PPp')}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <p className="font-bold text-sm sm:text-base">৳{p.cost.toLocaleString()}</p>
                            {p.previous_cost && (
                              <p className="text-xs text-gray-500 line-through opacity-70">৳{p.previous_cost.toLocaleString()}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getProposalStatusBadge(p.status)}
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/proposal/edit/${p.id}`)} className="w-full sm:w-auto">
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : <p className="text-center text-gray-500 py-8">No proposals found.</p>}
              </div>
            </CardContent>
          </Card>
        );
      };

      if (!user || user.role !== 'admin') {
        navigate('/login');
        return null;
      }

      return (
        <>
          <Helmet>
            <title>Admin Dashboard - DentaLink</title>
            <meta name="description" content="Admin dashboard for DentaLink." />
          </Helmet>

          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-40">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gradient">Admin Dashboard</h1>
                  <div className="flex items-center space-x-2">
                    <div className="hidden sm:flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="hidden md:block">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          Menu
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin/add-user')}><UserPlus className="h-4 w-4 mr-2" />Add User</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/profile')}><UserCog className="h-4 w-4 mr-2" />My Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/settings')}><Settings className="h-4 w-4 mr-2" />Settings</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/ecommerce')}><ShoppingCart className="h-4 w-4 mr-2" />E-commerce</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Analytics & Reports</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin/finance')}><FileDown className="h-4 w-4 mr-2" />Financial Overview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/revenue')}><BarChart2 className="h-4 w-4 mr-2" />Revenue Analytics</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/advanced-analytics')}><BrainCircuit className="h-4 w-4 mr-2" />Advanced Analytics</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/hr')}><Users2 className="h-4 w-4 mr-2" />HR & Payroll</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/investment')}><PiggyBank className="h-4 w-4 mr-2" />Investment Hub</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/area-analytics')}><Map className="h-4 w-4 mr-2" />Area Analytics</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/appointments')}><Calendar className="h-4 w-4 mr-2" />Appointments</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/reports')}><Download className="h-4 w-4 mr-2" />Download Center</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/issues')}><AlertTriangle className="h-4 w-4 mr-2" />Issues ({issues.filter(i => i.status !== 'solved').length})</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                          <LogOut className="h-4 w-4 mr-2" />Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {statCards.map((stat, index) => (
                    <Card key={index} className="card-hover">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                        <CardTitle className="text-xs sm:text-sm font-medium">{stat.title}</CardTitle>
                        <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color || ''}`} />
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 pt-0">
                        <div className="text-lg sm:text-2xl font-bold">{stat.value}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {financialStatCards.map((stat, index) => (
                    <Card key={index} className={`card-hover ${stat.action ? 'cursor-pointer' : ''}`} onClick={stat.action}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                        <CardTitle className="text-xs sm:text-sm font-medium">{stat.title}</CardTitle>
                        <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color || ''}`} />
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 pt-0">
                        <div className="text-lg sm:text-2xl font-bold">{stat.value}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Tabs defaultValue="caseManagement" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-auto">
                    <TabsTrigger value="caseManagement" className="text-xs sm:text-sm">Cases</TabsTrigger>
                    <TabsTrigger value="userManagement" className="text-xs sm:text-sm">Users</TabsTrigger>
                    <TabsTrigger value="proposalManagement" className="text-xs sm:text-sm">Proposals</TabsTrigger>
                  </TabsList>

                  <div className="mt-4 sm:mt-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>
                  </div>

                  <TabsContent value="caseManagement" className="mt-4 sm:mt-6">
                    <div className="flex justify-end mb-4">
                      <Button onClick={() => navigate('/admin/case/new')} className="w-full sm:w-auto">
                        <FilePlus className="h-4 w-4 mr-2" />
                        Create New Case
                      </Button>
                    </div>
                    {renderCaseManagement()}
                  </TabsContent>
                  <TabsContent value="userManagement" className="mt-4 sm:mt-6">
                    {renderUserManagement()}
                  </TabsContent>
                  <TabsContent value="proposalManagement" className="mt-4 sm:mt-6">
                    {renderProposalManagement()}
                  </TabsContent>
                </Tabs>
              </motion.div>
            </main>

            <Dialog open={!!modalContent} onOpenChange={() => setModalContent(null)}>
              <DialogContent className="max-w-4xl w-[90%] mx-auto max-h-[90vh] overflow-y-auto">
                {modalContent?.type === 'invoice' && (
                  <>
                    <DialogHeader>
                      <DialogTitle>Invoice</DialogTitle>
                      <DialogDescription>Review the invoice below. Click Download to get the PDF.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto p-1">
                      <Invoice {...modalContent.data} />
                    </div>
                     <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => handleDownloadPdf('invoice', modalContent.data)} className="w-full sm:w-auto">
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
                      <DialogDescription>Review or edit the prescription. Click Download to get the PDF.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto p-1">
                      <Prescription {...modalContent.data} onSave={handleSavePrescription} isDoctor={true} />
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => handleDownloadPdf('prescription', modalContent.data)} className="w-full sm:w-auto">
                        <FileDown className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>

          </div>
        </>
      );
    };

    export default AdminDashboard;