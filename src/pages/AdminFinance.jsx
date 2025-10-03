import React, { useState, useEffect, useMemo } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import { Badge } from '@/components/ui/badge';
    import { toast } from '@/components/ui/use-toast';
    import { ArrowLeft, Banknote, DollarSign, TrendingUp, Users, Landmark, CircleDollarSign, Receipt, Plus, Minus, Undo2, ArrowUp, ArrowDown, Activity, Coins as HandCoins, FileText, Hand } from 'lucide-react';
    import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Textarea } from '@/components/ui/textarea';
    import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
    import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, isWithinInterval } from 'date-fns';
    import FinancialBreakdown from '@/components/FinancialBreakdown';

    const AdminFinance = () => {
        const navigate = useNavigate();
        const { users, proposals, settings, transactions, addTransaction, reloadData, cases } = useData();
        const [financeData, setFinanceData] = useState([]);
        const [overallStats, setOverallStats] = useState({ gross: 0, commission: 0, totalPaid: 0, totalPending: 0, growth: 0, runningRevenue: 0, commissionReceivable: 0, totalPaidInCash: 0 });
        const [selectedDoctor, setSelectedDoctor] = useState(null);
        const [breakdownDoctor, setBreakdownDoctor] = useState(null);
        const [transactionType, setTransactionType] = useState('payout');
        const [transactionAmount, setTransactionAmount] = useState('');
        const [transactionNotes, setTransactionNotes] = useState('');
        const [chartData, setChartData] = useState([]);
        const [timeframe, setTimeframe] = useState('7d');

        useEffect(() => {
            if(reloadData) reloadData();
        }, []);

        useEffect(() => {
            const doctors = users.filter(u => u.role === 'doctor');
            
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
                return (p.status === 'accepted' || p.status === 'in_progress') && p.status !== 'rejected';
            });

            const data = doctors.map(doctor => {
                const doctorCompletedPaidProposals = completedAndPaidProposals.filter(p => p.doctor_id === doctor.id);
                const doctorCompletedCashProposals = completedAndCashPaidProposals.filter(p => p.doctor_id === doctor.id);

                const grossRevenueFromPaid = doctorCompletedPaidProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
                
                const commissionFromPaid = doctorCompletedPaidProposals.reduce((acc, p) => {
                    const cost = p.cost || 0;
                    const commissionType = doctor.commission?.type || settings.commission_type;
                    const commissionRate = doctor.commission?.rate || settings.commission_rate;
                    return acc + (commissionType === 'percentage' ? cost * (Number(commissionRate) / 100) : Number(commissionRate || 0));
                }, 0);

                const commissionFromCash = doctorCompletedCashProposals.reduce((acc, p) => {
                    const cost = p.cost || 0;
                    const commissionType = doctor.commission?.type || settings.commission_type;
                    const commissionRate = doctor.commission?.rate || settings.commission_rate;
                    return acc + (commissionType === 'percentage' ? cost * (Number(commissionRate) / 100) : Number(commissionRate || 0));
                }, 0);

                const netIncome = grossRevenueFromPaid - commissionFromPaid;

                const doctorTransactions = transactions.filter(t => t.doctor_id === doctor.id);
                const totalPaid = doctorTransactions.filter(t => t.type === 'payout').reduce((acc, t) => acc + t.amount, 0);

                const commissionPaidByDoctor = doctorTransactions.filter(t => t.type === 'commission_payment').reduce((acc, t) => acc + t.amount, 0);

                const pendingBalance = netIncome - totalPaid;
                const commissionDue = commissionFromCash - commissionPaidByDoctor;

                return {
                    ...doctor,
                    grossRevenue: grossRevenueFromPaid,
                    commission: commissionFromPaid + commissionFromCash,
                    commissionFromCash,
                    commissionPaidByDoctor,
                    netIncome,
                    totalPaid,
                    pendingBalance,
                    commissionDue,
                };
            });

            setFinanceData(data);

            const grossRevenueFromPaid = completedAndPaidProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
            const grossRevenueFromCash = completedAndCashPaidProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
            const totalGross = grossRevenueFromPaid + grossRevenueFromCash;

            const totalCommission = data.reduce((acc, d) => acc + d.commission, 0);
            const totalPaidOut = data.reduce((acc, d) => acc + d.totalPaid, 0);
            const totalPendingPayout = data.reduce((acc, d) => acc + d.pendingBalance, 0);
            const totalCommissionReceivable = data.reduce((acc, d) => acc + d.commissionDue, 0);
            const totalRunningRevenue = runningProposals.reduce((acc, p) => acc + (p.cost || 0), 0);

            const days = timeframe === '7d' ? 7 : 30;
            const startDate = startOfDay(subDays(new Date(), days - 1));
            const endDate = endOfDay(new Date());
            const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });

            const allCompletedAndPaidProposals = [...completedAndPaidProposals, ...completedAndCashPaidProposals];

            const processedChartData = dateInterval.map(date => {
                const dayStart = startOfDay(date);
                const dayEnd = endOfDay(date);
                const dayProposals = allCompletedAndPaidProposals.filter(p => p.accepted_at && isWithinInterval(new Date(p.accepted_at), { start: dayStart, end: dayEnd }));
                
                const dailyGross = dayProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
                const dailyCommission = dayProposals.reduce((acc, p) => {
                     const doctor = users.find(u => u.id === p.doctor_id);
                     if (!doctor) return acc;
                     const cost = p.cost || 0;
                     const commissionType = doctor.commission?.type || settings.commission_type;
                     const commissionRate = doctor.commission?.rate || settings.commission_rate;
                     return acc + (commissionType === 'percentage' ? cost * (Number(commissionRate) / 100) : Number(commissionRate || 0));
                }, 0);

                return {
                    date: format(date, 'MMM d'),
                    Revenue: dailyGross,
                    Earnings: dailyCommission,
                };
            });
            setChartData(processedChartData);

            const currentPeriodRevenue = processedChartData.slice(-Math.floor(days / 2)).reduce((acc, d) => acc + d.Revenue, 0);
            const previousPeriodRevenue = processedChartData.slice(0, Math.ceil(days / 2)).reduce((acc, d) => acc + d.Revenue, 0);
            const growth = previousPeriodRevenue > 0 ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : (currentPeriodRevenue > 0 ? 100 : 0);

            setOverallStats({
                gross: totalGross,
                commission: totalCommission,
                totalPaid: totalPaidOut,
                totalPending: totalPendingPayout,
                growth: growth,
                runningRevenue: totalRunningRevenue,
                commissionReceivable: totalCommissionReceivable,
                totalPaidInCash: grossRevenueFromCash,
            });

        }, [users, proposals, settings, transactions, timeframe, cases]);

        const handleManagePayout = (doctor) => {
            setSelectedDoctor(doctor);
            setTransactionType('payout');
            setTransactionAmount('');
            setTransactionNotes('');
        };

        const handlePayCommission = (doctor) => {
            setSelectedDoctor(doctor);
            setTransactionType('commission_payment');
            setTransactionAmount(doctor.commissionDue > 0 ? doctor.commissionDue.toString() : '');
            setTransactionNotes('Commission payment for due amount.');
        };

        const handleAddTransaction = () => {
            if (!selectedDoctor || !transactionAmount || isNaN(parseFloat(transactionAmount))) {
                toast({ title: "Invalid Input", description: "Please enter a valid amount.", variant: "destructive" });
                return;
            }

            const amount = parseFloat(transactionAmount);
            addTransaction({
                doctorId: selectedDoctor.id,
                doctorName: selectedDoctor.name,
                type: transactionType,
                amount: amount,
                notes: transactionNotes,
            });

            toast({ title: "Transaction Recorded", description: `A ${transactionType} of ৳${amount} for Dr. ${selectedDoctor.name} has been recorded.` });
            setSelectedDoctor(null);
        };


        const getTransactionTypeBadge = (type) => {
            switch (type) {
                case 'payout': return <Badge className="bg-green-100 text-green-800 flex items-center text-xs"><Banknote className="h-3 w-3 mr-1"/>Payout</Badge>;
                case 'adjustment_bonus': return <Badge className="bg-blue-100 text-blue-800 flex items-center text-xs"><Plus className="h-3 w-3 mr-1"/>Bonus</Badge>;
                case 'adjustment_deduction': return <Badge className="bg-yellow-100 text-yellow-800 flex items-center text-xs"><Minus className="h-3 w-3 mr-1"/>Deduction</Badge>;
                case 'refund': return <Badge className="bg-red-100 text-red-800 flex items-center text-xs"><Undo2 className="h-3 w-3 mr-1"/>Refund</Badge>;
                case 'commission_payment': return <Badge className="bg-purple-100 text-purple-800 flex items-center text-xs"><HandCoins className="h-3 w-3 mr-1"/>Commission</Badge>;
                case 'case_payment': return <Badge className="bg-indigo-100 text-indigo-800 flex items-center text-xs"><HandCoins className="h-3 w-3 mr-1"/>Case Payment</Badge>;
                case 'credit_deposit': return <Badge className="bg-lime-100 text-lime-800 flex items-center text-xs"><Plus className="h-3 w-3 mr-1"/>Deposit</Badge>;
                default: return <Badge className="text-xs">{type}</Badge>;
            }
        };

        const topEarningDoctors = useMemo(() => {
            return [...financeData].sort((a, b) => b.grossRevenue - a.grossRevenue).slice(0, 5);
        }, [financeData]);

        const statCards = [
            { title: "Total Gross Revenue", value: `৳${overallStats.gross.toLocaleString()}`, icon: TrendingUp, growth: overallStats.growth },
            { title: "Total Paid in Cash", value: `৳${overallStats.totalPaidInCash.toLocaleString()}`, icon: Hand, color: "text-teal-600" },
            { title: "Running Revenue", value: `৳${overallStats.runningRevenue.toLocaleString()}`, icon: Activity, color: "text-orange-600" },
            { title: "Total Platform Earnings", value: `৳${overallStats.commission.toLocaleString()}`, icon: DollarSign },
            { title: "Pending Payouts", value: `৳${overallStats.totalPending.toLocaleString()}`, icon: CircleDollarSign },
            { title: "Commission Receivable", value: `৳${overallStats.commissionReceivable.toLocaleString()}`, icon: HandCoins, color: "text-purple-600" },
        ];

        return (
            <>
                <Helmet><title>Financial Dashboard - DentaLink Admin</title></Helmet>
                <div className="min-h-screen bg-gray-50">
                    <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-16">
                                <div className="flex items-center space-x-2 sm:space-x-4">
                                    <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                    <h1 className="text-lg sm:text-xl font-bold text-gradient">Financial Dashboard</h1>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6 mb-6 sm:mb-8">
                                {statCards.map(stat => (
                                    <Card key={stat.title}>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                                            <CardTitle className="text-xs sm:text-sm font-medium">{stat.title}</CardTitle>
                                            <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color || ''}`} />
                                        </CardHeader>
                                        <CardContent className="p-3 sm:p-6 pt-0">
                                            <div className="text-lg sm:text-2xl font-bold">{stat.value}</div>
                                            {stat.growth !== undefined && (
                                                <p className={`text-xs flex items-center ${stat.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {stat.growth >= 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                                                    {stat.growth.toFixed(2)}% vs previous period
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <Card className="mb-6 sm:mb-8">
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                                        <div>
                                            <CardTitle className="text-lg">Revenue & Earnings Overview</CardTitle>
                                            <CardDescription>Platform revenue and earnings over time from all completed cases.</CardDescription>
                                        </div>
                                        <Tabs value={timeframe} onValueChange={setTimeframe} className="w-auto">
                                            <TabsList className="grid grid-cols-2">
                                                <TabsTrigger value="7d" className="text-xs sm:text-sm">7 Days</TabsTrigger>
                                                <TabsTrigger value="30d" className="text-xs sm:text-sm">30 Days</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" fontSize={12} />
                                            <YAxis fontSize={12} />
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)' }} />
                                            <Legend />
                                            <Line type="monotone" dataKey="Revenue" stroke="#8884d8" strokeWidth={2} />
                                            <Line type="monotone" dataKey="Earnings" stroke="#82ca9d" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 mb-6 sm:mb-8">
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Top Earning Doctors (Online Payments)</CardTitle>
                                        <CardDescription>Doctors with the highest gross revenue from completed online-paid cases.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={topEarningDoctors} layout="vertical" margin={{ left: 20, right: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" fontSize={12} />
                                                <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="grossRevenue" name="Gross Revenue" fill="#8884d8" />
                                                <Bar dataKey="commission" name="Commission" fill="#82ca9d" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Recent Transactions</CardTitle>
                                        <CardDescription>Latest financial activities.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="max-h-[250px] overflow-y-auto">
                                        <div className="space-y-3 sm:space-y-4">
                                            {[...transactions].reverse().slice(0, 10).map(t => {
                                                const userName = users.find(u => u.id === t.user_id)?.name || t.doctor_name;
                                                return (
                                                    <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">{userName}</p>
                                                            <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {getTransactionTypeBadge(t.type)}
                                                            <p className="font-semibold text-sm">৳{t.amount.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {transactions.length === 0 && <p className="text-center text-gray-500 py-4 text-sm">No transactions yet.</p>}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Tabs defaultValue="payouts">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="payouts" className="text-xs sm:text-sm">Doctor Accounts</TabsTrigger>
                                    <TabsTrigger value="transactions" className="text-xs sm:text-sm">Full Transaction Log</TabsTrigger>
                                </TabsList>
                                <TabsContent value="payouts">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Doctor Accounts</CardTitle>
                                            <CardDescription>Manage earnings, payouts, and commission dues for each doctor.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                                {financeData.map(d => (
                                                    <div key={d.id} className="border rounded-lg p-3 sm:p-4">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className="font-medium text-sm sm:text-base">{d.name}</h3>
                                                            </div>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
                                                                <div>
                                                                    <p className="text-gray-500">Pending Payout</p>
                                                                    <p className="font-semibold text-orange-600">৳{d.pendingBalance.toLocaleString()}</p>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <p className="text-gray-500">Commission Due</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-semibold text-red-600">৳{d.commissionDue.toLocaleString()}</p>
                                                                        {d.commissionDue > 0 && (
                                                                            <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => handlePayCommission(d)}>Pay</Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-500">Total Paid Out</p>
                                                                    <p className="font-semibold text-green-600">৳{d.totalPaid.toLocaleString()}</p>
                                                                </div>
                                                                <div className="col-span-2 sm:col-span-1 flex flex-col sm:flex-row gap-2">
                                                                    <Button size="sm" variant="outline" onClick={() => setBreakdownDoctor(d)} className="flex-1">
                                                                        <FileText className="h-4 w-4 mr-1"/>Details
                                                                    </Button>
                                                                    <Button size="sm" onClick={() => handleManagePayout(d)} className="flex-1">Manage</Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {financeData.length === 0 && <div className="text-center p-8"><Users className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-4 text-gray-600">No doctor financial data available.</p></div>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                <TabsContent value="transactions">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Full Transaction Log</CardTitle>
                                            <CardDescription>A complete history of all financial transactions.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                                                {[...transactions].reverse().map(t => {
                                                    const userName = users.find(u => u.id === t.user_id)?.name || t.doctor_name;
                                                    return (
                                                        <div key={t.id} className="border rounded-lg p-3">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                                                                <div className="flex-1">
                                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                                        <p className="font-medium text-sm">{userName}</p>
                                                                        {getTransactionTypeBadge(t.type)}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">{new Date(t.date).toLocaleString()}</p>
                                                                    {t.notes && <p className="text-xs text-gray-500 mt-1">{t.notes}</p>}
                                                                </div>
                                                                <p className="font-semibold text-sm sm:text-base">৳{t.amount.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {transactions.length === 0 && <div className="text-center p-8"><Receipt className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-4 text-gray-600">No transactions recorded yet.</p></div>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </motion.div>
                    </main>
                </div>

                <Dialog open={!!selectedDoctor} onOpenChange={() => setSelectedDoctor(null)}>
                    <DialogContent className="mx-4 max-w-md">
                        <DialogHeader>
                            <DialogTitle>Manage Account for Dr. {selectedDoctor?.name}</DialogTitle>
                            <DialogDescription>Record a payout, adjustment, or refund.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm font-medium">Pending Payout</p>
                                        <p className="text-xl sm:text-2xl font-bold text-orange-600">৳{selectedDoctor?.pendingBalance.toLocaleString()}</p>
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm font-medium">Commission Due</p>
                                        <p className="text-xl sm:text-2xl font-bold text-red-600">৳{selectedDoctor?.commissionDue.toLocaleString()}</p>
                                    </CardContent>
                                </Card>
                            </div>
                            {selectedDoctor?.payout_details?.method && (
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Payout Information</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedDoctor.payout_details.method === 'bank' ? (
                                            <div className="text-sm space-y-1">
                                                <p><strong>Method:</strong> Bank Transfer</p>
                                                <p><strong>Bank:</strong> {selectedDoctor.payout_details.bankName}</p>
                                                <p><strong>Branch:</strong> {selectedDoctor.payout_details.branchName}</p>
                                                <p><strong>Account Name:</strong> {selectedDoctor.payout_details.accountName}</p>
                                                <p><strong>Account No:</strong> {selectedDoctor.payout_details.accountNumber}</p>
                                                <p><strong>Routing No:</strong> {selectedDoctor.payout_details.routingNumber}</p>
                                            </div>
                                        ) : (
                                            <div className="text-sm space-y-1">
                                                <p><strong>Method:</strong> bKash</p>
                                                <p><strong>Number:</strong> {selectedDoctor.payout_details.bkashNumber}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                            <div className="space-y-2">
                                <Label>Transaction Type</Label>
                                <Select value={transactionType} onValueChange={setTransactionType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="payout">Payout</SelectItem>
                                        <SelectItem value="adjustment_bonus">Adjustment (Bonus)</SelectItem>
                                        <SelectItem value="adjustment_deduction">Adjustment (Deduction)</SelectItem>
                                        <SelectItem value="refund">Refund</SelectItem>
                                        <SelectItem value="commission_payment">Commission Payment Received</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount (৳)</Label>
                                <Input id="amount" type="number" value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)} placeholder="Enter amount" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea id="notes" value={transactionNotes} onChange={(e) => setTransactionNotes(e.target.value)} placeholder="e.g., Monthly payout, bonus for performance" />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handleAddTransaction}>Record Transaction</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!breakdownDoctor} onOpenChange={() => setBreakdownDoctor(null)}>
                    <DialogContent className="mx-4 max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Financial Breakdown for Dr. {breakdownDoctor?.name}</DialogTitle>
                            <DialogDescription>A detailed overview of the doctor's financial activity.</DialogDescription>
                        </DialogHeader>
                        <FinancialBreakdown doctorData={breakdownDoctor} transactions={transactions} />
                        <DialogFooter>
                            <DialogClose asChild><Button>Close</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    };

    export default AdminFinance;