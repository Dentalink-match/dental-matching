import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, UserPlus, Users, Edit, Trash2, Search, DollarSign, PiggyBank, TrendingUp, Landmark, Percent, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';

const AdminInvestment = () => {
    const navigate = useNavigate();
    const [investors, setInvestors] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [distributions, setDistributions] = useState([]);
    const [isInvestorFormOpen, setIsInvestorFormOpen] = useState(false);
    const [isInvestmentFormOpen, setIsInvestmentFormOpen] = useState(false);
    const [isDistributionFormOpen, setIsDistributionFormOpen] = useState(false);
    const [editingInvestor, setEditingInvestor] = useState(null);
    const [selectedInvestor, setSelectedInvestor] = useState(null);
    const [investorFormData, setInvestorFormData] = useState({ name: '', email: '', phone: '', address: '' });
    const [investmentFormData, setInvestmentFormData] = useState({ investor_id: '', amount: '', investment_date: '', notes: '' });
    const [distributionFormData, setDistributionFormData] = useState({ total_profit: '', distribution_percentage: '', notes: '' });

    const fetchData = async () => {
        const { data: invData, error: invErr } = await supabase.from('investors').select('*');
        if (invErr) toast({ title: "Error fetching investors", variant: "destructive" }); else setInvestors(invData || []);
        const { data: investData, error: investErr } = await supabase.from('investments').select('*');
        if (investErr) toast({ title: "Error fetching investments", variant: "destructive" }); else setInvestments(investData || []);
        const { data: distData, error: distErr } = await supabase.from('profit_distributions').select('*');
        if (distErr) toast({ title: "Error fetching distributions", variant: "destructive" }); else setDistributions(distData || []);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const stats = useMemo(() => {
        const totalInvestment = investments.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const totalDistributed = distributions.reduce((acc, curr) => acc + Number(curr.total_profit) * (Number(curr.distribution_percentage) / 100), 0);
        return {
            totalInvestors: investors.length,
            totalInvestment,
            totalDistributed,
        };
    }, [investors, investments, distributions]);

    const handleOpenInvestorForm = (investor = null) => {
        setEditingInvestor(investor);
        setInvestorFormData(investor ? { name: investor.name, email: investor.email, phone: investor.phone, address: investor.address } : { name: '', email: '', phone: '', address: '' });
        setIsInvestorFormOpen(true);
    };

    const handleInvestorSubmit = async (e) => {
        e.preventDefault();
        const { error } = editingInvestor
            ? await supabase.from('investors').update(investorFormData).eq('id', editingInvestor.id)
            : await supabase.from('investors').insert(investorFormData);
        if (error) toast({ title: "Operation Failed", variant: "destructive", description: error.message });
        else {
            toast({ title: `Investor ${editingInvestor ? 'Updated' : 'Added'}` });
            setIsInvestorFormOpen(false);
            fetchData();
        }
    };

    const handleOpenInvestmentForm = (investor) => {
        setSelectedInvestor(investor);
        setInvestmentFormData({ investor_id: investor.id, amount: '', investment_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
        setIsInvestmentFormOpen(true);
    };

    const handleInvestmentSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('investments').insert({ ...investmentFormData, amount: parseFloat(investmentFormData.amount) });
        if (error) toast({ title: "Operation Failed", variant: "destructive", description: error.message });
        else {
            const investorInvestments = [...investments, { ...investmentFormData, amount: parseFloat(investmentFormData.amount) }]
                .filter(i => i.investor_id === selectedInvestor.id);
            const totalInvested = investorInvestments.reduce((acc, i) => acc + i.amount, 0);
            await supabase.from('investors').update({ investment_amount: totalInvested }).eq('id', selectedInvestor.id);
            
            toast({ title: "Investment Added" });
            setIsInvestmentFormOpen(false);
            fetchData();
        }
    };

    const handleDistributionSubmit = async (e) => {
        e.preventDefault();
        const totalInvestment = stats.totalInvestment;
        const payload = {
            ...distributionFormData,
            total_profit: parseFloat(distributionFormData.total_profit),
            distribution_percentage: parseFloat(distributionFormData.distribution_percentage),
            total_investment: totalInvestment,
            distribution_date: format(new Date(), 'yyyy-MM-dd'),
        };
        const { error } = await supabase.from('profit_distributions').insert(payload);
        if (error) toast({ title: "Operation Failed", variant: "destructive", description: error.message });
        else {
            toast({ title: "Profit Distribution Recorded" });
            setIsDistributionFormOpen(false);
            fetchData();
        }
    };

    return (
        <>
            <Helmet><title>Investment Hub - DentaLink Admin</title></Helmet>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center space-x-4">
                                <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                <h1 className="text-xl font-bold text-gradient flex items-center"><PiggyBank className="mr-2"/>Investment Hub</h1>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Investors</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalInvestors}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Investment</CardTitle><Landmark className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">৳{stats.totalInvestment.toLocaleString()}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Profit Distributed</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">৳{stats.totalDistributed.toLocaleString()}</div></CardContent></Card>
                        </div>

                        <Tabs defaultValue="investors">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="investors">Investors</TabsTrigger>
                                <TabsTrigger value="investments">Investment Log</TabsTrigger>
                                <TabsTrigger value="distributions">Profit Distribution</TabsTrigger>
                            </TabsList>
                            <TabsContent value="investors" className="mt-6">
                                <Card>
                                    <CardHeader><div className="flex justify-between items-center"><CardTitle>Investor Management</CardTitle><Button onClick={() => handleOpenInvestorForm()}><UserPlus className="h-4 w-4 mr-2"/>Add Investor</Button></div></CardHeader>
                                    <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto">
                                        {investors.map(inv => (
                                            <div key={inv.id} className="border p-4 rounded-lg flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-primary">{inv.name}</p>
                                                    <p className="text-sm text-gray-600">Total Invested: ৳{(inv.investment_amount || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" onClick={() => handleOpenInvestmentForm(inv)}>+ Invest</Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleOpenInvestorForm(inv)}><Edit className="h-4 w-4"/></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="investments" className="mt-6">
                                <Card>
                                    <CardHeader><CardTitle>All Investments</CardTitle></CardHeader>
                                    <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto">
                                        {investments.map(item => {
                                            const investor = investors.find(i => i.id === item.investor_id);
                                            return (
                                                <div key={item.id} className="border p-3 rounded-lg">
                                                    <p className="font-semibold">{investor?.name}</p>
                                                    <p>Amount: <span className="font-bold">৳{item.amount.toLocaleString()}</span> on {format(new Date(item.investment_date), 'PP')}</p>
                                                    {item.notes && <p className="text-xs text-gray-500 mt-1">Note: {item.notes}</p>}
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="distributions" className="mt-6">
                                <Card>
                                    <CardHeader><div className="flex justify-between items-center"><CardTitle>Profit Distribution</CardTitle><Button onClick={() => setIsDistributionFormOpen(true)}><Percent className="h-4 w-4 mr-2"/>New Distribution</Button></div></CardHeader>
                                    <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto">
                                        {distributions.map(dist => (
                                            <div key={dist.id} className="border p-3 rounded-lg">
                                                <p className="font-semibold">Distributed on {format(new Date(dist.distribution_date), 'PP')}</p>
                                                <p>Total Profit: ৳{dist.total_profit.toLocaleString()}</p>
                                                <p>Distributed: {dist.distribution_percentage}% (৳{(dist.total_profit * dist.distribution_percentage / 100).toLocaleString()})</p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </motion.div>
                </main>
            </div>

            {/* Investor Form Dialog */}
            <Dialog open={isInvestorFormOpen} onOpenChange={setIsInvestorFormOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingInvestor ? 'Edit' : 'Add'} Investor</DialogTitle></DialogHeader>
                    <form onSubmit={handleInvestorSubmit} className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Name</Label><Input value={investorFormData.name} onChange={e => setInvestorFormData({...investorFormData, name: e.target.value})} required/></div>
                        <div className="space-y-2"><Label>Email</Label><Input type="email" value={investorFormData.email} onChange={e => setInvestorFormData({...investorFormData, email: e.target.value})}/></div>
                        <div className="space-y-2"><Label>Phone</Label><Input value={investorFormData.phone} onChange={e => setInvestorFormData({...investorFormData, phone: e.target.value})}/></div>
                        <div className="space-y-2"><Label>Address</Label><Textarea value={investorFormData.address} onChange={e => setInvestorFormData({...investorFormData, address: e.target.value})}/></div>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">Save</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Investment Form Dialog */}
            <Dialog open={isInvestmentFormOpen} onOpenChange={setIsInvestmentFormOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Investment for {selectedInvestor?.name}</DialogTitle></DialogHeader>
                    <form onSubmit={handleInvestmentSubmit} className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Amount (৳)</Label><Input type="number" value={investmentFormData.amount} onChange={e => setInvestmentFormData({...investmentFormData, amount: e.target.value})} required/></div>
                        <div className="space-y-2"><Label>Investment Date</Label><Input type="date" value={investmentFormData.investment_date} onChange={e => setInvestmentFormData({...investmentFormData, investment_date: e.target.value})} required/></div>
                        <div className="space-y-2"><Label>Notes</Label><Textarea value={investmentFormData.notes} onChange={e => setInvestmentFormData({...investmentFormData, notes: e.target.value})}/></div>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">Add Investment</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Distribution Form Dialog */}
            <Dialog open={isDistributionFormOpen} onOpenChange={setIsDistributionFormOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Record Profit Distribution</DialogTitle></DialogHeader>
                    <form onSubmit={handleDistributionSubmit} className="space-y-4 py-4">
                        <p className="text-sm">Current Total Investment: <span className="font-bold">৳{stats.totalInvestment.toLocaleString()}</span></p>
                        <div className="space-y-2"><Label>Total Profit for Period (৳)</Label><Input type="number" value={distributionFormData.total_profit} onChange={e => setDistributionFormData({...distributionFormData, total_profit: e.target.value})} required/></div>
                        <div className="space-y-2"><Label>Distribution Percentage (%)</Label><Input type="number" value={distributionFormData.distribution_percentage} onChange={e => setDistributionFormData({...distributionFormData, distribution_percentage: e.target.value})} required/></div>
                        <div className="space-y-2"><Label>Notes</Label><Textarea value={distributionFormData.notes} onChange={e => setDistributionFormData({...distributionFormData, notes: e.target.value})}/></div>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">Record Distribution</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AdminInvestment;