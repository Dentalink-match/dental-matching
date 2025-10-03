import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, DollarSign, Users2, FileText, Plus, Edit, Trash2, Download, Calendar, Banknote } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const AdminPayroll = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [payrolls, setPayrolls] = useState([]);
    const [salaryStructures, setSalaryStructures] = useState([]);
    const [isStructureFormOpen, setIsStructureFormOpen] = useState(false);
    const [editingStructure, setEditingStructure] = useState(null);
    const [structureFormData, setStructureFormData] = useState({
        employee_id: '', basic_salary: '', house_rent_percentage: 0, medical_allowance: 0
    });

    const fetchData = async () => {
        const { data: empData, error: empError } = await supabase.from('employees').select('*');
        if (empError) toast({ title: "Error fetching employees", variant: "destructive" });
        else setEmployees(empData);

        const { data: payrollData, error: payrollError } = await supabase.from('payrolls').select('*').order('pay_period_start', { ascending: false });
        if (payrollError) toast({ title: "Error fetching payrolls", variant: "destructive" });
        else setPayrolls(payrollData);

        const { data: structureData, error: structureError } = await supabase.from('salary_structures').select('*');
        if (structureError) toast({ title: "Error fetching salary structures", variant: "destructive" });
        else setSalaryStructures(structureData);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenStructureForm = (structure = null) => {
        if (structure) {
            setEditingStructure(structure);
            setStructureFormData({
                employee_id: structure.employee_id,
                basic_salary: structure.basic_salary,
                house_rent_percentage: structure.house_rent_percentage || 0,
                medical_allowance: structure.medical_allowance || 0,
            });
        } else {
            setEditingStructure(null);
            setStructureFormData({ employee_id: '', basic_salary: '', house_rent_percentage: 0, medical_allowance: 0 });
        }
        setIsStructureFormOpen(true);
    };

    const handleStructureSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...structureFormData,
            basic_salary: parseFloat(structureFormData.basic_salary),
            house_rent_percentage: parseFloat(structureFormData.house_rent_percentage),
            medical_allowance: parseFloat(structureFormData.medical_allowance),
        };

        const { error } = editingStructure
            ? await supabase.from('salary_structures').update(payload).eq('id', editingStructure.id)
            : await supabase.from('salary_structures').upsert(payload, { onConflict: 'employee_id' });

        if (error) {
            toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Salary Structure Saved" });
            setIsStructureFormOpen(false);
            fetchData();
        }
    };

    const handleProcessPayroll = async () => {
        const payPeriodStart = startOfMonth(new Date());
        const payPeriodEnd = endOfMonth(new Date());

        const { data: existingPayrolls } = await supabase.from('payrolls').select('employee_id').eq('pay_period_start', format(payPeriodStart, 'yyyy-MM-dd'));
        const processedEmployeeIds = existingPayrolls.map(p => p.employee_id);

        let processedCount = 0;
        for (const emp of employees) {
            if (processedEmployeeIds.includes(emp.id)) continue;

            const structure = salaryStructures.find(s => s.employee_id === emp.id);
            if (!structure) continue;

            const basic = structure.basic_salary;
            const houseRent = basic * (structure.house_rent_percentage / 100);
            const medical = structure.medical_allowance;
            const gross = basic + houseRent + medical;
            const net = gross; // Deductions logic to be added here

            const payrollData = {
                employee_id: emp.id,
                pay_period_start: format(payPeriodStart, 'yyyy-MM-dd'),
                pay_period_end: format(payPeriodEnd, 'yyyy-MM-dd'),
                basic_salary: basic,
                house_rent: houseRent,
                medical_allowance: medical,
                gross_salary: gross,
                net_salary: net,
                status: 'processed',
                details: { allowances: { house_rent: houseRent, medical: medical }, deductions: {} }
            };
            
            await supabase.from('payrolls').insert(payrollData);
            processedCount++;
        }
        toast({ title: "Payroll Processed", description: `${processedCount} new salaries for the current month have been calculated.` });
        fetchData();
    };
    
    const stats = useMemo(() => {
        const currentMonthStart = startOfMonth(new Date());
        const currentMonthPayrolls = payrolls.filter(p => new Date(p.pay_period_start).getTime() === currentMonthStart.getTime());
        return {
            totalNetSalary: currentMonthPayrolls.reduce((acc, p) => acc + p.net_salary, 0),
            employeesPaid: currentMonthPayrolls.length,
            totalStructures: salaryStructures.length,
        };
    }, [payrolls, salaryStructures]);

    return (
        <>
            <Helmet><title>Payroll Management - DentaLink Admin</title></Helmet>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center space-x-4">
                                <Button variant="outline" size="icon" onClick={() => navigate('/admin/hr')}><ArrowLeft className="h-4 w-4" /></Button>
                                <h1 className="text-xl font-bold text-gradient flex items-center"><DollarSign className="mr-2"/>Payroll Management</h1>
                            </div>
                            <Button onClick={handleProcessPayroll}><Calendar className="h-4 w-4 mr-2"/>Process Current Month's Payroll</Button>
                        </div>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Net Salary (This Month)</CardTitle><Banknote className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">৳{stats.totalNetSalary.toLocaleString()}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Employees Paid (This Month)</CardTitle><Users2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.employeesPaid}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Salary Structures Defined</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalStructures}</div></CardContent></Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>Salary Structures</CardTitle>
                                            <CardDescription>Define salary components for each employee.</CardDescription>
                                        </div>
                                        <Button onClick={() => handleOpenStructureForm()}><Plus className="h-4 w-4 mr-2" />Add</Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                                        {salaryStructures.map(s => {
                                            const emp = employees.find(e => e.id === s.employee_id);
                                            return (
                                                <div key={s.id} className="border p-3 rounded-md flex justify-between items-center hover:bg-gray-50">
                                                    <div>
                                                        <p className="font-semibold text-primary">{emp?.name || 'Unknown Employee'}</p>
                                                        <p className="text-sm text-gray-500">Basic: ৳{s.basic_salary.toLocaleString()}</p>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenStructureForm(s)}><Edit className="h-4 w-4" /></Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Payroll History</CardTitle>
                                    <CardDescription>View processed payrolls and download payslips.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                                        {payrolls.map(p => {
                                            const emp = employees.find(e => e.id === p.employee_id);
                                            return (
                                                <div key={p.id} className="border p-3 rounded-md flex justify-between items-center hover:bg-gray-50">
                                                    <div>
                                                        <p className="font-semibold">{emp?.name || 'Unknown Employee'}</p>
                                                        <p className="text-sm text-gray-500">Period: <Badge variant="secondary">{format(new Date(p.pay_period_start), 'MMM yyyy')}</Badge></p>
                                                        <p className="text-sm font-bold mt-1">Net Salary: ৳{p.net_salary.toLocaleString()}</p>
                                                    </div>
                                                    <Button variant="outline" size="sm" onClick={() => toast({title: "Feature not implemented yet."})}><Download className="h-4 w-4 mr-2" />Payslip</Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                </main>
            </div>

            <Dialog open={isStructureFormOpen} onOpenChange={setIsStructureFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingStructure ? 'Edit' : 'Add'} Salary Structure</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleStructureSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Employee</Label>
                            <Select value={structureFormData.employee_id} onValueChange={(val) => setStructureFormData(prev => ({ ...prev, employee_id: val }))} required disabled={!!editingStructure}>
                                <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="basic_salary">Basic Salary (৳)</Label>
                            <Input id="basic_salary" type="number" value={structureFormData.basic_salary} onChange={(e) => setStructureFormData(prev => ({ ...prev, basic_salary: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="house_rent_percentage">House Rent (% of Basic)</Label>
                            <Input id="house_rent_percentage" type="number" value={structureFormData.house_rent_percentage} onChange={(e) => setStructureFormData(prev => ({ ...prev, house_rent_percentage: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="medical_allowance">Medical Allowance (Fixed Amount ৳)</Label>
                            <Input id="medical_allowance" type="number" value={structureFormData.medical_allowance} onChange={(e) => setStructureFormData(prev => ({ ...prev, medical_allowance: e.target.value }))} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit">Save Structure</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AdminPayroll;