import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate, useParams } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      GitCompare,
      Trophy,
      AirVent, Sparkles, UserCheck, Scan, Cpu, Wifi, WifiOff
    } from 'lucide-react';

    const DoctorComparison = () => {
      const navigate = useNavigate();
      const { caseId } = useParams();
      const { user } = useAuth();
      const { cases, proposals, chooseDoctor } = useData();
      
      const [caseDetails, setCaseDetails] = useState(null);
      const [comparisonData, setComparisonData] = useState([]);

      useEffect(() => {
        if (caseId) {
          const currentCase = cases.find(c => c.id === caseId);
          setCaseDetails(currentCase);

          const relevantProposals = proposals.filter(p => p.case_id === caseId);
          setComparisonData(relevantProposals);
        }
      }, [caseId, cases, proposals]);

      const handleChooseDoctor = (proposal) => {
        chooseDoctor(caseId, proposal.id);
        toast({
          title: "Doctor Chosen!",
          description: `You have chosen Dr. ${proposal.doctor_name}. You can now proceed with communication.`,
        });
        navigate(`/patient/proposals/${caseId}`);
      };

      const getBestValue = (field) => {
        if (comparisonData.length === 0) return null;
        if (field === 'cost') {
          return Math.min(...comparisonData.map(p => p.cost));
        }
        if (field === 'rating') {
          return Math.max(...comparisonData.map(p => p.doctor?.rating || 0));
        }
        if (field === 'experience') {
          return Math.max(...comparisonData.map(p => p.doctor?.experience || 0));
        }
        return null;
      };

      const bestCost = getBestValue('cost');
      const bestRating = getBestValue('rating');
      const bestExperience = getBestValue('experience');

      if (!user) {
        navigate('/login');
        return null;
      }

      if (!caseDetails) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <p>Loading comparison data...</p>
          </div>
        );
      }

      const AmenityIcon = ({ icon: Icon, isAvailable, tooltip }) => (
        <div className={`p-2 rounded-full ${isAvailable ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`} title={tooltip}>
          <Icon className="h-5 w-5" />
        </div>
      );

      return (
        <>
          <Helmet>
            <title>Compare Doctors for "{caseDetails.title}" - DentaLink</title>
            <meta name="description" content={`Compare doctor proposals side-by-side for your dental case: ${caseDetails.title}.`} />
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
                  <h1 className="text-2xl md:text-3xl font-bold text-gradient">Doctor Comparison</h1>
                  <p className="text-gray-600">Compare proposals side-by-side for "{caseDetails.title}"</p>
                </div>
                <Button variant="outline" onClick={() => navigate(`/patient/proposals/${caseId}`)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Proposals
                </Button>
              </motion.div>

              {comparisonData.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-16">
                    <p className="text-gray-500">Not enough proposals to compare. Please check back later.</p>
                  </CardContent>
                </Card>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="overflow-x-auto"
                >
                  <div className={`grid gap-6`} style={{ gridTemplateColumns: `repeat(${comparisonData.length}, minmax(300px, 1fr))` }}>
                    {comparisonData.map((proposal, index) => (
                      <motion.div
                        key={proposal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <Card className="h-full flex flex-col">
                          <CardHeader className="text-center">
                            <Avatar className="h-20 w-20 mx-auto mb-4">
                              <AvatarImage src={proposal.doctor?.avatar} />
                              <AvatarFallback>{proposal.doctor_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <CardTitle>Dr. {proposal.doctor_name}</CardTitle>
                            <p className="text-sm text-gray-500">{proposal.doctor?.specialization}</p>
                          </CardHeader>
                          <CardContent className="flex-grow space-y-4">
                            <div className={`p-3 rounded-lg text-center ${proposal.cost === bestCost ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <p className="text-sm text-gray-500">Cost</p>
                              <p className="text-xl font-bold">৳{proposal.cost.toLocaleString()}</p>
                              {proposal.cost === bestCost && <Badge className="mt-1 bg-green-500">Best Price</Badge>}
                            </div>
                            
                            <div className="space-y-3 text-sm">
                              <div className={`flex justify-between items-center p-2 rounded ${proposal.doctor?.rating === bestRating ? 'bg-yellow-50' : ''}`}>
                                <span className="font-medium">Rating</span>
                                <span className="flex items-center">
                                  <Star className="h-4 w-4 mr-1 text-yellow-500" /> {proposal.doctor?.rating}
                                  {proposal.doctor?.rating === bestRating && <Trophy className="h-4 w-4 ml-2 text-yellow-600" />}
                                </span>
                              </div>
                              <div className={`flex justify-between items-center p-2 rounded ${proposal.doctor?.experience === bestExperience ? 'bg-blue-50' : ''}`}>
                                <span className="font-medium">Experience</span>
                                <span className="flex items-center">
                                  {proposal.doctor?.experience} years
                                  {proposal.doctor?.experience === bestExperience && <Trophy className="h-4 w-4 ml-2 text-primary" />}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2">
                                <span className="font-medium">Duration</span>
                                <span>{proposal.duration}</span>
                              </div>
                              <div className="flex justify-between items-center p-2">
                                <span className="font-medium">Distance</span>
                                <span className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                                  {proposal.doctor?.distance !== null ? `${proposal.doctor.distance.toFixed(1)} km` : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2">
                                <span className="font-medium">Status</span>
                                <span className="flex items-center">
                                  {proposal.doctor?.isOnline ? <Wifi className="h-4 w-4 mr-1 text-green-500" /> : <WifiOff className="h-4 w-4 mr-1 text-red-500" />}
                                  {proposal.doctor?.isOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2">
                                <span className="font-medium">Degree</span>
                                <span>{proposal.doctor?.degree}</span>
                              </div>
                            </div>

                            <div className="pt-4">
                              <h4 className="font-semibold mb-2">Chamber Amenities</h4>
                              <div className="flex justify-around p-2 bg-gray-50 rounded-lg">
                                <AmenityIcon icon={AirVent} isAvailable={proposal.doctor?.chamber_details?.hasAC} tooltip="A/C Available" />
                                <AmenityIcon icon={Sparkles} isAvailable={proposal.doctor?.chamber_details?.isHygienic} tooltip="Hygienic" />
                                <AmenityIcon icon={UserCheck} isAvailable={proposal.doctor?.chamber_details?.hasAssistant} tooltip="Assistant" />
                                <AmenityIcon icon={Scan} isAvailable={proposal.doctor?.chamber_details?.hasXray} tooltip="X-Ray" />
                                <AmenityIcon icon={Cpu} isAvailable={proposal.doctor?.chamber_details?.hasModernEquipment} tooltip="Modern Equipment" />
                              </div>
                            </div>

                            <div className="pt-4">
                              <h4 className="font-semibold mb-2">Treatment Plan</h4>
                              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg h-24 overflow-y-auto">
                                {proposal.details}
                              </p>
                            </div>
                          </CardContent>
                          <div className="p-6 pt-0">
                            {caseDetails.status === 'open' && (
                              <Button 
                                className="w-full gradient-bg text-white"
                                onClick={() => handleChooseDoctor(proposal)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Choose Dr. {proposal.doctor_name.split(' ')[0]}
                              </Button>
                            )}
                            {caseDetails.chosen_proposal_id === proposal.id && (
                              <Badge className="w-full justify-center bg-green-100 text-green-800 text-lg p-3">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Chosen
                              </Badge>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </>
      );
    };

    export default DoctorComparison;