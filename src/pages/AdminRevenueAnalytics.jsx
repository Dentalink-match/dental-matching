
    import React, { useState, useEffect, useMemo, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Calendar } from "@/components/ui/calendar";
    import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
    import { cn } from "@/lib/utils";
    import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
    import { BarChart2, Calendar as CalendarIcon, ArrowLeft, DollarSign, Users, TrendingUp } from 'lucide-react';
    import {
      Chart as ChartJS,
      CategoryScale,
      LinearScale,
      BarElement,
      Title,
      Tooltip,
      Legend,
    } from 'chart.js';
    import { Bar } from 'react-chartjs-2';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

    ChartJS.register(
      CategoryScale,
      LinearScale,
      BarElement,
      Title,
      Tooltip,
      Legend
    );

    const AdminRevenueAnalytics = () => {
        const navigate = useNavigate();
        const { proposals, users, settings } = useData();
        const [date, setDate] = useState({
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date()),
        });
        const [timeframe, setTimeframe] = useState('this_month');
        const [stats, setStats] = useState({ gross: 0, commission: 0, net: 0 });
        const [doctorData, setDoctorData] = useState([]);
        const [selectedDoctor, setSelectedDoctor] = useState('all');

        const doctors = useMemo(() => users.filter(u => u.role === 'doctor' && u.is_verified), [users]);

        const calculateAnalytics = useCallback(() => {
            if (!date?.from || !date?.to || !proposals || !users || users.length === 0) {
                setStats({ gross: 0, commission: 0, net: 0 });
                setDoctorData([]);
                return;
            }

            const acceptedProposals = proposals.filter(p => (p.status === 'accepted' || p.status === 'completed') && p.accepted_at);
            
            const filtered = acceptedProposals.filter(p => {
                const acceptedDate = new Date(p.accepted_at);
                return isWithinInterval(acceptedDate, { start: startOfDay(date.from), end: endOfDay(date.to) });
            });

            const doctorRevenueMap = new Map();
            
            users.filter(u => u.role === 'doctor').forEach(doc => {
                doctorRevenueMap.set(doc.id, { id: doc.id, name: doc.name, gross: 0, commission: 0, net: 0, cases: 0 });
            });

            filtered.forEach(p => {
                const doctor = users.find(u => u.id === p.doctor_id);
                if (!doctor || !doctorRevenueMap.has(doctor.id)) return;

                const cost = p.cost || 0;
                const commissionType = doctor.commission?.type && doctor.commission?.rate ? doctor.commission.type : settings.commission_type;
                const commissionRate = doctor.commission?.type && doctor.commission?.rate ? doctor.commission.rate : settings.commission_rate;
                const commissionAmount = commissionType === 'percentage' ? cost * (Number(commissionRate) / 100) : Number(commissionRate || 0);

                const current = doctorRevenueMap.get(doctor.id);
                current.gross += cost;
                current.commission += commissionAmount;
                current.net += (cost - commissionAmount);
                current.cases += 1;
            });

            const doctorStats = Array.from(doctorRevenueMap.values())
              .filter(d => d.gross > 0 || d.cases > 0)
              .sort((a, b) => b.gross - a.gross);
              
            setDoctorData(doctorStats);

            const totalGross = doctorStats.reduce((acc, doc) => acc + doc.gross, 0);
            const totalCommission = doctorStats.reduce((acc, doc) => acc + doc.commission, 0);
            const totalNet = totalGross - totalCommission;

            setStats({ gross: totalGross, commission: totalCommission, net: totalNet });
        }, [date, proposals, users, settings]);

        useEffect(() => {
            calculateAnalytics();
        }, [calculateAnalytics]);

        const handleSetTimeframe = (frame) => {
            setTimeframe(frame);
            const today = new Date();
            let newFrom, newTo;
            if (frame === 'today') {
              newFrom = startOfDay(today);
              newTo = endOfDay(today);
            } else if (frame === 'this_week') {
              newFrom = startOfWeek(today);
              newTo = endOfWeek(today);
            } else if (frame === 'this_month') {
              newFrom = startOfMonth(today);
              newTo = endOfMonth(today);
            }
            setDate({ from: newFrom, to: newTo });
        };

        const handleDateSelect = (newDate) => {
          if (newDate) {
            setDate(newDate);
            if (newDate.from && newDate.to) {
              setTimeframe('custom');
            }
          }
        };

        const chartData = useMemo(() => {
            const dataToChart = selectedDoctor === 'all' ? doctorData.slice(0, 10) : doctorData.filter(d => d.id === selectedDoctor);
            return {
                labels: dataToChart.map(d => `Dr. ${d.name}`),
                datasets: [
                    { label: 'Gross Revenue', data: dataToChart.map(d => d.gross), backgroundColor: 'rgba(54, 162, 235, 0.6)' },
                    { label: 'Net Income', data: dataToChart.map(d => d.net), backgroundColor: 'rgba(75, 192, 192, 0.6)' },
                    { label: 'Commission', data: dataToChart.map(d => d.commission), backgroundColor: 'rgba(255, 99, 132, 0.6)' },
                ],
            };
        }, [doctorData, selectedDoctor]);

        return (
            <>
            <Helmet><title>Platform Revenue - DentaLink Admin</title></Helmet>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
                <header className="bg-white shadow-sm border-b sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                             <div className="flex items-center space-x-4">
                                <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                <h1 className="text-xl font-bold text-gradient">Platform Revenue Analytics</h1>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                                    <div><CardTitle>Platform Income Overview</CardTitle><CardDescription>Track total revenue, commissions, and net income across the platform.</CardDescription></div>
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
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Gross Revenue</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">৳{stats.gross.toLocaleString()}</div><p className="text-xs text-muted-foreground">Total value of all completed treatments</p></CardContent></Card>
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Commission Earned</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">৳{stats.commission.toLocaleString()}</div><p className="text-xs text-muted-foreground">Platform earnings from commissions</p></CardContent></Card>
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Payout to Doctors</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">৳{stats.net.toLocaleString()}</div><p className="text-xs text-muted-foreground">Total amount paid out to doctors</p></CardContent></Card>
                                </div>

                                <div className="mt-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold">Doctor Performance</h3>
                                        <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                                            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select a doctor" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Doctors (Top 10)</SelectItem>
                                                {doctors.map(doc => <SelectItem key={doc.id} value={doc.id}>Dr. {doc.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Card>
                                        <CardContent className="p-4">
                                            {doctorData.length > 0 ? <Bar options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Doctor Revenue Comparison' } } }} data={chartData} /> : <div className="text-center p-8"><BarChart2 className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-4 text-gray-600">No revenue data for the selected period.</p></div>}
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold mb-4">Detailed Doctor Breakdown</h3>
                                    <div className="border rounded-lg max-h-[50vh] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 sticky top-0"><tr className="text-left"><th className="p-3 font-medium">Doctor</th><th className="p-3 font-medium text-right">Cases</th><th className="p-3 font-medium text-right">Gross Revenue</th><th className="p-3 font-medium text-right">Commission</th><th className="p-3 font-medium text-right">Net Payout</th></tr></thead>
                                            <tbody>
                                                {doctorData.map(d => (
                                                    <tr key={d.id} className="border-b"><td className="p-3 font-medium">Dr. {d.name}</td><td className="p-3 text-right">{d.cases}</td><td className="p-3 text-right">৳{d.gross.toLocaleString()}</td><td className="p-3 text-right text-red-600">৳{d.commission.toLocaleString()}</td><td className="p-3 text-right font-semibold text-green-600">৳{d.net.toLocaleString()}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {doctorData.length === 0 && <div className="text-center p-8"><p className="text-gray-600">No data to display.</p></div>}
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

    export default AdminRevenueAnalytics;
  