import React from 'react';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { Banknote, Plus, Minus, Undo2, Coins } from 'lucide-react';

    const getTransactionTypeBadge = (type) => {
        switch (type) {
            case 'payout': return <Badge className="bg-green-100 text-green-800 flex items-center"><Banknote className="h-3 w-3 mr-1"/>Payout</Badge>;
            case 'adjustment_bonus': return <Badge className="bg-blue-100 text-blue-800 flex items-center"><Plus className="h-3 w-3 mr-1"/>Bonus</Badge>;
            case 'adjustment_deduction': return <Badge className="bg-yellow-100 text-yellow-800 flex items-center"><Minus className="h-3 w-3 mr-1"/>Deduction</Badge>;
            case 'refund': return <Badge className="bg-red-100 text-red-800 flex items-center"><Undo2 className="h-3 w-3 mr-1"/>Refund</Badge>;
            case 'commission_payment': return <Badge className="bg-purple-100 text-purple-800 flex items-center"><Coins className="h-3 w-3 mr-1"/>Commission</Badge>;
            default: return <Badge>{type}</Badge>;
        }
    };

    const FinancialBreakdown = ({ doctorData, transactions }) => {
        if (!doctorData) return null;

        const doctorTransactions = transactions.filter(t => t.doctor_id === doctorData.id);

        return (
            <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Online Payment Earnings</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex justify-between"><span>Gross Revenue:</span> <span>৳{doctorData.grossRevenue.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Platform Commission:</span> <span className="text-red-600">- ৳{(doctorData.commission - doctorData.commissionFromCash).toLocaleString()}</span></div>
                            <div className="border-t my-2"></div>
                            <div className="flex justify-between font-semibold"><span>Net Income:</span> <span>৳{doctorData.netIncome.toLocaleString()}</span></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Payout Status</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex justify-between"><span>Net Income:</span> <span>৳{doctorData.netIncome.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Total Paid Out:</span> <span className="text-green-600">- ৳{doctorData.totalPaid.toLocaleString()}</span></div>
                            <div className="border-t my-2"></div>
                            <div className="flex justify-between font-semibold"><span>Pending Payout:</span> <span className="text-orange-600">৳{doctorData.pendingBalance.toLocaleString()}</span></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Cash Payment Commission</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex justify-between"><span>Commission from Cash:</span> <span>৳{doctorData.commissionFromCash.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Commission Paid:</span> <span className="text-green-600">- ৳{doctorData.commissionPaidByDoctor.toLocaleString()}</span></div>
                            <div className="border-t my-2"></div>
                            <div className="flex justify-between font-semibold"><span>Commission Due:</span> <span className="text-red-600">৳{doctorData.commissionDue.toLocaleString()}</span></div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto">
                        <div className="space-y-3">
                            {doctorTransactions.length > 0 ? [...doctorTransactions].reverse().map(t => (
                                <div key={t.id} className="flex items-center justify-between border-b pb-2">
                                    <div>
                                        {getTransactionTypeBadge(t.type)}
                                        <p className="text-xs text-gray-500 mt-1">{new Date(t.date).toLocaleString()}</p>
                                        {t.notes && <p className="text-xs text-gray-400 italic">"{t.notes}"</p>}
                                    </div>
                                    <p className="font-semibold">৳{t.amount.toLocaleString()}</p>
                                </div>
                            )) : <p className="text-center text-gray-500 py-4">No transactions found for this doctor.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    export default FinancialBreakdown;