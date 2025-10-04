import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from '@/components/ui/use-toast';
import {
  Users,
  Briefcase,
  DollarSign,
  Activity,
  MoreVertical,
  LogOut,
  UserPlus,
  UserCog,
  Settings,
  BarChart,
  TrendingUp,
  BrainCircuit,
  MapPin,
  Calendar,
  Download,
  AlertTriangle,
  Hand,
  PieChart,
  Stethoscope,
  Shield,
  Clock,
  CheckCircle,
  FileSignature,
  Edit,
  Eye,
  ChevronDown,
  CreditCard,
  UserCheck,
  UserX,
  Power,
  PowerOff
} from 'lucide-react';
import LoadingIndicator from '@/components/LoadingIndicator';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { users, cases, proposals, transactions, issues, loading: dataLoading, updateUser } = useData();
  const [activeTab, setActiveTab] = useState('cases');

  const [displayLimits, setDisplayLimits] = useState({
    cases: 5,
    users: 5,
    proposals: 5,
  });

  const handleSeeMore = (category) => {
    setDisplayLimits(prev => ({ ...prev, [category]: Infinity }));
  };

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalAdmins: 0,
    pendingVerification: 0,
    totalCases: 0,
    completedCases: 0,
    activeTreatments: 0,
    grossRevenue: 0,
    paidInCash: 0,
    runningRevenue: 0,
    openIssues: 0,
    pendingTreatmentPayment: 0,
  });
  
  const sortData = (data) => {
    return data.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  };
  
  const categorizedData = useMemo(() => {
    if (dataLoading) {
      return { cases: {}, users: {}, proposals: {} };
    }
  
    const sortedCases = sortData([...cases]);
    const sortedUsers = sortData([...users]);
    const sortedProposals = sortData([...proposals]);

    const pendingPaymentCases = sortedCases.filter(c => c.status === 'completed' && c.payment_status === 'unpaid');

    const categorizedCases = {
      all: sortedCases,
      pending: sortedCases.filter(c => c.status === 'pending_assignment'),
      open: sortedCases.filter(c => c.status === 'open'),
      inProgress: sortedCases.filter(c => ['proposal_accepted', 'in-progress', 'treatment_started'].includes(c.status)),
      completed: sortedCases.filter(c => c.status === 'completed'),
      cancelled: sortedCases.filter(c => c.status === 'cancelled'),
      paymentPending: pendingPaymentCases,
    };

    const categorizedUsers = {
      all: sortedUsers,
      patients: sortedUsers.filter(u => u.role === 'patient'),
      doctors: sortedUsers.filter(u => u.role === 'doctor'),
      admins: sortedUsers.filter(u => u.role === 'admin'),
      unverified: sortedUsers.filter(u => u.role === 'doctor' && (u.is_verified === false || u.is_verified === null)),
    };
    
    const categorizedProposals = {
      all: sortedProposals,
      pending: sortedProposals.filter(p => p.status === 'pending'),
      accepted: sortedProposals.filter(p => p.status === 'accepted'),
      rejected: sortedProposals.filter(p => p.status === 'rejected'),
    };
    
    const totalUsers = users.length;
    const totalPatients = categorizedUsers.patients.length;
    const totalDoctors = categorizedUsers.doctors.length;
    const totalAdmins = categorizedUsers.admins.length;
    const pendingVerification = categorizedUsers.unverified.length;
    const totalCases = cases.length;
    const completedCases = categorizedCases.completed.length;
    const activeTreatments = categorizedCases.inProgress.length;
    
    const paidInCashTransactions = transactions.filter(t => t.type === 'treatment_payment' && t.payment_method === 'cash');
    const paidOnlineTransactions = transactions.filter(t => t.type === 'treatment_payment' && t.payment_method !== 'cash');

    const paidInCash = paidInCashTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const grossRevenue = paidOnlineTransactions.reduce((acc, t) => acc + (t.amount || 0), 0) + paidInCash;
    
    const runningProposals = proposals.filter(p => {
        const caseInfo = cases.find(c => c.id === p.case_id);
        return caseInfo && ['proposal_accepted', 'in-progress', 'treatment_started'].includes(caseInfo.status);
    });
    const runningRevenue = runningProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
    const openIssues = issues.filter(i => i.status !== 'solved').length;
    
    const pendingTreatmentPayment = pendingPaymentCases.reduce((acc, currentCase) => {
        const proposal = proposals.find(p => p.id === currentCase.chosen_proposal_id);
        return acc + (proposal?.cost || 0);
    }, 0);


    setStats({
      totalUsers,
      totalPatients,
      totalDoctors,
      totalAdmins,
      pendingVerification,
      totalCases,
      completedCases,
      activeTreatments,
      grossRevenue,
      paidInCash,
      runningRevenue,
      openIssues,
      pendingTreatmentPayment
    });

    return {
      cases: categorizedCases,
      users: categorizedUsers,
      proposals: categorizedProposals,
    };
  }, [users, cases, proposals, transactions, issues, dataLoading]);

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    navigate('/');
  };

  const handleUserStatusUpdate = async (user, updates) => {
    try {
      await updateUser({ auth_id: user.auth_id, ...updates });
      toast({
        title: "User Updated",
        description: `${user.name}'s status has been updated.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCaseStatusBadge = (status) => {
    const statusMap = {
      pending_assignment: { text: "Pending", color: "bg-gray-100 text-gray-800" },
      open: { text: "Open", color: "bg-blue-100 text-blue-800" },
      proposal_accepted: { text: "Accepted", color: "bg-purple-100 text-purple-800" },
      'in-progress': { text: "In Progress", color: "bg-yellow-100 text-yellow-800" },
      treatment_started: { text: "Treatment Started", color: "bg-orange-100 text-orange-800" },
      completed: { text: "Completed", color: "bg-green-100 text-green-800" },
      cancelled: { text: "Cancelled", color: "bg-red-100 text-red-800" },
    };
    const { text, color } = statusMap[status] || { text: status, color: "bg-gray-200" };
    return <Badge className={color}>{text}</Badge>;
  };
  
  const renderList = (items, limit, category, renderItem) => (
    <div className="space-y-4">
        {items.slice(0, limit).map(renderItem)}
        {items.length > limit && (
          <div className="text-center p-4">
            <Button onClick={() => handleSeeMore(category)}>See More</Button>
          </div>
        )}
        {items.length === 0 && <p className="text-center text-gray-500 py-8">No items in this category.</p>}
    </div>
  );

  const renderCaseItem = (c) => (
    <Collapsible key={c.id} className="border rounded-lg">
      <div className="p-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-gray-600">Patient: {c.patient_name}</p>
            <p className="text-xs text-gray-500 mt-1">Case ID: {c.id}</p>
          </div>
          <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
            {getCaseStatusBadge(c.status)}
          </div>
        </div>
        <div className="border-t mt-4 pt-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={() => navigate(`/admin/case/edit/${c.id}`)}>
                    <Edit className="h-4 w-4 mr-2"/> Edit Case
                 </Button>
                 <Button variant="outline" size="sm" onClick={() => navigate(`/admin/case/${c.id}/proposals`)}>
                    <Eye className="h-4 w-4 mr-2"/> View Proposals
                 </Button>
            </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">Details <ChevronDown className="h-4 w-4 ml-1" /></Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className="p-4 pt-0">
        <div className="bg-gray-50/50 p-3 rounded-lg space-y-2 text-xs text-gray-500">
          <p><span className="font-medium text-gray-700">Submitted:</span> {format(new Date(c.created_at), 'PPp')}</p>
          <p><span className="font-medium text-gray-700">Urgency:</span> {c.urgency}</p>
          <p className="line-clamp-3"><span className="font-medium text-gray-700">Description:</span> {c.description}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  const renderUserItem = (u, isUnverifiedTab = false) => (
    <Collapsible key={u.auth_id} className="border rounded-lg">
        <div className="p-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h3 className="font-semibold">{u.name}</h3>
                    <p className="text-sm text-gray-600">{u.email}</p>
                </div>
                <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
                    <Badge variant={u.role === 'admin' ? 'default' : 'outline'}>{u.role}</Badge>
                    {u.is_verified ? <Badge className="bg-green-100 text-green-800">Verified</Badge> : <Badge className="bg-yellow-100 text-yellow-800">Unverified</Badge>}
                    {u.status === 'active' ? <Badge className="bg-blue-100 text-blue-800">Active</Badge> : <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>}
                </div>
            </div>
            <div className="border-t mt-4 pt-3 flex justify-between items-center">
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/user/edit/${u.auth_id}`)}>
                        <Edit className="h-4 w-4 mr-2"/> Edit User
                    </Button>
                    {isUnverifiedTab && (
                        <>
                            <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleUserStatusUpdate(u, { is_verified: true })}>
                                <UserCheck className="h-4 w-4 mr-2"/> Verify
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleUserStatusUpdate(u, { is_verified: false, status: 'inactive' })}>
                                <UserX className="h-4 w-4 mr-2"/> Reject
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
                <p><span className="font-medium text-gray-700">User ID:</span> {u.auth_id}</p>
                <p><span className="font-medium text-gray-700">Joined:</span> {format(new Date(u.created_at), 'PPp')}</p>
                <p><span className="font-medium text-gray-700">Phone:</span> {u.phone || 'N/A'}</p>
            </div>
        </CollapsibleContent>
    </Collapsible>
  );

  const renderProposalItem = (p) => (
    <Collapsible key={p.id} className="border rounded-lg">
        <div className="p-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h3 className="font-semibold">Case ID: {p.case_id}</h3>
                    <p className="text-sm text-gray-600">Doctor: {p.doctor_name}</p>
                    <p className="text-sm font-bold mt-1">Cost: ৳{p.cost?.toLocaleString()}</p>
                </div>
                <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
                    <Badge variant={ p.status === 'accepted' ? 'default' : p.status === 'rejected' ? 'destructive' : 'outline'}>{p.status}</Badge>
                </div>
            </div>
            <div className="border-t mt-4 pt-3 flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/proposal/edit/${p.id}`)}>
                    <Edit className="h-4 w-4 mr-2"/> Edit Proposal
                </Button>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">Details <ChevronDown className="h-4 w-4 ml-1" /></Button>
                </CollapsibleTrigger>
            </div>
        </div>
        <CollapsibleContent className="p-4 pt-0">
            <div className="bg-gray-50/50 p-3 rounded-lg space-y-2 text-xs text-gray-500">
                <p><span className="font-medium text-gray-700">Proposal ID:</span> {p.id}</p>
                <p><span className="font-medium text-gray-700">Submitted:</span> {format(new Date(p.created_at), 'PPp')}</p>
                <p className="line-clamp-3"><span className="font-medium text-gray-700">Details:</span> {p.details}</p>
            </div>
        </CollapsibleContent>
    </Collapsible>
  );

  if (dataLoading) {
    return <LoadingIndicator />;
  }
  
  if (!user) {
    navigate('/login');
    return null;
  }

  const menuItems = [
    {
      group: 'Admin Actions',
      items: [
        { label: 'Add User', icon: UserPlus, action: () => navigate('/admin/add-user') },
        { label: 'My Profile', icon: UserCog, action: () => navigate('/profile') },
        { label: 'Settings', icon: Settings, action: () => navigate('/admin/settings') },
      ]
    },
    {
      group: 'Analytics & Reports',
      items: [
        { label: 'Financial Overview', icon: BarChart, action: () => navigate('/admin/finance') },
        { label: 'Revenue Analytics', icon: TrendingUp, action: () => navigate('/admin/revenue') },
        { label: 'Advanced Analytics', icon: BrainCircuit, action: () => navigate('/admin/advanced-analytics') },
        { label: 'Area Analytics', icon: MapPin, action: () => navigate('/admin/area-analytics') },
        { label: 'Appointments', icon: Calendar, action: () => navigate('/admin/appointments') },
        { label: 'Download Center', icon: Download, action: () => navigate('/admin/reports') },
        { label: 'Issues', icon: AlertTriangle, action: () => navigate('/admin/issues'), count: stats.openIssues },
      ]
    }
  ];

  const StatCard = ({ title, value, icon: Icon, formatAsCurrency = false }) => (
    <Card className="shadow-lg border-none bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
          {title}
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-gray-800">
          {formatAsCurrency ? `৳${Number(value).toLocaleString()}` : value}
        </p>
      </CardContent>
    </Card>
  );
  
  const statCardData = [
      { title: "Total Users", value: stats.totalUsers, icon: Users },
      { title: "Total Patients", value: stats.totalPatients, icon: Users },
      { title: "Total Doctors", value: stats.totalDoctors, icon: Stethoscope },
      { title: "Total Admins", value: stats.totalAdmins, icon: Shield },
      { title: "Pending Verification", value: stats.pendingVerification, icon: Clock },
      { title: "Total Cases", value: stats.totalCases, icon: Briefcase },
      { title: "Completed Cases", value: stats.completedCases, icon: CheckCircle },
      { title: "Active Treatments", value: stats.activeTreatments, icon: Activity },
      { title: "Gross Revenue", value: stats.grossRevenue, icon: DollarSign, formatAsCurrency: true },
      { title: "Paid in Cash", value: stats.paidInCash, icon: Hand, formatAsCurrency: true },
      { title: "Running Revenue", value: stats.runningRevenue, icon: PieChart, formatAsCurrency: true },
      { title: "Pending Treatment Payment", value: stats.pendingTreatmentPayment, icon: CreditCard, formatAsCurrency: true },
  ];

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - DentaLink</title>
      </Helmet>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold text-gradient">Admin Dashboard</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {menuItems.map((group, index) => (
                    <DropdownMenuGroup key={group.group}>
                      <DropdownMenuLabel>{group.group}</DropdownMenuLabel>
                      {group.items.map(item => (
                        <DropdownMenuItem key={item.label} onClick={item.action} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.count > 0 && <span className="text-xs bg-red-500 text-white rounded-full px-2">{item.count}</span>}
                        </DropdownMenuItem>
                      ))}
                      {index < menuItems.length - 1 && <DropdownMenuSeparator />}
                    </DropdownMenuGroup>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-600 focus:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8"
          >
            {statCardData.map((stat, i) => <StatCard key={i} {...stat} />)}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Tabs defaultValue="cases" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cases"><Briefcase className="w-4 h-4 mr-2"/>Cases</TabsTrigger>
                <TabsTrigger value="users"><Users className="w-4 h-4 mr-2"/>Users</TabsTrigger>
                <TabsTrigger value="proposals"><FileSignature className="w-4 h-4 mr-2"/>Proposals</TabsTrigger>
              </TabsList>
              
              <TabsContent value="cases" className="mt-4">
                  <Card>
                    <CardContent className="p-0">
                      <Tabs defaultValue="all-cases" className="w-full">
                        <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 overflow-x-auto">
                          <TabsTrigger value="all-cases" className="px-4 shrink-0">All ({categorizedData.cases.all?.length || 0})</TabsTrigger>
                          <TabsTrigger value="pending-cases" className="px-4 shrink-0">Pending ({categorizedData.cases.pending?.length || 0})</TabsTrigger>
                          <TabsTrigger value="open-cases" className="px-4 shrink-0">Open ({categorizedData.cases.open?.length || 0})</TabsTrigger>
                          <TabsTrigger value="in-progress-cases" className="px-4 shrink-0">In Progress ({categorizedData.cases.inProgress?.length || 0})</TabsTrigger>
                          <TabsTrigger value="completed-cases" className="px-4 shrink-0">Completed ({categorizedData.cases.completed?.length || 0})</TabsTrigger>
                          <TabsTrigger value="payment-pending-cases" className="px-4 shrink-0 text-red-600">Payment Pending ({categorizedData.cases.paymentPending?.length || 0})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="all-cases" className="p-4">{renderList(categorizedData.cases.all || [], displayLimits.cases, 'cases', renderCaseItem)}</TabsContent>
                        <TabsContent value="pending-cases" className="p-4">{renderList(categorizedData.cases.pending || [], displayLimits.cases, 'cases', renderCaseItem)}</TabsContent>
                        <TabsContent value="open-cases" className="p-4">{renderList(categorizedData.cases.open || [], displayLimits.cases, 'cases', renderCaseItem)}</TabsContent>
                        <TabsContent value="in-progress-cases" className="p-4">{renderList(categorizedData.cases.inProgress || [], displayLimits.cases, 'cases', renderCaseItem)}</TabsContent>
                        <TabsContent value="completed-cases" className="p-4">{renderList(categorizedData.cases.completed || [], displayLimits.cases, 'cases', renderCaseItem)}</TabsContent>
                        <TabsContent value="payment-pending-cases" className="p-4">{renderList(categorizedData.cases.paymentPending || [], displayLimits.cases, 'cases', renderCaseItem)}</TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                 <Card>
                    <CardContent className="p-0">
                      <Tabs defaultValue="all-users" className="w-full">
                        <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 overflow-x-auto">
                           <TabsTrigger value="all-users" className="px-4 shrink-0">All ({categorizedData.users.all?.length || 0})</TabsTrigger>
                           <TabsTrigger value="patients" className="px-4 shrink-0">Patients ({categorizedData.users.patients?.length || 0})</TabsTrigger>
                           <TabsTrigger value="doctors" className="px-4 shrink-0">Doctors ({categorizedData.users.doctors?.length || 0})</TabsTrigger>
                           <TabsTrigger value="admins" className="px-4 shrink-0">Admins ({categorizedData.users.admins?.length || 0})</TabsTrigger>
                           <TabsTrigger value="unverified" className="px-4 shrink-0">Unverified ({categorizedData.users.unverified?.length || 0})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="all-users" className="p-4">{renderList(categorizedData.users.all || [], displayLimits.users, 'users', renderUserItem)}</TabsContent>
                        <TabsContent value="patients" className="p-4">{renderList(categorizedData.users.patients || [], displayLimits.users, 'users', renderUserItem)}</TabsContent>
                        <TabsContent value="doctors" className="p-4">{renderList(categorizedData.users.doctors || [], displayLimits.users, 'users', renderUserItem)}</TabsContent>
                        <TabsContent value="admins" className="p-4">{renderList(categorizedData.users.admins || [], displayLimits.users, 'users', renderUserItem)}</TabsContent>
                        <TabsContent value="unverified" className="p-4">{renderList(categorizedData.users.unverified || [], displayLimits.users, 'users', (u) => renderUserItem(u, true))}</TabsContent>
                      </Tabs>
                    </CardContent>
                 </Card>
              </TabsContent>

              <TabsContent value="proposals" className="mt-4">
                 <Card>
                    <CardContent className="p-0">
                       <Tabs defaultValue="all-proposals" className="w-full">
                         <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 overflow-x-auto">
                            <TabsTrigger value="all-proposals" className="px-4 shrink-0">All ({categorizedData.proposals.all?.length || 0})</TabsTrigger>
                            <TabsTrigger value="pending-proposals" className="px-4 shrink-0">Pending ({categorizedData.proposals.pending?.length || 0})</TabsTrigger>
                            <TabsTrigger value="accepted-proposals" className="px-4 shrink-0">Accepted ({categorizedData.proposals.accepted?.length || 0})</TabsTrigger>
                            <TabsTrigger value="rejected-proposals" className="px-4 shrink-0">Rejected ({categorizedData.proposals.rejected?.length || 0})</TabsTrigger>
                         </TabsList>
                         <TabsContent value="all-proposals" className="p-4">{renderList(categorizedData.proposals.all || [], displayLimits.proposals, 'proposals', renderProposalItem)}</TabsContent>
                         <TabsContent value="pending-proposals" className="p-4">{renderList(categorizedData.proposals.pending || [], displayLimits.proposals, 'proposals', renderProposalItem)}</TabsContent>
                         <TabsContent value="accepted-proposals" className="p-4">{renderList(categorizedData.proposals.accepted || [], displayLimits.proposals, 'proposals', renderProposalItem)}</TabsContent>
                         <TabsContent value="rejected-proposals" className="p-4">{renderList(categorizedData.proposals.rejected || [], displayLimits.proposals, 'proposals', renderProposalItem)}</TabsContent>
                       </Tabs>
                    </CardContent>
                 </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
