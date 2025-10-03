import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Calendar } from "@/components/ui/calendar";
    import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
    import { cn } from "@/lib/utils";
    import { format, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
    import { ArrowLeft, Calendar as CalendarIcon, FileDown, BarChart2, Users, Briefcase, Coins as HandCoins } from 'lucide-react';
    import { generatePdf } from '@/lib/pdfGenerator';
    import { useToast } from '@/components/ui/use-toast';

    const AdminReports = () => {
        const navigate = useNavigate();
        const { users, proposals, settings, transactions, cases } = useData();
        const [date, setDate] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
        const [reportData, setReportData] = useState({ financial: null, doctors: [], cases: [], cashPayments: [] });
        const { toast } = useToast();

        useEffect(() => {
            if (!date?.from || !date?.to) return;

            const startDate = startOfDay(date.from);
            const endDate = endOfDay(date.to);

            const completedProposals = proposals.filter(p => p.status === 'completed' && p.accepted_at && isWithinInterval(new Date(p.accepted_at), { start: startDate, end: endDate }));
            
            const paidInCashProposals = completedProposals.filter(p => {
                const caseInfo = cases.find(c => c.id === p.case_id);
                return caseInfo && caseInfo.payment_status === 'paid_in_cash';
            });

            const paidOnlineProposals = completedProposals.filter(p => {
                const caseInfo = cases.find(c => c.id === p.case_id);
                return caseInfo && caseInfo.payment_status === 'paid';
            });

            const paidProposals = [...paidOnlineProposals, ...paidInCashProposals];

            const grossRevenue = paidProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
            const platformEarnings = paidProposals.reduce((acc, p) => {
                const doctor = users.find(u => u.id === p.doctor_id);
                if (!doctor) return acc;
                const cost = p.cost || 0;
                const commissionType = doctor.commission?.type || settings.commission_type;
                const commissionRate = doctor.commission?.rate || settings.commission_rate;
                return acc + (commissionType === 'percentage' ? cost * (Number(commissionRate) / 100) : Number(commissionRate || 0));
            }, 0);

            const periodTransactions = transactions.filter(t => isWithinInterval(new Date(t.date), { start: startDate, end: endDate }));
            const totalPayouts = periodTransactions.filter(t => t.type === 'payout').reduce((acc, t) => acc + t.amount, 0);

            const doctors = users.filter(u => u.role === 'doctor');
            const doctorStats = doctors.map(doctor => {
                const doctorProposals = paidProposals.filter(p => p.doctor_id === doctor.id);
                const gross = doctorProposals.reduce((acc, p) => acc + (p.cost || 0), 0);
                const commission = doctorProposals.reduce((acc, p) => {
                    const cost = p.cost || 0;
                    const commissionType = doctor.commission?.type || settings.commission_type;
                    const commissionRate = doctor.commission?.rate || settings.commission_rate;
                    return acc + (commissionType === 'percentage' ? cost * (Number(commissionRate) / 100) : Number(commissionRate || 0));
                }, 0);
                return {
                    id: doctor.id,
                    name: doctor.name,
                    cases: doctorProposals.length,
                    grossRevenue: gross,
                    commission,
                    netIncome: gross - commission,
                };
            }).filter(d => d.cases > 0);

            const caseHistory = cases.filter(c => c.created_at && isWithinInterval(new Date(c.created_at), { start: startDate, end: endDate }))
                .map(c => {
                    const proposal = proposals.find(p => p.id === c.chosen_proposal_id);
                    const doctor = proposal ? users.find(u => u.id === proposal.doctor_id) : null;
                    return { ...c, proposal, doctor };
                });

            const cashPaymentDetails = doctors.map(doctor => {
                const doctorCashProposals = paidInCashProposals.filter(p => p.doctor_id === doctor.id);
                if (doctorCashProposals.length === 0) return null;

                const caseDetails = doctorCashProposals.map(p => {
                    const caseInfo = cases.find(c => c.id === p.case_id);
                    return {
                        caseId: p.case_id,
                        patientName: caseInfo?.patient_name,
                        date: p.accepted_at,
                        amount: p.cost,
                    };
                });
                const totalCash = caseDetails.reduce((acc, c) => acc + c.amount, 0);
                
                // Calculate platform commission for cash payments
                const platformCommission = doctorCashProposals.reduce((acc, p) => {
                    const cost = p.cost || 0;
                    const commissionType = doctor.commission?.type || settings.commission_type;
                    const commissionRate = doctor.commission?.rate || settings.commission_rate;
                    return acc + (commissionType === 'percentage' ? cost * (Number(commissionRate) / 100) : Number(commissionRate || 0));
                }, 0);

                return {
                    doctorName: doctor.name,
                    cases: caseDetails,
                    totalCash,
                    platformCommission,
                };
            }).filter(Boolean);

            setReportData({
                financial: { grossRevenue, platformEarnings, totalPayouts, totalCases: paidProposals.length },
                doctors: doctorStats,
                cases: caseHistory,
                cashPayments: cashPaymentDetails,
            });

        }, [date, users, proposals, settings, transactions, cases]);

        const handleDownload = async (reportId, reportName) => {
            toast({ title: "Generating PDF...", description: "Your report is being prepared for download." });
            await generatePdf(reportId, reportName);
        };

        const ReportCard = ({ title, description, icon: Icon, reportId, children }) => (
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center"><Icon className="h-5 w-5 mr-2" />{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => handleDownload(reportId, `${title.replace(/\s+/g, '-')}-Report-${format(date.from, 'yyyy-MM-dd')}-to-${format(date.to, 'yyyy-MM-dd')}`)} className="w-full sm:w-auto">
                            <FileDown className="h-4 w-4 mr-2" />Download PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                        {children}
                    </div>
                </CardContent>
            </Card>
        );

        return (
            <>
                <Helmet><title>Download Reports - DentaLink Admin</title></Helmet>
                <div className="min-h-screen bg-gray-50">
                    <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-2 sm:py-0 gap-4">
                                <div className="flex items-center space-x-4">
                                    <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                    <h1 className="text-xl font-bold text-gradient">Download Center</h1>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="date" variant={"outline"} className={cn("w-full sm:w-auto min-w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : format(date.from, "LLL dd, y")) : (<span>Pick a date</span>)}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </header>
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
                            <ReportCard title="Financial Summary" description="Overview of all financial metrics for the selected period." icon={BarChart2} reportId="financial-report">
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center"><span>Gross Revenue:</span> <span className="font-semibold">৳{reportData.financial?.grossRevenue.toLocaleString() || 0}</span></div>
                                    <div className="flex justify-between items-center"><span>Platform Earnings:</span> <span className="font-semibold">৳{reportData.financial?.platformEarnings.toLocaleString() || 0}</span></div>
                                    <div className="flex justify-between items-center"><span>Total Payouts to Doctors:</span> <span className="font-semibold">৳{reportData.financial?.totalPayouts.toLocaleString() || 0}</span></div>
                                    <div className="flex justify-between items-center"><span>Total Paid Cases:</span> <span className="font-semibold">{reportData.financial?.totalCases || 0}</span></div>
                                </div>
                            </ReportCard>

                            <ReportCard title="Doctor Performance" description="Breakdown of earnings and cases for each doctor." icon={Users} reportId="doctor-report">
                                <table className="w-full text-sm">
                                    <thead className="text-left"><tr><th className="p-2 font-medium">Doctor</th><th className="p-2 font-medium text-right">Cases</th><th className="p-2 font-medium text-right">Gross Revenue</th><th className="p-2 font-medium text-right">Net Income</th></tr></thead>
                                    <tbody>
                                        {reportData.doctors.map(d => (
                                            <tr key={d.id} className="border-t"><td className="p-2">{d.name}</td><td className="p-2 text-right">{d.cases}</td><td className="p-2 text-right">৳{d.grossRevenue.toLocaleString()}</td><td className="p-2 text-right">৳{d.netIncome.toLocaleString()}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                                {reportData.doctors.length === 0 && <p className="text-center text-gray-500 py-4">No doctor data for this period.</p>}
                            </ReportCard>

                            <ReportCard title="Case History" description="A log of all cases created within the selected period." icon={Briefcase} reportId="case-report">
                                <table className="w-full text-sm">
                                    <thead className="text-left"><tr><th className="p-2 font-medium">Case ID</th><th className="p-2 font-medium">Patient</th><th className="p-2 font-medium">Doctor</th><th className="p-2 font-medium">Status</th><th className="p-2 font-medium text-right">Cost</th></tr></thead>
                                    <tbody>
                                        {reportData.cases.map(c => (
                                            <tr key={c.id} className="border-t"><td className="p-2">{c.id}</td><td className="p-2">{c.patient_name}</td><td className="p-2">{c.doctor?.name || 'N/A'}</td><td className="p-2">{c.status}</td><td className="p-2 text-right">৳{c.proposal?.cost.toLocaleString() || 'N/A'}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                                {reportData.cases.length === 0 && <p className="text-center text-gray-500 py-4">No case data for this period.</p>}
                            </ReportCard>

                            <ReportCard title="Cash Payment History" description="Details of all cash payments collected by doctors with platform commission breakdown." icon={HandCoins} reportId="cash-payment-report">
                                <div className="space-y-6">
                                    {reportData.cashPayments.map(doctorData => (
                                        <div key={doctorData.doctorName}>
                                            <h3 className="font-semibold text-base mb-2">{doctorData.doctorName}</h3>
                                            <table className="w-full text-sm">
                                                <thead className="text-left bg-gray-50"><tr><th className="p-2 font-medium">Case ID</th><th className="p-2 font-medium">Patient</th><th className="p-2 font-medium">Date</th><th className="p-2 font-medium text-right">Amount</th></tr></thead>
                                                <tbody>
                                                    {doctorData.cases.map(c => (
                                                        <tr key={c.caseId} className="border-t"><td className="p-2">{c.caseId}</td><td className="p-2">{c.patientName}</td><td className="p-2">{format(new Date(c.date), 'PP')}</td><td className="p-2 text-right">৳{c.amount.toLocaleString()}</td></tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-100">
                                                    <tr className="border-t-2 font-bold">
                                                        <td colSpan="3" className="p-2 text-right">Total Cash Collected:</td>
                                                        <td className="p-2 text-right">৳{doctorData.totalCash.toLocaleString()}</td>
                                                    </tr>
                                                    <tr className="border-t font-semibold">
                                                        <td colSpan="3" className="p-2 text-right">Platform Commission Due:</td>
                                                        <td className="p-2 text-right">৳{doctorData.platformCommission.toLocaleString()}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                                {reportData.cashPayments.length === 0 && <p className="text-center text-gray-500 py-4">No cash payment data for this period.</p>}
                            </ReportCard>
                        </motion.div>
                    </main>
                </div>

                <div className="absolute -left-[9999px] top-auto w-[800px] p-8 bg-white text-black">
                    <div id="financial-report">
                        <h1 className="text-2xl font-bold mb-2">Financial Summary Report</h1>
                        <p className="mb-4 text-gray-600">Period: {date.from ? format(date.from, 'PPP') : 'N/A'} to {date.to ? format(date.to, 'PPP') : 'N/A'}</p>
                        <div className="space-y-4 border-t pt-4">
                            <div className="flex justify-between text-lg"><span>Gross Revenue:</span> <span className="font-bold">৳{reportData.financial?.grossRevenue.toLocaleString() || 0}</span></div>
                            <div className="flex justify-between text-lg"><span>Platform Earnings:</span> <span className="font-bold">৳{reportData.financial?.platformEarnings.toLocaleString() || 0}</span></div>
                            <div className="flex justify-between text-lg"><span>Total Payouts to Doctors:</span> <span className="font-bold">৳{reportData.financial?.totalPayouts.toLocaleString() || 0}</span></div>
                            <div className="flex justify-between text-lg"><span>Total Paid Cases:</span> <span className="font-bold">{reportData.financial?.totalCases || 0}</span></div>
                        </div>
                    </div>

                    <div id="doctor-report">
                        <h1 className="text-2xl font-bold mb-2">Doctor Performance Report</h1>
                        <p className="mb-4 text-gray-600">Period: {date.from ? format(date.from, 'PPP') : 'N/A'} to {date.to ? format(date.to, 'PPP') : 'N/A'}</p>
                        <table className="w-full text-sm border-collapse">
                            <thead><tr className="border-b-2 border-black"><th className="p-2 text-left">Doctor</th><th className="p-2 text-right">Cases</th><th className="p-2 text-right">Gross Revenue</th><th className="p-2 text-right">Commission</th><th className="p-2 text-right">Net Income</th></tr></thead>
                            <tbody>
                                {reportData.doctors.map(d => (
                                    <tr key={d.id} className="border-b"><td className="p-2">{d.name}</td><td className="p-2 text-right">{d.cases}</td><td className="p-2 text-right">৳{d.grossRevenue.toLocaleString()}</td><td className="p-2 text-right">৳{d.commission.toLocaleString()}</td><td className="p-2 text-right">৳{d.netIncome.toLocaleString()}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div id="case-report">
                        <h1 className="text-2xl font-bold mb-2">Case History Report</h1>
                        <p className="mb-4 text-gray-600">Period: {date.from ? format(date.from, 'PPP') : 'N/A'} to {date.to ? format(date.to, 'PPP') : 'N/A'}</p>
                        <table className="w-full text-sm border-collapse">
                            <thead><tr className="border-b-2 border-black"><th className="p-2 text-left">Case ID</th><th className="p-2 text-left">Created</th><th className="p-2 text-left">Patient</th><th className="p-2 text-left">Doctor</th><th className="p-2 text-left">Status</th><th className="p-2 text-right">Cost</th></tr></thead>
                            <tbody>
                                {reportData.cases.map(c => (
                                    <tr key={c.id} className="border-b"><td className="p-2">{c.id}</td><td className="p-2">{format(new Date(c.created_at), 'PP')}</td><td className="p-2">{c.patient_name}</td><td className="p-2">{c.doctor?.name || 'N/A'}</td><td className="p-2">{c.status}</td><td className="p-2 text-right">৳{c.proposal?.cost.toLocaleString() || 'N/A'}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div id="cash-payment-report">
                        <h1 className="text-2xl font-bold mb-2">Cash Payment History Report</h1>
                        <p className="mb-4 text-gray-600">Period: {date.from ? format(date.from, 'PPP') : 'N/A'} to {date.to ? format(date.to, 'PPP') : 'N/A'}</p>
                        <div className="space-y-8">
                            {reportData.cashPayments.map(doctorData => (
                                <div key={doctorData.doctorName}>
                                    <h2 className="text-xl font-semibold mb-2 border-b pb-1">{doctorData.doctorName}</h2>
                                    <table className="w-full text-sm border-collapse">
                                        <thead><tr className="border-b-2 border-black"><th className="p-2 text-left">Case ID</th><th className="p-2 text-left">Patient</th><th className="p-2 text-left">Date</th><th className="p-2 text-right">Amount</th></tr></thead>
                                        <tbody>
                                            {doctorData.cases.map(c => (
                                                <tr key={c.caseId} className="border-b"><td className="p-2">{c.caseId}</td><td className="p-2">{c.patientName}</td><td className="p-2">{format(new Date(c.date), 'PP')}</td><td className="p-2 text-right">৳{c.amount.toLocaleString()}</td></tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-black font-bold">
                                                <td colSpan="3" className="p-2 text-right">Total Cash Collected:</td>
                                                <td className="p-2 text-right">৳{doctorData.totalCash.toLocaleString()}</td>
                                            </tr>
                                            <tr className="border-t font-semibold">
                                                <td colSpan="3" className="p-2 text-right">Platform Commission Due:</td>
                                                <td className="p-2 text-right">৳{doctorData.platformCommission.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </>
        );
    };

    export default AdminReports;