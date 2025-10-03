import React, { useState, useMemo } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { ArrowLeft, MapPin, Users, Briefcase, User } from 'lucide-react';
    import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

    const AdminAreaAnalytics = () => {
        const navigate = useNavigate();
        const { users, cases } = useData();
        const [selectedLocation, setSelectedLocation] = useState('all');

        const locationData = useMemo(() => {
            const locations = [...new Set(users.filter(u => u.role === 'doctor' && u.chamber_location).map(u => u.chamber_location))];
            
            const dataByLocation = locations.map(location => {
                const doctorsInLocation = users.filter(u => u.role === 'doctor' && u.chamber_location === location);
                const doctorIdsInLocation = doctorsInLocation.map(d => d.id);
                
                const casesInLocation = cases.filter(c => {
                    const assignedDoctors = c.assigned_doctor_ids || [];
                    return assignedDoctors.some(docId => doctorIdsInLocation.includes(docId));
                });

                const patientIdsInLocation = new Set(casesInLocation.map(c => c.patient_id));
                const patientsInLocation = users.filter(u => patientIdsInLocation.has(u.id));

                return {
                    location,
                    doctors: doctorsInLocation.length,
                    patients: patientsInLocation.length,
                    cases: casesInLocation.length,
                };
            });

            return { locations, dataByLocation };
        }, [users, cases]);

        const filteredStats = useMemo(() => {
            if (selectedLocation === 'all') {
                return locationData.dataByLocation.reduce((acc, loc) => ({
                    doctors: acc.doctors + loc.doctors,
                    patients: acc.patients + loc.patients,
                    cases: acc.cases + loc.cases,
                }), { doctors: 0, patients: 0, cases: 0 });
            }
            const locData = locationData.dataByLocation.find(l => l.location === selectedLocation);
            return locData || { doctors: 0, patients: 0, cases: 0 };
        }, [selectedLocation, locationData]);

        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

        const PieChartCard = ({ title, data, dataKey, nameKey }) => (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey={dataKey}
                                nameKey={nameKey}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                    return (
                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                }}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        );

        const statCards = [
            { title: "Doctors", value: filteredStats.doctors, icon: Users },
            { title: "Patients", value: filteredStats.patients, icon: User },
            { title: "Cases", value: filteredStats.cases, icon: Briefcase },
        ];

        return (
            <>
                <Helmet><title>Area Analytics - DentaLink Admin</title></Helmet>
                <div className="min-h-screen bg-gray-50">
                    <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-2 sm:py-0 gap-4">
                                <div className="flex items-center space-x-4">
                                    <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                    <h1 className="text-xl font-bold text-gradient">Area Analytics</h1>
                                </div>
                                <div className="flex items-center space-x-2 w-full sm:w-auto">
                                    <MapPin className="h-5 w-5 text-gray-500" />
                                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                                        <SelectTrigger className="w-full sm:w-[200px]">
                                            <SelectValue placeholder="Select a location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Locations</SelectItem>
                                            {locationData.locations.map(loc => (
                                                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Statistics for {selectedLocation === 'all' ? 'All Locations' : selectedLocation}</CardTitle>
                                    <CardDescription>Key metrics for the selected area.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {statCards.map(stat => (
                                            <div key={stat.title} className="p-4 bg-gray-100 rounded-lg flex items-center space-x-4">
                                                <div className="p-3 bg-primary/10 rounded-full">
                                                    <stat.icon className="h-6 w-6 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">{stat.title}</p>
                                                    <p className="text-2xl font-bold">{stat.value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <PieChartCard title="Doctors by Location" data={locationData.dataByLocation} dataKey="doctors" nameKey="location" />
                                <PieChartCard title="Patients by Location" data={locationData.dataByLocation} dataKey="patients" nameKey="location" />
                                <PieChartCard title="Cases by Location" data={locationData.dataByLocation} dataKey="cases" nameKey="location" />
                            </div>
                        </motion.div>
                    </main>
                </div>
            </>
        );
    };

    export default AdminAreaAnalytics;