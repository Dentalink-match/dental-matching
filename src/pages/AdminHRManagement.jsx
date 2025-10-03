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
import { ArrowLeft, UserPlus, Users2, Edit, Trash2, Search, DollarSign, Briefcase, Building } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const AdminHRManagement = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', dob: '', address: '', designation: '', department: '', joining_date: '', status: 'active'
    });

    const fetchEmployees = async () => {
        const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
        if (error) {
            toast({ title: "Error fetching employees", description: error.message, variant: "destructive" });
        } else {
            setEmployees(data);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleOpenForm = (employee = null) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                name: employee.name,
                email: employee.email,
                phone: employee.phone || '',
                dob: employee.dob ? format(new Date(employee.dob), 'yyyy-MM-dd') : '',
                address: employee.address || '',
                designation: employee.designation || '',
                department: employee.department || '',
                joining_date: employee.joining_date ? format(new Date(employee.joining_date), 'yyyy-MM-dd') : '',
                status: employee.status || 'active'
            });
        } else {
            setEditingEmployee(null);
            setFormData({
                name: '', email: '', phone: '', dob: '', address: '', designation: '', department: '', joining_date: '', status: 'active'
            });
        }
        setIsFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { data, error } = editingEmployee
            ? await supabase.from('employees').update(formData).eq('id', editingEmployee.id)
            : await supabase.from('employees').insert(formData);

        if (error) {
            toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
        } else {
            toast({ title: `Employee ${editingEmployee ? 'Updated' : 'Added'}`, description: `${formData.name} has been successfully saved.` });
            setIsFormOpen(false);
            fetchEmployees();
        }
    };

    const handleDelete = async (employeeId) => {
        const { error } = await supabase.from('employees').delete().eq('id', employeeId);
        if (error) {
            toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Employee Deleted", description: "The employee has been removed." });
            fetchEmployees();
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = useMemo(() => ({
        total: employees.length,
        active: employees.filter(e => e.status === 'active').length,
        departments: [...new Set(employees.map(e => e.department).filter(Boolean))].length,
    }), [employees]);

    return (
        <>
            <Helmet><title>HR Management - DentaLink Admin</title></Helmet>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center space-x-4">
                                <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                <h1 className="text-xl font-bold text-gradient flex items-center"><Users2 className="mr-2"/>HR Management</h1>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button onClick={() => navigate('/admin/payroll')}><DollarSign className="h-4 w-4 mr-2" />Payroll</Button>
                                <Button onClick={() => handleOpenForm()}><UserPlus className="h-4 w-4 mr-2" />Add Employee</Button>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Employees</CardTitle><Users2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active Employees</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.active}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Departments</CardTitle><Building className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.departments}</div></CardContent></Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Employee Database</CardTitle>
                                <CardDescription>Manage all employee information from one place.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Search by name, email, or designation..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 w-full"
                                    />
                                </div>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                    {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                                        <div key={emp.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <p className="font-semibold text-lg text-primary">{emp.name}</p>
                                                        <Badge variant={emp.status === 'active' ? 'default' : 'destructive'}>{emp.status}</Badge>
                                                    </div>
                                                    <div className="text-sm text-gray-600 space-y-1">
                                                        <p><Briefcase className="inline h-4 w-4 mr-2 text-gray-400"/>{emp.designation} - {emp.department}</p>
                                                        <p>{emp.email}</p>
                                                        <p>Joined: {emp.joining_date ? format(new Date(emp.joining_date), 'PP') : 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2 flex-shrink-0">
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenForm(emp)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(emp.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-16">
                                            <Users2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-500">No employees found. Add one to get started.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </main>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                        <DialogDescription>Fill in the details for the employee.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => handleFormChange('email', e.target.value)} required /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={formData.phone} onChange={(e) => handleFormChange('phone', e.target.value)} /></div>
                            <div className="space-y-2"><Label htmlFor="dob">Date of Birth</Label><Input id="dob" type="date" value={formData.dob} onChange={(e) => handleFormChange('dob', e.target.value)} /></div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="address">Address</Label><Textarea id="address" value={formData.address} onChange={(e) => handleFormChange('address', e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="designation">Designation</Label><Input id="designation" value={formData.designation} onChange={(e) => handleFormChange('designation', e.target.value)} /></div>
                            <div className="space-y-2"><Label htmlFor="department">Department</Label><Input id="department" value={formData.department} onChange={(e) => handleFormChange('department', e.target.value)} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="joining_date">Joining Date</Label><Input id="joining_date" type="date" value={formData.joining_date} onChange={(e) => handleFormChange('joining_date', e.target.value)} /></div>
                            <div className="space-y-2"><Label htmlFor="status">Status</Label>
                                <select id="status" value={formData.status} onChange={(e) => handleFormChange('status', e.target.value)} className="w-full p-2 border rounded-md">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="on_leave">On Leave</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit">{editingEmployee ? 'Save Changes' : 'Add Employee'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AdminHRManagement;