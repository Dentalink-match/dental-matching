import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { toast } from '@/components/ui/use-toast';
    import { ArrowLeft, Wallet as WalletIcon, Plus, Banknote, Receipt } from 'lucide-react';
    import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { format } from 'date-fns';

    const Wallet = () => {
        const navigate = useNavigate();
        const { user } = useAuth();
        const { users, transactions, addCreditToWallet, fetchData } = useData();
        const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
        const [amount, setAmount] = useState('');
        const [method, setMethod] = useState('bkash');
        const [userTransactions, setUserTransactions] = useState([]);

        const patientDetails = users.find(u => u.id === user?.id);

        useEffect(() => {
            if(fetchData) fetchData();
        }, []);

        useEffect(() => {
            if (user && transactions) {
                const filteredTransactions = transactions
                    .filter(t => t.user_id === user.id && (t.type === 'credit_deposit' || t.type === 'treatment_payment' && t.payment_method === 'wallet'))
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                setUserTransactions(filteredTransactions);
            }
        }, [transactions, user]);

        const handleAddMoney = async () => {
            const numericAmount = parseFloat(amount);
            if (!numericAmount || numericAmount <= 0) {
                toast({ title: "অবৈধ পরিমাণ", description: "অনুগ্রহ করে একটি সঠিক পরিমাণ লিখুন।", variant: "destructive" });
                return;
            }
            const result = await addCreditToWallet(user.id, numericAmount, method);
            if (result.success) {
                toast({ title: "সফল!", description: `৳${numericAmount} আপনার ওয়ালেটে যোগ করা হয়েছে।` });
                setIsAddMoneyOpen(false);
                setAmount('');
            } else {
                toast({ title: "ব্যর্থ", description: result.message, variant: "destructive" });
            }
        };

        const getTransactionTypeBadge = (type, paymentMethod) => {
            if (type === 'credit_deposit') {
                return <Badge className="bg-green-100 text-green-800">ক্রেডিট যোগ</Badge>;
            }
            if (type === 'treatment_payment' && paymentMethod === 'wallet') {
                return <Badge className="bg-blue-100 text-blue-800">কেস পেমেন্ট</Badge>;
            }
            return <Badge>{type}</Badge>;
        };

        if (!user) {
            navigate('/login');
            return null;
        }

        return (
            <>
                <Helmet><title>আমার ওয়ালেট - ডেন্টালিন্ক</title></Helmet>
                <div className="min-h-screen bg-gray-50">
                    <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-16">
                                <div className="flex items-center space-x-4">
                                    <Button variant="outline" size="icon" onClick={() => navigate('/patient/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                    <h1 className="text-xl font-bold text-gradient">আমার ওয়ালেট</h1>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                            <Card className="mb-8 bg-gradient-to-r from-primary to-cyan-500 text-white">
                                <CardHeader>
                                    <CardTitle className="text-lg font-medium">বর্তমান ব্যালেন্স</CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between">
                                    <p className="text-5xl font-bold">৳{(patientDetails?.credit || 0).toLocaleString()}</p>
                                    <Button variant="secondary" onClick={() => setIsAddMoneyOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" /> টাকা যোগ করুন
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>লেনদেনের ইতিহাস</CardTitle>
                                    <CardDescription>আপনার জমা এবং পেমেন্টের রেকর্ড।</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {userTransactions.length > 0 ? userTransactions.map(t => (
                                            <div key={t.id} className="flex items-center justify-between border-b pb-3">
                                                <div>
                                                    <p className="font-medium">{t.notes || (t.type === 'treatment_payment' ? `কেস ${t.case_id} এর জন্য পেমেন্ট` : 'ক্রেডিট জমা')}</p>
                                                    <p className="text-sm text-gray-500">{format(new Date(t.date), 'PPpp')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-bold text-lg ${t.type === 'credit_deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {t.type === 'credit_deposit' ? '+' : '-'} ৳{t.amount.toLocaleString()}
                                                    </p>
                                                    {getTransactionTypeBadge(t.type, t.payment_method)}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <Receipt className="h-12 w-12 mx-auto mb-4" />
                                                <p>এখনও কোনো লেনদেন হয়নি।</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </main>
                </div>

                <Dialog open={isAddMoneyOpen} onOpenChange={setIsAddMoneyOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>ওয়ালেটে টাকা যোগ করুন</DialogTitle>
                            <DialogDescription>আপনার ওয়ালেট ব্যালেন্সে টাকা যোগ করার জন্য একটি পদ্ধতি এবং পরিমাণ নির্বাচন করুন।</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">পরিমাণ (৳)</Label>
                                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="যেমন, ৫০০০" />
                            </div>
                            <div className="space-y-2">
                                <Label>পেমেন্ট পদ্ধতি</Label>
                                <Select value={method} onValueChange={setMethod}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bkash">বিকাশ</SelectItem>
                                        <SelectItem value="bank">ব্যাংক ট্রান্সফার</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="text-center text-sm text-gray-500 p-4 bg-yellow-50 rounded-md">
                                <p>আপনার লেনদেন সম্পূর্ণ করতে আপনাকে একটি সুরক্ষিত পেমেন্ট গেটওয়েতে পুনঃনির্দেশিত করা হবে।</p>
                                <p>(এটি একটি সিমুলেশন)</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">বাতিল</Button></DialogClose>
                            <Button onClick={handleAddMoney}>যোগ করুন ৳{amount || 0}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    };

    export default Wallet;