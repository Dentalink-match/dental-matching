import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { v4 as uuidv4 } from 'uuid';

    const DataContext = createContext();

    export const useData = () => useContext(DataContext);

    export const DataProvider = ({ children }) => {
        const { user: authUser, session } = useAuth();
        const [cases, setCases] = useState([]);
        const [proposals, setProposals] = useState([]);
        const [users, setUsers] = useState([]);
        const [issues, setIssues] = useState([]);
        const [prescriptions, setPrescriptions] = useState([]);
        const [reviews, setReviews] = useState([]);
        const [transactions, setTransactions] = useState([]);
        const [appointments, setAppointments] = useState([]);
        const [settings, setSettings] = useState({});
        const [activityLogs, setActivityLogs] = useState([]);
        const [loading, setLoading] = useState(true);

        const fetchData = useCallback(async () => {
            if (!session) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const [
                    casesRes,
                    proposalsRes,
                    usersRes,
                    issuesRes,
                    prescriptionsRes,
                    reviewsRes,
                    transactionsRes,
                    appointmentsRes,
                    settingsRes,
                    activityLogsRes
                ] = await Promise.all([
                    supabase.from('cases').select('*'),
                    supabase.from('proposals').select('*'),
                    supabase.from('users').select('*'),
                    supabase.from('issues').select('*'),
                    supabase.from('prescriptions').select('*'),
                    supabase.from('reviews').select('*'),
                    supabase.from('transactions').select('*'),
                    supabase.from('appointments').select('*'),
                    supabase.from('settings').select('*').single(),
                    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100)
                ]);

                if (casesRes.error) throw casesRes.error;
                if (proposalsRes.error) throw proposalsRes.error;
                if (usersRes.error) throw usersRes.error;
                if (issuesRes.error) throw issuesRes.error;
                if (prescriptionsRes.error) throw prescriptionsRes.error;
                if (reviewsRes.error) throw reviewsRes.error;
                if (transactionsRes.error) throw transactionsRes.error;
                if (appointmentsRes.error) throw appointmentsRes.error;
                if (settingsRes.error) throw settingsRes.error;
                if (activityLogsRes.error) throw activityLogsRes.error;

                setCases(casesRes.data);
                setProposals(proposalsRes.data);
                setUsers(usersRes.data);
                setIssues(issuesRes.data);
                setPrescriptions(prescriptionsRes.data);
                setReviews(reviewsRes.data);
                setTransactions(transactionsRes.data);
                setAppointments(appointmentsRes.data);
                setSettings(settingsRes.data);
                setActivityLogs(activityLogsRes.data);

            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }, [session]);

        useEffect(() => {
            if (session) {
                fetchData();
            }
        }, [session, fetchData]);

        useEffect(() => {
            if (!session) return;

            const handleChanges = (payload) => {
                console.log('Realtime change received!', payload);
                fetchData();
            };

            const subscription = supabase.channel('public-schema-changes')
                .on('postgres_changes', { event: '*', schema: 'public' }, handleChanges)
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }, [session, fetchData]);

        const addActivityLog = async (action, details = {}) => {
            if (!authUser) return;
            const user = users.find(u => u.auth_id === authUser.id);
            if (!user) return;

            const { error } = await supabase.from('activity_logs').insert({
                id: uuidv4(),
                user_id: user.id,
                user_name: user.name,
                action,
                details,
            });
            if (error) {
                console.error('Error logging activity:', error);
            }
        };

        const submitCase = async (caseData) => {
            const newCaseId = `DL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
            if (!authUser) throw new Error("User not authenticated.");
            const user = users.find(u => u.id === authUser.id);
            if (!user) throw new Error("User profile not found.");

            let imageUrls = [];
            if (caseData.images && caseData.images.length > 0) {
                imageUrls = await Promise.all(
                    caseData.images.map(async (file) => {
                        const filePath = `public/${newCaseId}/${file.name}`;
                        const { error: uploadError } = await supabase.storage
                            .from('My Common Bucket')
                            .upload(filePath, file);
                        if (uploadError) {
                            console.error('Upload error:', uploadError);
                            throw uploadError;
                        }
                        const { data: urlData } = supabase.storage
                            .from('My Common Bucket')
                            .getPublicUrl(filePath);
                        return urlData.publicUrl;
                    })
                );
            }

            const newCase = {
                id: newCaseId,
                patient_id: user.id,
                patient_name: user.name,
                title: caseData.title,
                description: caseData.description,
                urgency: caseData.urgency,
                status: 'pending_assignment',
                images: imageUrls,
                affected_teeth: caseData.affectedTeeth,
                treatmentNeeded: caseData.treatmentNeeded,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('cases')
                .insert([newCase])
                .select()
                .single();

            if (error) throw error;
            await addActivityLog('CASE_SUBMITTED', { caseId: newCaseId, title: caseData.title });
            return data;
        };

        const saveCase = async (caseData) => {
            const { id, newImages, ...rest } = caseData;
            let imageUrls = caseData.images || [];

            if (newImages && newImages.length > 0) {
                const caseIdentifier = id || `new-case-${Date.now()}`;
                const uploadedUrls = await Promise.all(
                    newImages.map(async (file) => {
                        const filePath = `public/${caseIdentifier}/${uuidv4()}-${file.name}`;
                        const { error: uploadError } = await supabase.storage
                            .from('My Common Bucket')
                            .upload(filePath, file);
                        if (uploadError) {
                            console.error('Upload error:', uploadError);
                            throw uploadError;
                        }
                        const { data: urlData } = supabase.storage
                            .from('My Common Bucket')
                            .getPublicUrl(filePath);
                        return urlData.publicUrl;
                    })
                );
                imageUrls = [...imageUrls, ...uploadedUrls];
            }
            
            const dataToSave = { ...rest, images: imageUrls, updated_at: new Date().toISOString() };

            if (id) {
                const originalCase = cases.find(c => c.id === id);
                const { data, error } = await supabase
                    .from('cases')
                    .update(dataToSave)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) throw error;
                await addActivityLog('CASE_UPDATED', { caseId: id, previous: originalCase, new: data });
                return data;
            } else {
                const newCaseId = `DL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
                const { data, error } = await supabase
                    .from('cases')
                    .insert([{ id: newCaseId, ...dataToSave, created_at: new Date().toISOString() }])
                    .select()
                    .single();
                if (error) throw error;
                await addActivityLog('CASE_CREATED', { caseId: newCaseId, details: data });
                return data;
            }
        };

        const deleteCase = async (caseId) => {
            const caseToDelete = cases.find(c => c.id === caseId);
            if (!caseToDelete) throw new Error("Case not found.");

            const { error: deleteProposalsError } = await supabase
                .from('proposals')
                .delete()
                .eq('case_id', caseId);
            if (deleteProposalsError) throw deleteProposalsError;

            if (caseToDelete.images && caseToDelete.images.length > 0) {
                const filePaths = caseToDelete.images.map(url => {
                    const pathSegments = url.split('/');
                    return `public/${caseId}/${pathSegments[pathSegments.length - 1]}`;
                });
                const { error: deleteStorageError } = await supabase.storage
                    .from('My Common Bucket')
                    .remove(filePaths);
                if (deleteStorageError) console.error('Error deleting case images from storage:', deleteStorageError);
            }

            const { error } = await supabase
                .from('cases')
                .delete()
                .eq('id', caseId);
            if (error) throw error;
            await addActivityLog('CASE_DELETED', { caseId, title: caseToDelete.title });
            setCases(prevCases => prevCases.filter(c => c.id !== caseId));
        };

        const assignCaseToDoctors = async (caseId, doctorIds) => {
            const originalCase = cases.find(c => c.id === caseId);
            const { data, error } = await supabase
                .from('cases')
                .update({
                    assigned_doctor_ids: doctorIds,
                    status: 'open',
                    assignment_time: new Date().toISOString(),
                    proposal_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
                })
                .eq('id', caseId)
                .select()
                .single();
            if (error) throw error;
            await addActivityLog('CASE_ASSIGNED', { caseId, previous: { assigned_doctor_ids: originalCase.assigned_doctor_ids }, new: { assigned_doctor_ids: doctorIds } });
            return data;
        };

        const submitProposal = async (proposalData) => {
            const newProposalId = `PR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
            const { caseId, doctorId, doctorName, patientId, treatmentPlan, cost, duration, notes } = proposalData;
            const newProposal = {
                id: newProposalId,
                case_id: caseId,
                doctor_id: doctorId,
                doctor_name: doctorName,
                patient_id: patientId,
                cost: cost,
                details: treatmentPlan,
                duration: duration,
                notes: notes,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            const { data, error } = await supabase
                .from('proposals')
                .insert([newProposal])
                .select()
                .single();
            if (error) throw error;
            await addActivityLog('PROPOSAL_SUBMITTED', { proposalId: newProposalId, caseId, cost });
            return data;
        };

        const updateProposal = async (proposalData) => {
            const { id, ...rest } = proposalData;
            const originalProposal = proposals.find(p => p.id === id);
            const { data, error } = await supabase
                .from('proposals')
                .update({ ...rest, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            await addActivityLog('PROPOSAL_UPDATED', { proposalId: id, previous: originalProposal, new: data });
            return data;
        };

        const deleteProposal = async (proposalId) => {
            const proposalToDelete = proposals.find(p => p.id === proposalId);
            if (!proposalToDelete) throw new Error("Proposal not found.");

            const { error } = await supabase
                .from('proposals')
                .delete()
                .eq('id', proposalId);
            if (error) throw error;
            await addActivityLog('PROPOSAL_DELETED', { proposalId, caseId: proposalToDelete.case_id });
            setProposals(prevProposals => prevProposals.filter(p => p.id !== proposalId));
        };

        const chooseProposal = async (caseId, proposalId) => {
            const { data: caseData, error: caseError } = await supabase
                .from('cases')
                .update({ chosen_proposal_id: proposalId, status: 'proposal_accepted' })
                .eq('id', caseId)
                .select()
                .single();
            if (caseError) throw caseError;

            const { data: proposalData, error: proposalError } = await supabase
                .from('proposals')
                .update({ status: 'accepted', accepted_at: new Date().toISOString() })
                .eq('id', proposalId)
                .select();
            if (proposalError) throw proposalError;
            
            await addActivityLog('PROPOSAL_ACCEPTED', { caseId, proposalId });

            return { caseData, proposalData: proposalData[0] };
        };

        const bookAppointment = async (appointmentData) => {
            const newAppointment = {
                id: uuidv4(),
                ...appointmentData,
                status: 'scheduled',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            const { data, error } = await supabase
                .from('appointments')
                .insert([newAppointment])
                .select()
                .single();
            if (error) throw error;

            const { data: updatedCase, error: caseUpdateError } = await supabase
                .from('cases')
                .update({ status: 'in-progress' })
                .eq('id', appointmentData.case_id)
                .select()
                .single();
            if (caseUpdateError) throw caseUpdateError;
            
            setCases(prevCases => prevCases.map(c => c.id === appointmentData.case_id ? updatedCase : c));

            await addActivityLog('APPOINTMENT_BOOKED', { caseId: appointmentData.case_id, appointmentId: data.id, time: appointmentData.appointment_time });
            return data;
        };

        const submitIssue = async (issueData) => {
            const newIssueId = `IS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
            let evidenceUrls = [];
            if (issueData.attachments && issueData.attachments.length > 0) {
                evidenceUrls = await Promise.all(
                    issueData.attachments.map(async (dataUrl, index) => {
                        const response = await fetch(dataUrl);
                        const blob = await response.blob();
                        const filePath = `public/issues/${newIssueId}/evidence_${index + 1}.jpg`;
                        const { error: uploadError } = await supabase.storage
                            .from('My Common Bucket')
                            .upload(filePath, blob, { contentType: 'image/jpeg' });
                        if (uploadError) throw uploadError;
                        const { data: urlData } = supabase.storage
                            .from('My Common Bucket')
                            .getPublicUrl(filePath);
                        return urlData.publicUrl;
                    })
                );
            }

            const newIssue = {
                id: newIssueId,
                case_id: issueData.caseId,
                reporter_id: issueData.reporterId,
                reporter_name: issueData.reporterName,
                title: issueData.title,
                description: issueData.description,
                category: issueData.category,
                status: 'new',
                evidence_urls: evidenceUrls,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('issues')
                .insert([newIssue])
                .select()
                .single();
            if (error) throw error;
            await addActivityLog('ISSUE_SUBMITTED', { issueId: newIssueId, caseId: issueData.caseId, title: issueData.title });
            return data;
        };

        const updateIssue = async (issueId, updates) => {
            const originalIssue = issues.find(i => i.id === issueId);
            const { data, error } = await supabase
                .from('issues')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', issueId)
                .select()
                .single();
            if (error) throw error;
            await addActivityLog('ISSUE_UPDATED', { issueId, previous: originalIssue, new: data });
            return data;
        };

        const updateIssueStatus = async (issueId, status) => {
            const originalIssue = issues.find(i => i.id === issueId);
            const data = await updateIssue(issueId, { status });
            await addActivityLog('ISSUE_STATUS_CHANGED', { issueId, previous_status: originalIssue.status, new_status: status });
            return data;
        };

        const savePrescription = async (prescriptionData) => {
            const { id, ...rest } = prescriptionData;
            if (id) {
                const originalPrescription = prescriptions.find(p => p.id === id);
                const { data, error } = await supabase
                    .from('prescriptions')
                    .update({ ...rest, updated_at: new Date().toISOString() })
                    .eq('id', id)
                    .select()
                    .single();
                if (error) throw error;
                await addActivityLog('PRESCRIPTION_UPDATED', { prescriptionId: id, previous: originalPrescription, new: data });
                return data;
            } else {
                const newPrescriptionId = `PS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
                const { data, error } = await supabase
                    .from('prescriptions')
                    .insert([{ id: newPrescriptionId, ...rest, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
                    .select()
                    .single();
                if (error) throw error;
                await addActivityLog('PRESCRIPTION_CREATED', { prescriptionId: newPrescriptionId, caseId: prescriptionData.case_id });
                return data;
            }
        };

        const makePaymentForCase = async (caseId, patientId, amount, method) => {
            const patient = users.find(u => u.id === patientId);
            if (!patient) return { success: false, message: "Patient not found." };

            const proposal = proposals.find(p => p.id === cases.find(c => c.id === caseId)?.chosen_proposal_id);
            if (!proposal) return { success: false, message: "Proposal not found." };

            const transactionId = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
            
            if (method === 'wallet') {
                if ((patient.credit || 0) < amount) {
                    return { success: false, message: "Insufficient wallet balance." };
                }
                const newCredit = patient.credit - amount;
                const { error: userUpdateError } = await supabase
                    .from('users')
                    .update({ credit: newCredit })
                    .eq('id', patientId);
                if (userUpdateError) return { success: false, message: userUpdateError.message };

                const { error: transactionError } = await supabase
                    .from('transactions')
                    .insert([{
                        id: transactionId,
                        user_id: patientId,
                        doctor_id: proposal.doctor_id,
                        doctor_name: proposal.doctor_name,
                        case_id: caseId,
                        type: 'treatment_payment',
                        amount: amount,
                        payment_method: method,
                        status: 'completed',
                        date: new Date().toISOString(),
                        notes: `Paid for case ${caseId} from wallet`
                    }]);
                if (transactionError) return { success: false, message: transactionError.message };
            }

            const paymentStatus = method === 'cash' ? 'paid_in_cash' : 'paid';
            const { error: caseUpdateError } = await supabase
                .from('cases')
                .update({ payment_status: paymentStatus })
                .eq('id', caseId);
            if (caseUpdateError) return { success: false, message: caseUpdateError.message };

            if (method !== 'wallet') {
                const { error: transactionError } = await supabase
                    .from('transactions')
                    .insert([{
                        id: transactionId,
                        user_id: patientId,
                        doctor_id: proposal.doctor_id,
                        doctor_name: proposal.doctor_name,
                        case_id: caseId,
                        type: 'treatment_payment',
                        amount: amount,
                        payment_method: method,
                        status: 'completed',
                        date: new Date().toISOString(),
                    }]);
                if (transactionError) return { success: false, message: transactionError.message };
            }

            await addActivityLog('PAYMENT_MADE', { caseId, amount, method });
            await fetchData();
            return { success: true };
        };

        const submitReview = async (reviewData) => {
            const newReviewId = `RV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
            const { data, error } = await supabase
                .from('reviews')
                .insert([{
                    id: newReviewId,
                    ...reviewData,
                    created_at: new Date().toISOString(),
                }])
                .select()
                .single();
            if (error) throw error;
            await addActivityLog('REVIEW_SUBMITTED', { caseId: reviewData.case_id, rating: reviewData.rating });
            return data;
        };

        const payPlatformCommission = async (doctorId, amount, paymentMethod) => {
            const transactionId = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
            const { error } = await supabase
                .from('transactions')
                .insert([{
                    id: transactionId,
                    doctor_id: doctorId,
                    type: 'commission_payment',
                    amount: amount,
                    payment_method: paymentMethod,
                    status: 'completed',
                    date: new Date().toISOString(),
                }]);
            if (error) throw error;
            await addActivityLog('COMMISSION_PAID', { doctorId, amount });
            return { success: true };
        };

        const updateUser = async (userData) => {
            const { id, ...rest } = userData;
            const originalUser = users.find(u => u.id === id);
            const { data, error } = await supabase
                .from('users')
                .update({ ...rest, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            await addActivityLog('USER_UPDATED', { userId: id, previous: originalUser, new: data });
            return data;
        };

        const uploadTreatmentPhoto = async (caseId, photoDataUrl, type) => {
            const response = await fetch(photoDataUrl);
            const blob = await response.blob();
            const fileName = `${type}_${Date.now()}.jpeg`;
            const filePath = `public/treatments/${caseId}/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('My Common Bucket')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from('My Common Bucket')
                .getPublicUrl(uploadData.path);

            const photoUrl = urlData.publicUrl;
            const updateField = type === 'start' ? 'treatment_start_photo' : 'treatment_end_photo';
            const newStatus = type === 'start' ? 'treatment_started' : 'completed';

            const { data: updatedCase, error: updateError } = await supabase
                .from('cases')
                .update({ [updateField]: photoUrl, status: newStatus })
                .eq('id', caseId)
                .select()
                .single();

            if (updateError) {
                console.error('Case update error:', updateError);
                throw updateError;
            }
            
            setCases(prevCases => prevCases.map(c => c.id === caseId ? updatedCase : c));
            await addActivityLog('TREATMENT_PHOTO_UPLOADED', { caseId, type, photoUrl });
            return updatedCase;
        };

        const saveSettings = async (newSettings) => {
            const { id, ...rest } = newSettings;
            const originalSettings = settings;
            const { data, error } = await supabase
                .from('settings')
                .update(rest)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            setSettings(data);
            await addActivityLog('SETTINGS_UPDATED', { previous: originalSettings, new: data });
            return data;
        };

        const addCreditToWallet = async (userId, amount, method) => {
            const user = users.find(u => u.id === userId);
            if (!user) return { success: false, message: "User not found." };

            const newCredit = (user.credit || 0) + amount;
            const { error: userUpdateError } = await supabase
                .from('users')
                .update({ credit: newCredit })
                .eq('id', userId);

            if (userUpdateError) return { success: false, message: userUpdateError.message };

            const transactionId = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert([{
                    id: transactionId,
                    user_id: userId,
                    type: 'credit_deposit',
                    amount: amount,
                    payment_method: method,
                    status: 'completed',
                    date: new Date().toISOString(),
                    notes: `Added ৳${amount} via ${method}`
                }]);
            
            if (transactionError) return { success: false, message: transactionError.message };

            await addActivityLog('WALLET_CREDIT_ADDED', { userId, amount, method });
            await fetchData();
            return { success: true };
        };

        const value = {
            cases,
            proposals,
            users,
            issues,
            prescriptions,
            reviews,
            transactions,
            appointments,
            settings,
            activityLogs,
            loading,
            fetchData,
            submitCase,
            saveCase,
            deleteCase,
            assignCaseToDoctors,
            submitProposal,
            updateProposal,
            deleteProposal,
            chooseProposal,
            bookAppointment,
            submitIssue,
            updateIssue,
            updateIssueStatus,
            savePrescription,
            makePaymentForCase,
            submitReview,
            payPlatformCommission,
            updateUser,
            uploadTreatmentPhoto,
            saveSettings,
            addActivityLog,
            addCreditToWallet,
        };

        return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
    };