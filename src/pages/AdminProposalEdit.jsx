import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate, useParams } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { toast } from '@/components/ui/use-toast';
    import { ArrowLeft, Save, FileSignature } from 'lucide-react';

    const AdminProposalEdit = () => {
      const navigate = useNavigate();
      const { proposalId } = useParams();
      const { proposals, users, cases, updateProposal } = useData();
      const [proposalData, setProposalData] = useState(null);
      const [caseInfo, setCaseInfo] = useState(null);
      const [doctorInfo, setDoctorInfo] = useState(null);
      const [patientInfo, setPatientInfo] = useState(null);
      const [loading, setLoading] = useState(false);

      useEffect(() => {
        const proposalToEdit = proposals.find(p => p.id === proposalId);
        if (proposalToEdit) {
          setProposalData({
            ...proposalToEdit,
            treatmentPlan: proposalToEdit.details || ''
          });
          const associatedCase = cases.find(c => c.id === proposalToEdit.case_id);
          const associatedDoctor = users.find(u => u.id === proposalToEdit.doctor_id);
          const associatedPatient = users.find(u => u.id === proposalToEdit.patient_id);
          setCaseInfo(associatedCase);
          setDoctorInfo(associatedDoctor);
          setPatientInfo(associatedPatient);
        } else {
          toast({ title: "Error", description: "Proposal not found.", variant: "destructive" });
          navigate('/admin/dashboard');
        }
      }, [proposalId, proposals, cases, users, navigate]);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          await updateProposal({
            ...proposalData,
            cost: parseFloat(proposalData.cost)
          });
          toast({
            title: "Proposal Updated Successfully!",
            description: `The proposal has been saved.`,
          });
          navigate('/admin/dashboard');
        } catch (error) {
          toast({
            title: "Update Failed",
            description: error.message || "Something went wrong. Please try again.",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      };

      const handleChange = (field, value) => {
        setProposalData(prev => ({ ...prev, [field]: value }));
      };

      if (!proposalData || !caseInfo || !doctorInfo || !patientInfo) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        );
      }

      return (
        <>
          <Helmet>
            <title>Edit Proposal - DentaLink Admin</title>
            <meta name="description" content={`Manage proposals from the admin dashboard.`} />
          </Helmet>

          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Card className="shadow-2xl border-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileSignature className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle className="text-2xl font-bold">Edit Proposal</CardTitle>
                          <CardDescription>Case: "{caseInfo.title}" by Dr. {doctorInfo.name}</CardDescription>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate('/admin/dashboard')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="treatmentPlan">Treatment Plan</Label>
                        <Textarea id="treatmentPlan" value={proposalData.treatmentPlan || ''} onChange={(e) => handleChange('treatmentPlan', e.target.value)} required rows={4} />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="cost">Treatment Cost (৳)</Label>
                          <Input id="cost" type="number" value={proposalData.cost || ''} onChange={(e) => handleChange('cost', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">Treatment Duration</Label>
                          <Input id="duration" value={proposalData.duration || ''} onChange={(e) => handleChange('duration', e.target.value)} required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Additional Notes</Label>
                        <Textarea id="notes" value={proposalData.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} rows={3} />
                      </div>
                      
                      <div className="space-y-2">
                          <Label htmlFor="status">Proposal Status</Label>
                          <Select value={proposalData.status || ''} onValueChange={(value) => handleChange('status', value)}>
                            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                      <Button type="submit" className="w-full gradient-bg text-white" disabled={loading}>
                        {loading ? 'Saving...' : <div className="flex items-center justify-center"><Save className="h-4 w-4 mr-2" /><span>Save Changes</span></div>}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </>
      );
    };

    export default AdminProposalEdit;