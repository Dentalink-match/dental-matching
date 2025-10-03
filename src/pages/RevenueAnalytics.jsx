import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Calendar } from "@/components/ui/calendar";
    import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
    import { cn } from "@/lib/utils";
    import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
    import { BarChart2, Calendar as CalendarIcon, ArrowLeft, DollarSign, Briefcase, TrendingUp, Banknote, Receipt, Plus, Minus, Undo2 } from 'lucide-react';
    import { Badge } from '@/components/ui/badge';

    const RevenueAnalytics = () => {
        const navigate = useNavigate();
        const { user } = useAuth();
        const { proposals, settings, users, transactions, fetchData, cases } = useData();
        const [date, setDate] = useState({
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date()),
        });
        const [timeframe, setTimeframe] = useState('this_month');
        const [stats, setStats] = useState({ gross: 0, commission: 0, net: 0, payouts: 0 });
        const [filteredProposals, setFilteredProposals] = useState([]);
        const [filteredTransactions, setFilteredTransactions] = useState([]);

        useEffect(() => {
            fetchData();
        }, [fetchData]);

        useEffect(() => {
            if (!user || !date?.from || !date?.to || !settings) {
                setStats({ gross: 0, commission: 0, net: 0, payouts: 0 });
                setFilteredProposals([]);
                setFilteredTransactions([]);
                return;
            }

            const doctorDetails = users.find(u => u.id === user.id);
            if (!doctorDetails) {
                setStats({ gross: 0, commission: 0, net: 0, payouts: 0 });
                setFilteredProposals([]);
                setFilteredTransactions([]);
                return;
            }

            const doctorProposals = proposals.filter(p => p.doctor_id === user.id);

            const paidAndCompletedProposals = doctorProposals.filter(p => {
                const caseInfo = cases.find(c => c.id === p.case_id);
                return caseInfo && 
                       (caseInfo.payment_status === 'paid' || caseInfo.payment_status === 'paid_in_cash') &&
                       p.status === 'completed' &&
                       p.accepted_at;
            });

            const filtered = paidAndCompletedProposals.filter(p => {
                const acceptedDate = new Date(p.accepted_at);
                if (isNaN(acceptedDate)) return false;
                return isWithinInterval(acceptedDate, { start: startOfDay(date.from), end: endOfDay(date.to) });
            });

            setFilteredProposals(filtered.sort((a, b) => new Date(b.accepted_at) - new Date(a.accepted_at)));

            const doctorTransactions = transactions.filter(t => t.doctor_id === user.id);
            const transactionsInRange = doctorTransactions.filter(t => {
                const transactionDate = new Date(t.date);
                return isWithinInterval(transactionDate, { start: startOfDay(date.from), end: endOfDay(date.to) });
            });
            setFilteredTransactions(transactionsInRange.sort((a, b) => new Date(b.date) - new Date(a.date)));
            
            const totalPayoutsAndAdjustments = transactionsInRange.reduce((acc, t) => {
                if (t.type === 'payout' || t.type === 'adjustment_bonus') return acc + t.amount;
                if (t.type === 'refund' || t.type === 'adjustment_deduction') return acc - t.amount;
                return acc;
            }, 0);

            const hasCustomCommission = doctorDetails?.commission?.type !== undefined && doctorDetails?.commission?.rate !== undefined;
            const commissionType = hasCustomCommission ? doctorDetails.commission.type : settings.commission_type;
            const commissionRate = hasCustomCommission ? doctorDetails.commission.rate : settings.commission_rate;

            const grossRevenue = filtered.reduce((acc, p) => acc + (p.cost || 0), 0);

            const totalCommission = filtered.reduce((acc, p) => {
                const cost = p.cost || 0;
                if (commissionType === "percentage") {
                    return acc + (cost * Number(commissionRate)) / 100;
                }
                return acc + Number(commissionRate || 0);
            }, 0);

            const netIncome = grossRevenue - totalCommission;

            setStats({ gross: grossRevenue, commission: totalCommission, net: netIncome, payouts: totalPayoutsAndAdjustments });
        }, [user, proposals, date, settings, users, transactions, cases]);

        const handleSetTimeframe = (frame) => {
            setTimeframe(frame);
            const today = new Date();
            if (frame === 'today') setDate({ from: startOfDay(today), to: endOfDay(today) });
            else if (frame === 'this_week') setDate({ from: startOfWeek(today), to: endOfWeek(today) });
            else if (frame === 'this_month') setDate({ from: startOfMonth(today), to: endOfMonth(today) });
        };

        const handleDateSelect = (newDate) => {
            if (newDate) {
                setDate(newDate);
                if (newDate.from && newDate.to) {
                    setTimeframe('custom');
                }
            }
        };

        const getTransactionTypeBadge = (type) => {
            switch (type) {
                case 'payout': return <Badge className="bg-green-100 text-green-800 flex items-center"><Banknote className="h-3 w-3 mr-1"/>Payout</Badge>;
                case 'adjustment_bonus': return <Badge className="bg-blue-100 text-blue-800 flex items-center"><Plus className="h-3 w-3 mr-1"/>Bonus</Badge>;
                case 'adjustment_deduction': return <Badge className="bg-yellow-100 text-yellow-800 flex items-center"><Minus className="h-3 w-3 mr-1"/>Deduction</Badge>;
                case 'refund': return <Badge className="bg-red-100 text-red-800 flex items-center"><Undo2 className="h-3 w-3 mr-1"/>Refund</Badge>;
                default: return <Badge>{type}</Badge>;
            }
        };

        return (
            <>
                <Helmet><title>My Revenue - DentaLink</title></Helmet>
                <div className="min-h-screen bg-gray-50">
                    <header className="bg-white shadow-sm border-b sticky top-0 z-40">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-16">
                                <div className="flex items-center space-x-4">
                                    <Button variant="outline" size="icon" onClick={() => navigate('/doctor/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                    <h1 className="text-xl font-bold text-gradient">My Revenue Analytics</h1>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                                        <div><CardTitle>Income Overview</CardTitle><CardDescription>Track all your revenue, commissions, and net income from paid cases.</CardDescription></div>
                                        <div className="flex items-center space-x-2 flex-wrap gap-2">
                                            <Button variant={timeframe === 'today' ? 'default' : 'outline'} onClick={() => handleSetTimeframe('today')}>Today</Button>
                                            <Button variant={timeframe === 'this_week' ? 'default' : 'outline'} onClick={() => handleSetTimeframe('this_week')}>This Week</Button>
                                            <Button variant={timeframe === 'this_month' ? 'default' : 'outline'} onClick={() => handleSetTimeframe('this_month')}>This Month</Button>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button id="date" variant={"outline"} className={cn("w-auto min-w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : format(date.from, "LLL dd, y")) : (<span>Pick a date</span>)}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="end">
                                                    <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={handleDateSelect} numberOfMonths={2} />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gross Revenue</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">৳{stats.gross.toLocaleString()}</div><p className="text-xs text-muted-foreground">From completed & paid treatments</p></CardContent></Card>
                                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Platform Commission</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">৳{stats.commission.toLocaleString()}</div><p className="text-xs text-muted-foreground">Fees paid to the platform</p></CardContent></Card>
                                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Net Income</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">৳{stats.net.toLocaleString()}</div><p className="text-xs text-muted-foreground">Your earnings after fees</p></CardContent></Card>
                                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Payouts Received</CardTitle><Banknote className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">৳{stats.payouts.toLocaleString()}</div><p className="text-xs text-muted-foreground">Net payouts in selected period</p></CardContent></Card>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Paid Cases Breakdown</h3>
                                            <div className="border rounded-lg max-h-[50vh] overflow-y-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 sticky top-0"><tr className="text-left"><th className="p-3 font-medium">Case ID</th><th className="p-3 font-medium">Paid On</th><th className="p-3 font-medium text-right">Cost</th></tr></thead>
                                                    <tbody>
                                                        {filteredProposals.map(p => (
                                                            <tr key={p.id} className="border-b"><td className="p-3 font-medium">{p.case_id}</td><td className="p-3">{format(new Date(p.accepted_at), "PPP")}</td><td className="p-3 text-right font-semibold">৳{p.cost.toLocaleString()}</td></tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {filteredProposals.length === 0 && <div className="text-center p-8"><BarChart2 className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-4 text-gray-600">No revenue data for the selected period.</p></div>}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Payout History</h3>
                                            <div className="border rounded-lg max-h-[50vh] overflow-y-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 sticky top-0"><tr className="text-left"><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Type</th><th className="p-3 font-medium">Notes</th><th className="p-3 font-medium text-right">Amount</th></tr></thead>
                                                    <tbody>
                                                        {filteredTransactions.map(t => (
                                                            <tr key={t.id} className="border-b">
                                                                <td className="p-3">{format(new Date(t.date), "PPP")}</td>
                                                                <td className="p-3">{getTransactionTypeBadge(t.type)}</td>
                                                                <td className="p-3 text-gray-600">{t.notes || 'N/A'}</td>
                                                                <td className={`p-3 text-right font-semibold ${t.type === 'payout' || t.type === 'adjustment_bonus' ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {t.type === 'payout' || t.type === 'adjustment_bonus' ? '+' : '-'} ৳{t.amount.toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {filteredTransactions.length === 0 && <div className="text-center p-8"><Receipt className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-4 text-gray-600">No payouts in the selected period.</p></div>}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </main>
                </div>
            </>
        );
    };

    export default RevenueAnalytics;