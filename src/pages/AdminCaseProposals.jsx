
import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate, useParams } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { ArrowLeft, Star, Briefcase, Edit, Trash2, Eye } from 'lucide-react';
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
    import { toast } from '@/components/ui/use-toast';

    const AdminCaseProposals = () => {
      const navigate = useNavigate();
      const { caseId } = useParams();
      const { cases, proposals, users, deleteProposal } = useData();
      
      const [caseDetails, setCaseDetails] = useState(null);
      const [caseProposals, setCaseProposals] = useState([]);

      useEffect(() => {
        if (caseId) {
          const currentCase = cases.find(c => c.id === caseId);
          setCaseDetails(currentCase);

          const relevantProposals = proposals
            .filter(p => p.case_id === caseId)
            .map(p => ({
              ...p,
              doctor: users.find(u => u.id === p.doctor_id)
            }))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          setCaseProposals(relevantProposals);
        }
      }, [caseId, cases, proposals, users]);

      const handleDeleteProposal = async (proposalId) => {
        try {
          await deleteProposal(proposalId);
          toast({ title: "Success", description: "Proposal deleted successfully." });
          setCaseProposals(prev => prev.filter(p => p.id !== proposalId)); // Optimistically update UI
        } catch (error) {
          toast({ title: "Error", description: `Failed to delete proposal: ${error.message}`, variant: "destructive" });
        }
      };

      const getProposalStatusBadge = (status) => {
        switch (status) {
          case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 text-xs">অপেক্ষমান</Badge>;
          case 'accepted': return <Badge className="bg-green-100 text-green-800 text-xs">গৃহীত</Badge>;
          case 'rejected': return <Badge className="bg-red-100 text-red-800 text-xs">প্রত্যাখ্যাত</Badge>;
          case 'cancelled': return <Badge className="bg-gray-100 text-gray-800 text-xs">বাতিল</Badge>;
          case 'in_progress': return <Badge className="bg-cyan-100 text-cyan-800 text-xs">চলমান</Badge>;
          case 'completed': return <Badge className="bg-primary/20 text-primary text-xs">সম্পন্ন</Badge>;
          default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
        }
      };

      if (!caseDetails) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <p>Loading case proposals...</p>
          </div>
        );
      }

      return (
        <>
          <Helmet>
            <title>Proposals for "{caseDetails.title}" - Admin</title>
            <meta name="description" content={`Manage proposals for case: ${caseDetails.title}.`} />
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
                  <h1 className="text-2xl md:text-3xl font-bold text-gradient">Proposals for "{caseDetails.title}"</h1>
                  <p className="text-gray-600">Patient: {caseDetails.patient_name} | Case ID: {caseDetails.id}</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">All Proposals ({caseProposals.length})</h2>
                </div>

                {caseProposals.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-16">
                      <p className="text-gray-500">No proposals submitted for this case yet.</p>
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
                                    <span className="flex items-center"><Briefcase className="h-4 w-4 mr-1" /> {proposal.doctor?.experience || 'N/A'} years</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right self-start sm:self-center">
                                <div className="flex items-baseline justify-end gap-2">
                                    <p className="text-2xl font-bold text-primary">৳{proposal.cost.toLocaleString()}</p>
                                    {proposal.previous_cost && (
                                        <p className="text-sm text-gray-500 line-through opacity-70">৳{proposal.previous_cost.toLocaleString()}</p>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">Estimated Cost</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                                <div>
                                <h4 className="font-semibold mb-2">Proposed Treatment Plan</h4>
                                <p className="text-gray-600 bg-gray-50 p-3 rounded-md">{proposal.details}</p>
                                </div>
                                {proposal.notes && (
                                <div>
                                <h4 className="font-semibold mb-2">Additional Notes</h4>
                                <p className="text-gray-600 bg-gray-50 p-3 rounded-md">{proposal.notes}</p>
                                </div>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mt-6">
                                {getProposalStatusBadge(proposal.status)}
                                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/proposal/edit/${proposal.id}`)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the proposal from Dr. {proposal.doctor_name}.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteProposal(proposal.id)}>
                                            Delete
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
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
        </>
      );
    };

    export default AdminCaseProposals;
