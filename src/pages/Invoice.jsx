import React from 'react';
    import { Stethoscope } from 'lucide-react';

    const Invoice = ({ caseData, proposal, patient, doctor, settings }) => {
      if (!doctor || !proposal || !caseData || !patient || !settings) {
        return <div className="p-8 text-center">Loading invoice data...</div>;
      }

      const commissionType = doctor.commission?.type || settings.commission_type;
      const commissionRate = doctor.commission?.rate || settings.commission_rate;
      
      let commissionAmount = 0;
      if (commissionType === 'percentage') {
        commissionAmount = proposal.cost * (commissionRate / 100);
      } else {
        commissionAmount = Number(commissionRate);
      }

      const netIncome = proposal.cost - commissionAmount;

      return (
        <div id="invoice-content" className="p-8 bg-white text-gray-800 font-sans">
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
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-700 uppercase">Invoice</h2>
              <p className="text-sm text-gray-500">Invoice #: {`INV-${caseData.id.slice(-6)}`}</p>
              <p className="text-sm text-gray-500">Date: {new Date(proposal.accepted_at || Date.now()).toLocaleDateString()}</p>
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
              <div className="w-full md:w-1/3 md:pr-4 mb-6 md:mb-0">
                <h2 className="font-bold text-lg mb-2">Diagnosis</h2>
                <p className="text-sm">{caseData.title}</p>
                <h2 className="font-bold text-lg mt-4 mb-2">Treatment Plan</h2>
                <p className="text-sm">{proposal.details}</p>
              </div>
              <div className="w-full md:w-2/3 md:pl-4 md:border-l-2 border-dashed border-gray-300">
                 <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 uppercase text-sm">
                      <th className="p-3 font-semibold">Service Description</th>
                      <th className="p-3 font-semibold text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="p-3">
                        <p className="font-medium">Dental Consultation & Treatment</p>
                        <p className="text-sm text-gray-500">As per agreed plan for case: {caseData.title}</p>
                      </td>
                      <td className="p-3 text-right">৳{proposal.cost.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-end mt-8">
                    <div className="w-full max-w-sm">
                        <div className="flex justify-between py-2">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-medium">৳{proposal.cost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2 border-t border-gray-200">
                            <span className="text-gray-600">Tax / VAT</span>
                            <span className="font-medium">৳0.00</span>
                        </div>
                        <div className="flex justify-between py-3 bg-gray-100 px-4 rounded-md mt-2">
                            <span className="font-bold text-lg">Total Amount Due</span>
                            <span className="font-bold text-lg text-primary">৳{proposal.cost.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-16 pt-4 border-t-2 border-gray-200 text-center text-gray-500 text-sm">
            <p>Thank you for choosing our services. We wish you the best of health.</p>
            <p className="font-semibold text-gradient mt-1">DentaLink Smart Matching System</p>
          </footer>
        </div>
      );
    };

    export default Invoice;