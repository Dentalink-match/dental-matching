import React, { useMemo } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { ArrowLeft, Users, Stethoscope, Zap, Activity, Mail, BrainCircuit, BarChart2, User, Hash, FileText, Percent, Star, TrendingUp } from 'lucide-react';
    import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
    import { subMonths, differenceInMilliseconds, format } from 'date-fns';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import { Badge } from '@/components/ui/badge';

    const KpiCard = ({ title, value, icon: Icon }) => (
        <div className="p-3 sm:p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between h-full">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
                    {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />}
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 truncate">{value}</p>
            </div>
        </div>
    );

    const ChangeDetail = ({ field, before, after }) => (
        <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="font-semibold text-gray-500 break-all">{field}</div>
            <div className="text-red-600 bg-red-50 p-1 rounded break-all">{String(before)}</div>
            <div className="text-green-600 bg-green-50 p-1 rounded break-all">{String(after)}</div>
        </div>
    );

    const AdminAdvancedAnalytics = () => {
        const navigate = useNavigate();
        const { users, cases, proposals, appointments, reviews, transactions, activityLogs } = useData();

        const enrichedActivityLogs = useMemo(() => {
            if (!activityLogs || !users) return [];
            return activityLogs.map(log => {
                const user = users.find(u => u.id === log.user_id);
                return {
                    ...log,
                    user_email: user ? user.email : 'N/A',
                };
            }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }, [activityLogs, users]);

        const analyticsData = useMemo(() => {
            if (!users || !cases || !proposals || !appointments || !reviews || !transactions) {
                return {
                    patient: { total: 0, profileCompletion: 0, repeat: 0, cancellationRate: 0, appointmentRequestsVsConfirmations: 0 },
                    dentist: { total: 0, verified: 0, pending: 0, appointmentsPer: 0, avgResponseTime: 0, retention: 0, proposalSuccessRate: 0, avgRating: 0, totalEarnings: 0 },
                    matching: { successRate: 0, avgTime: 0, satisfaction: 0, topSpecialties: [] },
                    financial: { arpu: 0, ltv: 0, cac: 500, disputeRatio: 0, totalRevenue: 0 }
                };
            }

            const patients = users.filter(u => u.role === 'patient');
            const doctors = users.filter(u => u.role === 'doctor');
            const oneMonthAgo = subMonths(new Date(), 1);

            const totalPatients = patients.length;
            const completedProfiles = patients.filter(p => p.profile_complete).length;
            const profileCompletionRate = totalPatients > 0 ? (completedProfiles / totalPatients) * 100 : 0;
            
            const totalAppointments = appointments.length;
            const confirmedAppointments = appointments.filter(a => a.status === 'scheduled' || a.status === 'completed').length;
            const appointmentRequestsVsConfirmations = totalAppointments > 0 ? (confirmedAppointments / totalAppointments) * 100 : 0;
            const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
            const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;

            const patientCaseCounts = cases.reduce((acc, curr) => {
                acc[curr.patient_id] = (acc[curr.patient_id] || 0) + 1;
                return acc;
            }, {});
            const repeatPatients = Object.values(patientCaseCounts).filter(count => count > 1).length;

            const totalDoctors = doctors.length;
            const verifiedDoctors = doctors.filter(d => d.is_verified).length;
            const pendingDoctors = doctors.filter(d => !d.is_verified && d.status !== 'rejected').length;
            const appointmentsPerDoctor = totalDoctors > 0 ? confirmedAppointments / totalDoctors : 0;
            
            const responseTimes = proposals.map(p => {
                const caseInfo = cases.find(c => c.id === p.case_id);
                if (!caseInfo || !caseInfo.assignment_time) return null;
                return differenceInMilliseconds(new Date(p.created_at), new Date(caseInfo.assignment_time));
            }).filter(Boolean);
            const avgResponseTime = responseTimes.length > 0 ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) / (1000 * 60 * 60) : 0;

            const activeDoctors = doctors.filter(d => new Date(d.updated_at) > oneMonthAgo).length;
            const doctorRetention = totalDoctors > 0 ? (activeDoctors / totalDoctors) * 100 : 0;

            const doctorProposalStats = doctors.map(doctor => {
                const doctorProposals = proposals.filter(p => p.doctor_id === doctor.id);
                const acceptedCount = doctorProposals.filter(p => p.status === 'accepted' || p.status === 'completed').length;
                return {
                    successRate: doctorProposals.length > 0 ? (acceptedCount / doctorProposals.length) * 100 : 0,
                };
            });
            const avgProposalSuccessRate = doctorProposalStats.length > 0 ? doctorProposalStats.reduce((acc, curr) => acc + curr.successRate, 0) / doctorProposalStats.length : 0;

            const doctorReviews = reviews.filter(r => r.reviewee_role === 'doctor');
            const avgDoctorRating = doctorReviews.length > 0 ? doctorReviews.reduce((acc, r) => acc + r.rating, 0) / doctorReviews.length : 0;

            const totalDoctorEarnings = transactions.filter(t => t.type === 'payout').reduce((acc, t) => acc + t.amount, 0);

            const assignedCases = cases.filter(c => c.assigned_doctor_ids && c.assigned_doctor_ids.length > 0);
            const casesWithAppointments = assignedCases.filter(c => appointments.some(a => a.case_id === c.id && a.status !== 'cancelled'));
            const matchSuccessRate = assignedCases.length > 0 ? (casesWithAppointments.length / assignedCases.length) * 100 : 0;

            const matchingTimes = cases.map(c => {
                if (!c.created_at || !c.assignment_time) return null;
                return differenceInMilliseconds(new Date(c.assignment_time), new Date(c.created_at));
            }).filter(Boolean);
            const avgMatchingTime = matchingTimes.length > 0 ? (matchingTimes.reduce((a, b) => a + b, 0) / matchingTimes.length) / (1000 * 60) : 0;

            const avgPatientSatisfaction = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

            const specialtyCounts = cases.reduce((acc, curr) => {
                if (curr.treatmentNeeded) {
                    acc[curr.treatmentNeeded] = (acc[curr.treatmentNeeded] || 0) + 1;
                }
                return acc;
            }, {});
            const topSpecialties = Object.entries(specialtyCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

            const totalRevenue = transactions.filter(t => t.type === 'treatment_payment').reduce((acc, t) => acc + t.amount, 0);
            const arpu = totalPatients > 0 ? totalRevenue / totalPatients : 0;
            const ltv = arpu * 3.5;
            const cac = 500;
            const paymentTransactions = transactions.filter(t => t.type === 'treatment_payment' || t.type === 'credit_deposit');
            const successfulPayments = paymentTransactions.length;
            const refundTransactions = transactions.filter(t => t.type === 'refund');
            const disputeRatio = successfulPayments > 0 ? (refundTransactions.length / successfulPayments) * 100 : 0;

            return {
                patient: { total: totalPatients, profileCompletion: profileCompletionRate, repeat: repeatPatients, cancellationRate, appointmentRequestsVsConfirmations },
                dentist: { total: totalDoctors, verified: verifiedDoctors, pending: pendingDoctors, appointmentsPer: appointmentsPerDoctor, avgResponseTime, retention: doctorRetention, proposalSuccessRate: avgProposalSuccessRate, avgRating: avgDoctorRating, totalEarnings: totalDoctorEarnings },
                matching: { successRate: matchSuccessRate, avgTime: avgMatchingTime, satisfaction: avgPatientSatisfaction, topSpecialties },
                financial: { arpu, ltv, cac, disputeRatio, totalRevenue }
            };
        }, [users, cases, proposals, appointments, reviews, transactions]);

        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

        const renderActivityLog = () => (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-lg sm:text-xl"><Activity className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-primary" />Platform Activity Log</CardTitle>
                    <CardDescription>A real-time feed of important actions. Total actions: {enrichedActivityLogs.length}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 sm:pr-4">
                        {enrichedActivityLogs.map(log => {
                            const changes = [];
                            if (log.details && log.details.previous && log.details.new) {
                                const allKeys = new Set([...Object.keys(log.details.previous), ...Object.keys(log.details.new)]);
                                allKeys.forEach(key => {
                                    const before = log.details.previous[key];
                                    const after = log.details.new[key];
                                    if (JSON.stringify(before) !== JSON.stringify(after) && key !== 'updated_at') {
                                        changes.push({ field: key, before, after });
                                    }
                                });
                            }

                            return (
                                <div key={log.id} className="p-4 border rounded-lg bg-white shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                                        <Badge variant="secondary" className="text-xs font-bold mb-2 sm:mb-0">{log.action}</Badge>
                                        <p className="text-xs text-gray-500">
                                            {format(new Date(log.created_at), "PPpp")}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-4">
                                        <div className="flex items-center"><User className="h-4 w-4 mr-2 text-gray-500" /><span className="font-semibold">{log.user_name || 'System'}</span></div>
                                        <div className="flex items-center truncate"><Mail className="h-4 w-4 mr-2 text-gray-500" /><span className="truncate">{log.user_email}</span></div>
                                        <div className="flex items-center truncate"><Hash className="h-4 w-4 mr-2 text-gray-500" /><span className="truncate text-xs">{log.user_id}</span></div>
                                    </div>
                                    
                                    {changes.length > 0 ? (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-semibold mb-2 flex items-center"><FileText className="h-4 w-4 mr-2" />Changes</h4>
                                            <div className="space-y-2 p-3 bg-gray-50 rounded-md border">
                                                <div className="grid grid-cols-3 gap-2 text-xs font-bold text-gray-600">
                                                    <div>Field</div>
                                                    <div>Before</div>
                                                    <div>After</div>
                                                </div>
                                                {changes.map(change => (
                                                    <ChangeDetail key={change.field} field={change.field} before={change.before} after={change.after} />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        log.details && Object.keys(log.details).length > 0 && (
                                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
                                                <pre className="whitespace-pre-wrap break-all font-sans">{JSON.stringify(log.details, null, 2)}</pre>
                                            </div>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        );

        return (
            <>
                <Helmet><title>Advanced Analytics - DentaLink Admin</title></Helmet>
                <div className="min-h-screen bg-gray-50">
                    <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-16">
                                <div className="flex items-center space-x-2 sm:space-x-4">
                                    <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                    <h1 className="text-lg sm:text-xl font-bold text-gradient flex items-center"><BrainCircuit className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />Advanced Analytics</h1>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                            <Tabs defaultValue="activityLog" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                                    <TabsTrigger value="kpis">KPIs</TabsTrigger>
                                    <TabsTrigger value="activityLog">Activity Log</TabsTrigger>
                                </TabsList>
                                <TabsContent value="kpis" className="space-y-6">
                                    <Card>
                                        <CardHeader><CardTitle className="flex items-center text-lg sm:text-xl"><Users className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-blue-500" />Patient Data</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
                                            <KpiCard title="Total Patients" value={analyticsData.patient.total.toLocaleString()} />
                                            <KpiCard title="Profile Done" value={`${analyticsData.patient.profileCompletion.toFixed(0)}%`} />
                                            <KpiCard title="Confirm Rate" value={`${analyticsData.patient.appointmentRequestsVsConfirmations.toFixed(0)}%`} />
                                            <KpiCard title="Repeat Patients" value={analyticsData.patient.repeat.toLocaleString()} />
                                            <KpiCard title="Cancel Rate" value={`${analyticsData.patient.cancellationRate.toFixed(0)}%`} />
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle className="flex items-center text-lg sm:text-xl"><Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-green-500" />Doctor Performance</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
                                            <KpiCard title="Total Doctors" value={analyticsData.dentist.total.toLocaleString()} icon={Users} />
                                            <KpiCard title="Proposal Success" value={`${analyticsData.dentist.proposalSuccessRate.toFixed(0)}%`} icon={Percent} />
                                            <KpiCard title="Avg. Rating" value={`${analyticsData.dentist.avgRating.toFixed(1)}/5`} icon={Star} />
                                            <KpiCard title="Total Payouts" value={`৳${analyticsData.dentist.totalEarnings.toLocaleString()}`} icon={TrendingUp} />
                                            <KpiCard title="Response (Hrs)" value={analyticsData.dentist.avgResponseTime.toFixed(1)} icon={Zap} />
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle className="flex items-center text-lg sm:text-xl"><Zap className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-yellow-500" />Matching Performance</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                                <KpiCard title="Success Rate" value={`${analyticsData.matching.successRate.toFixed(0)}%`} />
                                                <KpiCard title="Match Time (Min)" value={analyticsData.matching.avgTime.toFixed(1)} />
                                                <KpiCard title="Satisfaction" value={`${analyticsData.matching.satisfaction.toFixed(1)}/5`} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold mb-2 text-center text-sm sm:text-base">Top Specialties</h3>
                                                <ResponsiveContainer width="100%" height={180}>
                                                    <PieChart>
                                                        <Pie data={analyticsData.matching.topSpecialties} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} className="text-xs">
                                                            {analyticsData.matching.topSpecialties.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                                        </Pie>
                                                        <Tooltip wrapperClassName="text-xs" />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle className="flex items-center text-lg sm:text-xl"><BarChart2 className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-red-500" />Financial KPIs</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                                            <KpiCard title="Total Revenue" value={`৳${analyticsData.financial.totalRevenue.toLocaleString()}`} />
                                            <KpiCard title="ARPU (Est.)" value={`৳${analyticsData.financial.arpu.toFixed(0)}`} />
                                            <KpiCard title="LTV:CAC (Est.)" value={`${(analyticsData.financial.ltv / analyticsData.financial.cac).toFixed(1)}:1`} />
                                            <KpiCard title="Dispute Ratio" value={`${analyticsData.financial.disputeRatio.toFixed(1)}%`} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                <TabsContent value="activityLog">
                                    {renderActivityLog()}
                                </TabsContent>
                            </Tabs>
                        </motion.div>
                    </main>
                </div>
            </>
        );
    };

    export default AdminAdvancedAnalytics;