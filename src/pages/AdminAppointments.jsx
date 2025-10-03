import React, { useState, useMemo } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Input } from '@/components/ui/input';
    import { Badge } from '@/components/ui/badge';
    import { ArrowLeft, Search, Calendar, User, Stethoscope } from 'lucide-react';
    import { format } from 'date-fns';

    const AdminAppointments = () => {
        const navigate = useNavigate();
        const { appointments, users } = useData();
        const [searchTerm, setSearchTerm] = useState('');

        const filteredAppointments = useMemo(() => {
            const lowercasedFilter = searchTerm.toLowerCase();
            return appointments.filter(a => {
                const patient = users.find(u => u.id === a.patient_id);
                const doctor = users.find(u => u.id === a.doctor_id);
                return (
                    a.case_id?.toLowerCase().includes(lowercasedFilter) ||
                    patient?.name.toLowerCase().includes(lowercasedFilter) ||
                    doctor?.name.toLowerCase().includes(lowercasedFilter)
                );
            }).sort((a, b) => new Date(b.appointment_time) - new Date(a.appointment_time));
        }, [appointments, users, searchTerm]);

        const getStatusBadge = (status) => {
            switch (status) {
                case 'scheduled': return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
                case 'completed': return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
                case 'cancelled': return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
                default: return <Badge variant="outline">{status}</Badge>;
            }
        };

        return (
            <>
                <Helmet><title>Appointment Management - DentaLink Admin</title></Helmet>
                <div className="min-h-screen bg-gray-50">
                    <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-16">
                                <div className="flex items-center space-x-4">
                                    <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                    <h1 className="text-xl font-bold text-gradient">Appointment Management</h1>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>All Appointments</CardTitle>
                                    <CardDescription>View and search all scheduled appointments across the platform.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative mb-6">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                        <Input
                                            placeholder="Search by Case ID, Patient, or Doctor..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 w-full"
                                        />
                                    </div>
                                    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                                        {filteredAppointments.length > 0 ? filteredAppointments.map(appointment => {
                                            const patient = users.find(u => u.id === appointment.patient_id);
                                            const doctor = users.find(u => u.id === appointment.doctor_id);
                                            return (
                                                <div key={appointment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                                        <div className="md:col-span-2 space-y-2">
                                                            <p className="font-semibold text-primary">Case ID: {appointment.case_id}</p>
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <User className="h-4 w-4 mr-2" />
                                                                Patient: {patient?.name || 'N/A'}
                                                            </div>
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Stethoscope className="h-4 w-4 mr-2" />
                                                                Doctor: {doctor?.name || 'N/A'}
                                                            </div>
                                                        </div>
                                                        <div className="text-left md:text-right space-y-2">
                                                            <div className="flex items-center justify-start md:justify-end text-sm font-semibold">
                                                                <Calendar className="h-4 w-4 mr-2" />
                                                                {format(new Date(appointment.appointment_time), 'PPp')}
                                                            </div>
                                                            {getStatusBadge(appointment.status)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div className="text-center py-16">
                                                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                                <p className="text-gray-500">No appointments found.</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </main>
                </div>
            </>
        );
    };

    export default AdminAppointments;