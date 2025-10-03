import React, { useState, useEffect } from 'react';
    import { Button } from '@/components/ui/button';
    import { Textarea } from '@/components/ui/textarea';
    import { Label } from '@/components/ui/label';
    import { Input } from '@/components/ui/input';
    import { toast } from '@/components/ui/use-toast';
    import { Stethoscope, Save, Plus, Trash2 } from 'lucide-react';

    const Prescription = ({ caseData, proposal, patient, doctor, existingPrescription, onSave, isDoctor }) => {
      const [medicines, setMedicines] = useState([{ name: '', dosage: '', duration: '' }]);
      const [notes, setNotes] = useState('');

      useEffect(() => {
        if (existingPrescription) {
          setMedicines(existingPrescription.medicines && existingPrescription.medicines.length > 0 ? existingPrescription.medicines : [{ name: '', dosage: '', duration: '' }]);
          setNotes(existingPrescription.notes || '');
        }
      }, [existingPrescription]);

      const handleSave = () => {
        const validMedicines = medicines.filter(m => m.name.trim());
        if (validMedicines.length === 0 && !notes.trim()) {
          toast({ title: "Prescription cannot be empty.", description: "Please add at least one medicine or a note.", variant: "destructive" });
          return;
        }
        onSave({
          caseId: caseData.id,
          patientId: patient.id,
          doctorId: doctor.id,
          medicines: validMedicines,
          notes: notes,
        });
      };

      const handleMedicineChange = (index, field, value) => {
        const newMeds = [...medicines];
        newMeds[index][field] = value;
        setMedicines(newMeds);
      };

      const addMedicineRow = () => {
        setMedicines([...medicines, { name: '', dosage: '', duration: '' }]);
      };

      const removeMedicineRow = (index) => {
        const newMeds = medicines.filter((_, i) => i !== index);
        setMedicines(newMeds);
      };

      return (
        <div id="prescription-content" className="p-8 bg-white text-gray-800 font-sans">
          <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Dr. {doctor.name}</h1>
                <p className="text-sm text-gray-600">{doctor.degree}</p>
                <p className="text-sm text-gray-600">{doctor.specialization}</p>
                <p className="text-sm text-gray-600">{doctor.chamber_address}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Date: {new Date(existingPrescription?.updated_at || existingPrescription?.created_at || Date.now()).toLocaleDateString()}</p>
            </div>
          </header>

          <section className="flex justify-between items-center mt-6 pb-2 border-b border-gray-300">
            <div className="text-sm">
              <p><span className="font-semibold">Patient:</span> {patient.name}</p>
            </div>
            <div className="text-sm">
              <p><span className="font-semibold">Age:</span> {patient.age}</p>
            </div>
            <div className="text-sm">
              <p><span className="font-semibold">Gender:</span> {patient.gender}</p>
            </div>
          </section>

          <section className="mt-8">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/4 md:pr-4 mb-6 md:mb-0">
                <h2 className="font-bold text-lg mb-2">C/C (Chief Complaints)</h2>
                <p className="text-sm">{caseData.description}</p>
                <h2 className="font-bold text-lg mt-4 mb-2">Diagnosis</h2>
                <p className="text-sm">{caseData.title}</p>
              </div>
              <div className="w-full md:w-3/4 md:pl-4 md:border-l-2 border-dashed border-gray-300">
                <div className="text-3xl font-serif font-bold text-gray-500">Rx</div>
                {isDoctor ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label>Medicines</Label>
                      {medicines.map((med, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2 items-center">
                          <Input className="sm:col-span-2" placeholder="Medicine Name" value={med.name} onChange={(e) => handleMedicineChange(index, 'name', e.target.value)} />
                          <Input placeholder="Dosage (e.g., 1+0+1)" value={med.dosage} onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)} />
                          <div className="flex items-center gap-2">
                            <Input placeholder="Duration (e.g., 7 days)" value={med.duration} onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)} />
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeMedicineRow(index)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addMedicineRow}><Plus className="h-4 w-4 mr-2" />Add Medicine</Button>
                    </div>
                    <div>
                      <Label htmlFor="prescription-notes">Notes</Label>
                      <Textarea id="prescription-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Follow up after 1 week." />
                    </div>
                    <Button onClick={handleSave} className="mt-4">
                      <Save className="h-4 w-4 mr-2" />
                      Save Prescription
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {medicines && medicines.length > 0 && medicines.some(m => m.name) ? (
                      <table className="w-full">
                        <thead><tr className="text-left border-b"><th className="pb-2 font-semibold">Medicine</th><th className="pb-2 font-semibold">Dosage</th><th className="pb-2 font-semibold">Duration</th></tr></thead>
                        <tbody>
                          {medicines.map((med, index) => med.name && (
                            <tr key={index} className="border-b"><td className="py-2">{med.name}</td><td className="py-2">{med.dosage}</td><td className="py-2">{med.duration}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                    {notes && <div className="pt-4"><h4 className="font-semibold">Notes:</h4><p className="whitespace-pre-wrap">{notes}</p></div>}
                    {!medicines?.some(m => m.name) && !notes && <p>No prescription has been created yet.</p>}
                  </div>
                )}
              </div>
            </div>
          </section>

          <footer className="mt-16 pt-4 border-t-2 border-gray-200 text-center text-gray-500 text-sm">
            <p>This is a digitally generated prescription and does not require a physical signature.</p>
            <p className="font-semibold text-gradient mt-1">DentaLink Smart Matching System</p>
          </footer>
        </div>
      );
    };

    export default Prescription;