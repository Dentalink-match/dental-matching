import React, { useState, useEffect, useMemo } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate, useParams } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { toast } from '@/components/ui/use-toast';
    import { 
      ArrowLeft, 
      Star, 
      MapPin, 
      Clock, 
      DollarSign, 
      GraduationCap, 
      Briefcase,
      CheckCircle,
      MessageSquare,
      GitCompare,
      AirVent, Sparkles, UserCheck, Scan, Cpu, Phone, Mail, Calendar, Wifi, WifiOff
    } from 'lucide-react';
    import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
    import { Calendar as CalendarComponent } from "@/components/ui/calendar";
    import { format, setHours, setMinutes, getDay, startOfDay, addMinutes, parseISO, differenceInMinutes } from 'date-fns';

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

    const ProposalView = () => {
      const navigate = useNavigate();
      const { caseId } = useParams();
      const { user } = useAuth();
      const { cases, proposals, chooseProposal, users, appointments, bookAppointment } = useData();
      
      const [caseDetails, setCaseDetails] = useState(null);
      const [caseProposals, setCaseProposals] = useState([]);
      const [isBookingOpen, setIsBookingOpen] = useState(false);
      const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null);
      const [selectedDate, setSelectedDate] = useState(new Date());
      const [selectedTime, setSelectedTime] = useState(null);
      const [availableSlots, setAvailableSlots] = useState([]);
      const [hasAppointment, setHasAppointment] = useState(false);

      const patientLocation = useMemo(() => {
        const patient = users.find(u => u.id === caseDetails?.patient_id);
        if (patient && patient.latitude && patient.longitude) {
            return { lat: patient.latitude, lon: patient.longitude };
        }
        return null;
      }, [caseDetails, users]);

      useEffect(() => {
        if (caseId) {
          const currentCase = cases.find(c => c.id === caseId);
          setCaseDetails(currentCase);

          const relevantProposals = proposals.filter(p => p.case_id === caseId).map(p => {
            const doctor = users.find(u => u.id === p.doctor_id);
            if (!doctor) return null;

            const doctorLocation = (doctor.latitude && doctor.longitude) ? { lat: doctor.latitude, lon: doctor.longitude } : null;
            const distance = patientLocation && doctorLocation ? haversineDistance(patientLocation, doctorLocation) : null;
            const lastActive = doctor.updated_at ? differenceInMinutes(new Date(), new Date(doctor.updated_at)) : Infinity;
            const isOnline = lastActive <= 15;

            return { ...p, doctor: { ...doctor, distance, isOnline } };
          }).filter(Boolean);
          setCaseProposals(relevantProposals);

          const existingAppointment = appointments.find(a => a.case_id === caseId);
          setHasAppointment(!!existingAppointment);
        }
      }, [caseId, cases, proposals, users, appointments, patientLocation]);

      const smartMatches = useMemo(() => {
        if (!caseDetails || !caseProposals.length) return [];
        
        return caseProposals
            .sort((a, b) => (b.doctor.rating || 0) - (a.doctor.rating || 0))
            .slice(0, 3)
            .map(p => ({
                ...p.doctor,
                matchScore: Math.round(80 + (p.doctor.rating || 3.5) * 4)
            }));
      }, [caseDetails, caseProposals]);

      const handleChooseDoctor = async (proposal) => {
        try {
          await chooseProposal(caseId, proposal.id);
          toast({
            title: "ডাক্তার নির্বাচিত!",
            description: `আপনি Dr. ${proposal.doctor_name}-কে নির্বাচন করেছেন। অনুগ্রহ করে একটি অ্যাপয়েন্টমেন্ট বুক করুন।`,
          });
          openBookingModal(proposal.doctor);
        } catch (error) {
          toast({
            title: "নির্বাচন ব্যর্থ",
            description: error.message,
            variant: "destructive",
          });
        }
      };

      const openBookingModal = (doctor) => {
        setSelectedDoctorForBooking(doctor);
        setSelectedDate(new Date());
        setIsBookingOpen(true);
      };

      const generateTimeSlots = (doctor, date) => {
        if (!doctor?.availability) return [];
        
        const { startTime, endTime, slotDuration, days } = doctor.availability;
        const dayOfWeek = getDay(date);
    
        if (!days[dayOfWeek]) return [];
    
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
    
        const slots = [];
        let currentTime = setMinutes(setHours(startOfDay(date), startHour), startMinute);
        const endTimeDate = setMinutes(setHours(startOfDay(date), endHour), endMinute);
    
        const doctorAppointments = appointments.filter(a => a.doctor_id === doctor.id);
    
        while (currentTime < endTimeDate) {
          const slotTime = new Date(currentTime);
          const isBooked = doctorAppointments.some(a => parseISO(a.appointment_time).getTime() === slotTime.getTime());
          
          if (slotTime > new Date()) {
            slots.push({ time: slotTime, isBooked });
          }
          currentTime = addMinutes(currentTime, slotDuration);
        }
        return slots;
      };

      useEffect(() => {
        if (selectedDoctorForBooking && selectedDate) {
          const slots = generateTimeSlots(selectedDoctorForBooking, selectedDate);
          setAvailableSlots(slots);
          setSelectedTime(null);
        }
      }, [selectedDoctorForBooking, selectedDate, appointments]);

      const handleBookAppointment = async () => {
        if (!selectedTime) {
          toast({ title: "ত্রুটি", description: "অনুগ্রহ করে একটি সময় স্লট নির্বাচন করুন।", variant: "destructive" });
          return;
        }
    
        try {
          await bookAppointment({
            case_id: caseId,
            patient_id: user.id,
            doctor_id: selectedDoctorForBooking.id,
            appointment_time: selectedTime.toISOString(),
          });
          toast({ title: "সফল", description: `Dr. ${selectedDoctorForBooking.name}-এর সাথে অ্যাপয়েন্টমেন্ট বুক করা হয়েছে!` });
          setIsBookingOpen(false);
          setSelectedTime(null);
          navigate('/patient/dashboard');
        } catch (error) {
          toast({ title: "বুকিং ব্যর্থ", description: error.message, variant: "destructive" });
        }
      };

      if (!user) {
        navigate('/login');
        return null;
      }

      if (!caseDetails) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <p>কেসের বিবরণ লোড হচ্ছে...</p>
          </div>
        );
      }

      const Amenity = ({ icon: Icon, label, isAvailable }) => {
        if (!isAvailable) return null;
        return (
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">{label}</span>
          </div>
        );
      };

      return (
        <>
          <Helmet>
            <title>"{caseDetails.title}"-এর জন্য প্রস্তাব দেখুন - ডেন্টালিন্ক</title>
            <meta name="description" content={`আপনার ডেন্টাল কেসের জন্য প্রস্তাব পর্যালোচনা এবং তুলনা করুন: ${caseDetails.title}.`} />
          </Helmet>

          <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
              >
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gradient">"{caseDetails.title}"-এর জন্য প্রস্তাব</h1>
                  <p className="text-gray-600">শীর্ষস্থানীয় ডেন্টাল পেশাদারদের কাছ থেকে প্রস্তাব পর্যালোচনা করুন</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/patient/dashboard')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  ড্যাশবোর্ডে ফিরে যান
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-8"
              >
                <Card className="gradient-bg text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="h-6 w-6 text-yellow-300" />
                      <span>শীর্ষ ৩ স্মার্ট ম্যাচ</span>
                    </CardTitle>
                    <CardDescription className="text-teal-100">
                      আমাদের AI আপনার কেসের প্রয়োজনীয়তার উপর ভিত্তি করে এই ডাক্তারদের সুপারিশ করছে
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {smartMatches.length > 0 ? (
                      <div className="grid md:grid-cols-3 gap-4">
                        {smartMatches.map((match, index) => (
                          <div key={index} className="glass-effect p-4 rounded-lg">
                            <div className="flex items-center space-x-3 mb-3">
                              <Avatar>
                                <AvatarImage src={match.avatar} />
                                <AvatarFallback>{match.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold">Dr. {match.name}</h3>
                                <p className="text-sm text-teal-200">{match.specialization}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <Badge variant="secondary">ম্যাচ স্কোর: {match.matchScore}%</Badge>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-300" />
                                <span>{match.rating}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-teal-100">এখনও কোনো স্মার্ট ম্যাচ উপলব্ধ নেই। শীঘ্রই আবার দেখুন!</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">সমস্ত প্রস্তাব ({caseProposals.length})</h2>
                  {caseProposals.length > 1 && (
                    <Button onClick={() => navigate(`/patient/compare/${caseId}`)}>
                      <GitCompare className="h-4 w-4 mr-2" />
                      ডাক্তারদের তুলনা করুন
                    </Button>
                  )}
                </div>

                {caseProposals.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-16">
                      <p className="text-gray-500">এখনও কোনো প্রস্তাব পাওয়া যায়নি। অনুগ্রহ করে পরে আবার দেখুন।</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {caseProposals.map((proposal, index) => (
                      <motion.div
                        key={proposal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <Card className={`card-hover ${caseDetails.chosen_proposal_id === proposal.id ? 'border-green-500 border-2' : ''}`}>
                          <CardHeader>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-16 w-16">
                                  <AvatarImage src={proposal.doctor?.avatar} />
                                  <AvatarFallback>{proposal.doctor_name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <CardTitle>Dr. {proposal.doctor_name}</CardTitle>
                                  <CardDescription>{proposal.doctor?.specialization}</CardDescription>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                                    <span className="flex items-center"><Star className="h-4 w-4 mr-1 text-yellow-500" /> {proposal.doctor?.rating || 'N/A'}</span>
                                    <span className="flex items-center"><Briefcase className="h-4 w-4 mr-1" /> {proposal.doctor?.experience || 'N/A'} বছর</span>
                                    <span className="flex items-center">
                                      <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                                      {proposal.doctor?.distance !== null ? `${proposal.doctor.distance.toFixed(1)} কিমি` : 'N/A'}
                                    </span>
                                    <span className="flex items-center">
                                      {proposal.doctor?.isOnline ? <Wifi className="h-4 w-4 mr-1 text-green-500" /> : <WifiOff className="h-4 w-4 mr-1 text-red-500" />}
                                      {proposal.doctor?.isOnline ? 'অনলাইন' : 'অফলাইন'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right self-start sm:self-center">
                                <p className="text-2xl font-bold text-primary">৳{proposal.cost.toLocaleString()}</p>
                                <p className="text-sm text-gray-500">আনুমানিক খরচ</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-3 gap-6">
                              <div className="md:col-span-2 space-y-4">
                                 <div>
                                    <h4 className="font-semibold mb-2">প্রস্তাবিত চিকিৎসা পরিকল্পনা</h4>
                                    <p className="text-gray-600 bg-gray-50 p-3 rounded-md">{proposal.details}</p>
                                 </div>
                                 {proposal.notes && (
                                   <div>
                                    <h4 className="font-semibold mb-2">অতিরিক্ত নোট</h4>
                                    <p className="text-gray-600 bg-gray-50 p-3 rounded-md">{proposal.notes}</p>
                                   </div>
                                 )}
                              </div>
                              <div className="md:col-span-1">
                                <h4 className="font-semibold mb-2">চেম্বারের সুবিধা</h4>
                                <div className="space-y-2">
                                  <Amenity icon={AirVent} label="এ/সি উপলব্ধ" isAvailable={proposal.doctor?.chamber_details?.hasAC} />
                                  <Amenity icon={Sparkles} label="স্বাস্থ্যকর পরিবেশ" isAvailable={proposal.doctor?.chamber_details?.isHygienic} />
                                  <Amenity icon={UserCheck} label="সহকারী আছে" isAvailable={proposal.doctor?.chamber_details?.hasAssistant} />
                                  <Amenity icon={Scan} label="অন-সাইট এক্স-রে" isAvailable={proposal.doctor?.chamber_details?.hasXray} />
                                  <Amenity icon={Cpu} label="আধুনিক যন্ত্রপাতি" isAvailable={proposal.doctor?.chamber_details?.hasModernEquipment} />
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mt-6">
                              {(caseDetails.status === 'open' || caseDetails.status === 'proposal_accepted') && !caseDetails.chosen_proposal_id && (
                                <Button 
                                  className="gradient-bg text-white w-full sm:w-auto"
                                  onClick={() => handleChooseDoctor(proposal)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  এই ডাক্তারকে নির্বাচন করুন
                                </Button>
                              )}
                              {caseDetails.chosen_proposal_id === proposal.id && (
                                <>
                                  <div className="flex items-center flex-wrap gap-4 p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      <Phone className="h-4 w-4 text-green-700" />
                                      <span className="text-sm font-medium text-green-800">{proposal.doctor?.phone || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Mail className="h-4 w-4 text-green-700" />
                                      <span className="text-sm font-medium text-green-800">{proposal.doctor?.email}</span>
                                    </div>
                                  </div>
                                  <Button onClick={() => openBookingModal(proposal.doctor)} variant="outline" className="w-full sm:w-auto" disabled={hasAppointment}>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    {hasAppointment ? 'অ্যাপয়েন্টমেন্ট বুক করা হয়েছে' : 'অ্যাপয়েন্টমেন্ট বুক করুন'}
                                  </Button>
                                  <Button onClick={() => navigate(`/chat/${caseId}`)} className="w-full sm:w-auto" disabled={!hasAppointment}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    এখন চ্যাট করুন
                                  </Button>
                                </>
                              )}
                              {caseDetails.status !== 'open' && caseDetails.chosen_proposal_id !== proposal.id && (
                                 <Badge variant="destructive">নির্বাচিত নয়</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Dr. {selectedDoctorForBooking?.name}-এর সাথে অ্যাপয়েন্টমেন্ট বুক করুন</DialogTitle>
                <DialogDescription>আপনার অ্যাপয়েন্টমেন্টের জন্য একটি তারিখ এবং সময় নির্বাচন করুন।</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  disabled={(date) => {
                    const day = getDay(date);
                    const isDayOff = !selectedDoctorForBooking?.availability?.days[day];
                    return date < startOfDay(new Date()) || isDayOff;
                  }}
                />
                <div className="max-h-64 overflow-y-auto space-y-2">
                  <h4 className="font-semibold text-center">{format(selectedDate, 'PPP')}</h4>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot, index) => (
                        <Button
                          key={index}
                          variant={selectedTime?.getTime() === slot.time.getTime() ? 'default' : 'outline'}
                          disabled={slot.isBooked}
                          onClick={() => setSelectedTime(slot.time)}
                        >
                          {format(slot.time, 'p')}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-500 pt-8">এই দিনের জন্য কোনো উপলব্ধ স্লট নেই।</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">বাতিল</Button></DialogClose>
                <Button onClick={handleBookAppointment} disabled={!selectedTime}>অ্যাপয়েন্টমেন্ট নিশ্চিত করুন</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    };

    export default ProposalView;