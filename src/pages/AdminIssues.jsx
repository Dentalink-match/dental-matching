import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { ArrowLeft, User, UserCog, ChevronsRight, FileText, Eye } from 'lucide-react';
    import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
    } from "@/components/ui/select";
    import { toast } from "@/components/ui/use-toast";
    import ImageLightbox from '@/components/ImageLightbox';

    const AdminIssues = () => {
        const navigate = useNavigate();
        const { issues, updateIssueStatus, cases, users } = useData();
        const [sortedIssues, setSortedIssues] = useState([]);
        const [lightboxImage, setLightboxImage] = useState(null);

        useEffect(() => {
            setSortedIssues(issues.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
        }, [issues]);

        const getStatusBadge = (status) => {
            switch (status) {
                case 'new': return <Badge className="bg-red-100 text-red-800">New</Badge>;
                case 'investigation': return <Badge className="bg-yellow-100 text-yellow-800">Investigation</Badge>;
                case 'in-progress': return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
                case 'solved': return <Badge className="bg-green-100 text-green-800">Solved</Badge>;
                default: return <Badge variant="outline">{status}</Badge>;
            }
        };
        
        const handleStatusChange = async (issueId, newStatus) => {
            try {
                await updateIssueStatus(issueId, newStatus);
                toast({
                    title: "Issue Status Updated",
                    description: `The issue status has been changed to ${newStatus}.`
                });
            } catch (error) {
                toast({
                    title: "Update Failed",
                    description: "Could not update the issue status.",
                    variant: "destructive"
                });
            }
        };

        return (
            <>
            <Helmet><title>Issue Management - DentaLink Admin</title></Helmet>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm border-b sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                             <div className="flex items-center space-x-4">
                                <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                                <h1 className="text-xl font-bold text-gradient">Issue Management</h1>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <Card>
                            <CardHeader>
                                <CardTitle>All Reported Issues</CardTitle>
                                <CardDescription>Review, manage, and resolve all user-reported issues from this central hub.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               {sortedIssues.length === 0 ? (
                                 <div className="text-center py-16">
                                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-medium text-gray-700">No Issues Reported Yet</h3>
                                    <p className="text-gray-500">When users report issues, they will appear here.</p>
                                 </div>
                               ) : (
                                 <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                                    {sortedIssues.map(issue => {
                                        const caseInfo = cases.find(c => c.id === issue.case_id);
                                        const reporter = users.find(u => u.id === issue.reporter_id);
                                        return (
                                            <div key={issue.id} className="border rounded-lg p-4 transition-colors hover:bg-white">
                                                <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center mb-2 flex-wrap gap-2">
                                                            {getStatusBadge(issue.status)}
                                                            <h3 className="font-semibold text-lg">{issue.title}</h3>
                                                            {issue.category && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {issue.category.replace(/_/g, ' ').toUpperCase()}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center text-sm text-gray-600 space-x-4 mb-3">
                                                            <div className="flex items-center">
                                                                <User className="h-4 w-4 mr-2 text-primary"/>
                                                                <span className="font-medium">Reporter:</span>
                                                                <span className="ml-1">{issue.reporter_name}</span>
                                                                <span className="ml-1 text-gray-400">({reporter?.role})</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md mb-3">{issue.description}</p>
                                                        
                                                        {caseInfo && (
                                                            <div className="bg-blue-50 rounded-lg p-3 mb-3">
                                                                <h4 className="font-semibold text-sm mb-2 flex items-center">
                                                                    <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                                                    Related Case Details
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                                    <div><span className="font-medium">Case ID:</span> {caseInfo.id}</div>
                                                                    <div><span className="font-medium">Title:</span> {caseInfo.title}</div>
                                                                    <div><span className="font-medium">Patient:</span> {caseInfo.patient_name}</div>
                                                                    <div><span className="font-medium">Status:</span> {caseInfo.status}</div>
                                                                    <div><span className="font-medium">Created:</span> {new Date(caseInfo.created_at).toLocaleDateString()}</div>
                                                                    <div><span className="font-medium">Payment:</span> {caseInfo.payment_status || 'unpaid'}</div>
                                                                </div>
                                                                <div className="mt-2">
                                                                    <p className="text-sm"><span className="font-medium">Description:</span> {caseInfo.description}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {issue.evidence_urls && issue.evidence_urls.length > 0 && (
                                                            <div className="mb-3">
                                                                <h4 className="font-semibold text-sm mb-2 flex items-center">
                                                                    <Eye className="h-4 w-4 mr-2 text-green-600" />
                                                                    Evidence Attachments ({issue.evidence_urls.length})
                                                                </h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {issue.evidence_urls.map((url, index) => (
                                                                        <img 
                                                                            key={`issue-attachment-${index}`} 
                                                                            src={url} 
                                                                            alt={`Evidence ${index + 1}`} 
                                                                            className="h-20 w-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity border-2 border-gray-200"
                                                                            onClick={() => setLightboxImage(url)}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <p className="text-xs text-gray-400">Reported on: {new Date(issue.created_at).toLocaleString()}</p>
                                                    </div>
                                                    <div className="w-full lg:w-48 flex-shrink-0">
                                                        <Select value={issue.status} onValueChange={(newStatus) => handleStatusChange(issue.id, newStatus)}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Update status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="new">New</SelectItem>
                                                                <SelectItem value="investigation">Investigation</SelectItem>
                                                                <SelectItem value="in-progress">In Progress</SelectItem>
                                                                <SelectItem value="solved">Solved</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                 </div>
                               )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </main>
                <ImageLightbox imageUrl={lightboxImage} open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)} />
            </div>
            </>
        );
    };

    export default AdminIssues;