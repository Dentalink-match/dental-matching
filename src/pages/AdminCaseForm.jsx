import React, { useState, useEffect, useMemo } from 'react';
    import { useParams, useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { motion } from 'framer-motion';
    import { useData } from '@/contexts/DataContext';
    import { useToast } from '@/components/ui/use-toast';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Checkbox } from '@/components/ui/checkbox';
    import { ArrowLeft, MapPin, Wifi, WifiOff, Eye, Upload, X, Trash2 } from 'lucide-react';
    import { differenceInMinutes } from 'date-fns';
    import ImageLightbox from '@/components/ImageLightbox';
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
      AlertDialogTrigger,
    } from "@/components/ui/alert-dialog";

    const haversineDistance = (coords1, coords2) => {
        if (!coords1 || !coords2 || !coords1.lat || !coords1.lon || !coords2.lat || !coords2.lon) {
            return null;
        }

        const toRad = (x) => (x * Math.PI) / 180;

        const R = 6371; // Earth radius in km
        const dLat = toRad(coords2.lat - coords1.lat);
        const dLon = toRad(coords2.lon - coords1.lon);
        const lat1 = toRad(coords1.lat);
        const lat2 = toRad(coords2.lat);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c; // Distance in km
    };

    const AdminCaseForm = () => {
        const { caseId } = useParams();
        const navigate = useNavigate();
        const { cases, users, saveCase, assignCaseToDoctors, deleteCase, loading } = useData();
        const { toast } = useToast();

        const [caseData, setCaseData] = useState({
            title: '',
            description: '',
            urgency: 'normal',
            status: 'pending_assignment',
            patient_id: '',
            images: [],
            treatmentNeeded: '',
            treatment_start_photo: null,
            treatment_end_photo: null,
        });
        const [newImages, setNewImages] = useState([]);
        const [removedImages, setRemovedImages] = useState([]);
        const [selectedDoctors, setSelectedDoctors] = useState([]);
        const [searchTerm, setSearchTerm] = useState('');
        const [lightboxImage, setLightboxImage] = useState(null);

        const isNewCase = !caseId;

        useEffect(() => {
            if (!isNewCase && cases.length > 0) {
                const existingCase = cases.find(c => c.id === caseId);
                if (existingCase) {
                    setCaseData({
                        ...existingCase,
                        description: existingCase.description || '',
                        patient_id: existingCase.patient_id || '',
                        images: existingCase.images || [],
                        treatment_start_photo: existingCase.treatment_start_photo || null,
                        treatment_end_photo: existingCase.treatment_end_photo || null,
                    });
                    setSelectedDoctors(existingCase.assigned_doctor_ids || []);
                }
            }
        }, [caseId, cases, isNewCase]);

        const patients = useMemo(() => users.filter(u => u.role === 'patient'), [users]);
        const doctors = useMemo(() => users.filter(u => u.role === 'doctor'), [users]);

        const patientLocation = useMemo(() => {
            const patient = users.find(u => u.auth_id === caseData.patient_id);
            if (patient && patient.latitude && patient.longitude) {
                return { lat: patient.latitude, lon: patient.longitude };
            }
            return null;
        }, [caseData.patient_id, users]);

        const filteredDoctors = useMemo(() => {
            return doctors
                .map(doctor => {
                    const doctorLocation = (doctor.latitude && doctor.longitude) ? { lat: doctor.latitude, lon: doctor.longitude } : null;
                    const distance = patientLocation && doctorLocation ? haversineDistance(patientLocation, doctorLocation) : null;
                    const lastActive = doctor.updated_at ? differenceInMinutes(new Date(), new Date(doctor.updated_at)) : Infinity;
                    const isOnline = lastActive <= 15;

                    return { ...doctor, distance, isOnline };
                })
                .filter(doctor =>
                    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (doctor.specialization && doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        }, [doctors, searchTerm, patientLocation]);

        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setCaseData(prev => ({ ...prev, [name]: value }));
        };

        const handleSelectChange = (name, value) => {
            setCaseData(prev => ({ ...prev, [name]: value }));
        };

        const handleImageUpload = (e) => {
            setNewImages(prev => [...prev, ...Array.from(e.target.files)]);
        };

        const removeNewImage = (index) => {
            setNewImages(prev => prev.filter((_, i) => i !== index));
        };

        const removeExistingImage = (url) => {
            setCaseData(prev => ({ ...prev, images: prev.images.filter(imgUrl => imgUrl !== url) }));
            setRemovedImages(prev => [...prev, url]);
        };

        const handleDoctorSelect = (doctorId) => {
            setSelectedDoctors(prev =>
                prev.includes(doctorId)
                    ? prev.filter(id => id !== doctorId)
                    : [...prev, doctorId]
            );
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!caseData.patient_id) {
                toast({ title: "Error", description: "Please select a patient.", variant: "destructive" });
                return;
            }

            try {
                const patient = patients.find(p => p.auth_id === caseData.patient_id);
                const dataToSave = {
                    ...caseData,
                    patient_name: patient?.name,
                    newImages: newImages,
                    removedImages: removedImages,
                };

                if (isNewCase) {
                    dataToSave.patient_id = caseData.patient_id;
                }

                const savedCase = await saveCase(dataToSave);

                if (savedCase && savedCase.id && selectedDoctors.length > 0) {
                    await assignCaseToDoctors(savedCase.id, selectedDoctors);
                }

                toast({ title: "Success", description: `Case ${isNewCase ? 'created' : 'updated'} successfully.` });
                navigate('/admin/dashboard');
            } catch (error) {
                toast({ title: "Error", description: `Failed to save case: ${error.message}`, variant: "destructive" });
            }
        };

        const handleDeleteCase = async () => {
            try {
                await deleteCase(caseId);
                toast({ title: "Success", description: "Case deleted successfully." });
                navigate('/admin/dashboard');
            } catch (error) {
                toast({ title: "Error", description: `Failed to delete case: ${error.message}`, variant: "destructive" });
            }
        };

        if (loading && !isNewCase) {
            return <div>Loading case details...</div>;
        }

        return (
            <>
                <Helmet>
                    <title>{isNewCase ? 'Create New Case' : 'Edit Case'} - DentaLink Admin</title>
                </Helmet>
                <div className="min-h-screen bg-gray-50">
                    <header className="bg-white shadow-sm">
                        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <h1 className="text-2xl font-bold text-gray-900">{isNewCase ? 'Create New Case' : 'Edit Case'}</h1>
                            </div>
                            {!isNewCase && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete this case and all associated data.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteCase}>
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </header>
                    <main>
                        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                            <motion.form
                                onSubmit={handleSubmit}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="space-y-8"
                            >
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Case Information</CardTitle>
                                        <CardDescription>Fill in the details for the dental case.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Case Title</Label>
                                            <Input id="title" name="title" value={caseData.title} onChange={handleInputChange} placeholder="e.g., Emergency Root Canal" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="patient_id">Patient</Label>
                                            <Select name="patient_id" onValueChange={(value) => handleSelectChange('patient_id', value)} value={caseData.patient_id} required>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a patient" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {patients.map(p => <SelectItem key={p.auth_id} value={p.auth_id}>{p.name} ({p.email})</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="description">Description / Symptoms</Label>
                                            <Textarea id="description" name="description" value={caseData.description} onChange={handleInputChange} placeholder="Describe the patient's symptoms and condition." required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="urgency">Urgency</Label>
                                            <Select name="urgency" onValueChange={(value) => handleSelectChange('urgency', value)} value={caseData.urgency}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select urgency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="normal">Normal</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="immediate">Immediate</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="status">Status</Label>
                                            <Select name="status" onValueChange={(value) => handleSelectChange('status', value)} value={caseData.status}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending_assignment">Pending Assignment</SelectItem>
                                                    <SelectItem value="open">Open for Proposals</SelectItem>
                                                    <SelectItem value="proposal_accepted">Proposal Accepted</SelectItem>
                                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                                    <SelectItem value="treatment_started">Treatment Started</SelectItem>
                                                    <SelectItem value="completed">Completed</SelectItem>
                                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="md:col-span-2 space-y-4">
                                            <Label>Attachments</Label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {caseData.images && caseData.images.map((url, index) => (
                                                    <div key={`existing-${index}`} className="relative group">
                                                        <img src={url} alt={`Attachment ${index + 1}`} className="h-24 w-full object-cover rounded-lg border" />
                                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Eye className="h-6 w-6 text-white cursor-pointer" onClick={() => setLightboxImage(url)} />
                                                        </div>
                                                        <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeExistingImage(url)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {newImages.map((file, index) => (
                                                    <div key={`new-${index}`} className="relative group">
                                                        <img src={URL.createObjectURL(file)} alt={`New attachment ${index + 1}`} className="h-24 w-full object-cover rounded-lg border" />
                                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setLightboxImage(URL.createObjectURL(file))}>
                                                            <Eye className="h-6 w-6 text-white" />
                                                        </div>
                                                        <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeNewImage(index)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Label htmlFor="image-upload" className="flex flex-col items-center justify-center h-24 w-full border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100">
                                                    <Upload className="h-8 w-8 text-gray-400" />
                                                    <span className="text-sm text-gray-500">Upload</span>
                                                </Label>
                                                <Input id="image-upload" type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                                            </div>
                                            {caseData.images?.length === 0 && newImages.length === 0 && <p className="text-sm text-gray-500">No attachments for this case.</p>}
                                        </div>
                                        {(caseData.treatment_start_photo || caseData.treatment_end_photo) && (
                                            <div className="md:col-span-2 space-y-2">
                                                <Label>Treatment Photos</Label>
                                                <div className="flex flex-wrap gap-4">
                                                    {caseData.treatment_start_photo && (
                                                        <div>
                                                            <p className="text-xs text-center mb-1 font-medium">Start</p>
                                                            <img src={caseData.treatment_start_photo} alt="Treatment Start" className="h-24 w-24 object-cover rounded-lg border cursor-pointer" onClick={() => setLightboxImage(caseData.treatment_start_photo)} />
                                                        </div>
                                                    )}
                                                    {caseData.treatment_end_photo && (
                                                        <div>
                                                            <p className="text-xs text-center mb-1 font-medium">End</p>
                                                            <img src={caseData.treatment_end_photo} alt="Treatment End" className="h-24 w-24 object-cover rounded-lg border cursor-pointer" onClick={() => setLightboxImage(caseData.treatment_end_photo)} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Assign Doctors</CardTitle>
                                        <CardDescription>Select doctors to send this case to. Doctors are sorted by distance.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="mb-4">
                                            <Input
                                                placeholder="Search doctors by name or specialty..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                                            {filteredDoctors.map(doctor => (
                                                <div key={doctor.auth_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                                    <div className="flex items-center space-x-4">
                                                        <Checkbox
                                                            id={`doc-${doctor.auth_id}`}
                                                            checked={selectedDoctors.includes(doctor.auth_id)}
                                                            onCheckedChange={() => handleDoctorSelect(doctor.auth_id)}
                                                        />
                                                        <div>
                                                            <Label htmlFor={`doc-${doctor.auth_id}`} className="font-semibold">{doctor.name}</Label>
                                                            <p className="text-sm text-gray-500">{doctor.specialization || 'General Dentistry'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-4 text-sm">
                                                        <div className="flex items-center text-gray-600">
                                                            {doctor.isOnline ? <Wifi className="h-4 w-4 mr-1 text-green-500" /> : <WifiOff className="h-4 w-4 mr-1 text-red-500" />}
                                                            {doctor.isOnline ? 'Online' : 'Offline'}
                                                        </div>
                                                        <div className="flex items-center text-gray-600">
                                                            <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                                                            {doctor.distance !== null ? `${doctor.distance.toFixed(1)} km` : 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-end space-x-4">
                                    <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? 'Saving...' : (isNewCase ? 'Create and Assign Case' : 'Update Case')}
                                    </Button>
                                </div>
                            </motion.form>
                        </div>
                    </main>
                </div>
                <ImageLightbox imageUrl={lightboxImage} onOpenChange={setLightboxImage} />
            </>
        );
    };

    export default AdminCaseForm;
