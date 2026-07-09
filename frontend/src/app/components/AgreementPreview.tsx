import { useState } from 'react';
import { X, Download, Printer, ChevronDown, ChevronUp, Mail, Phone, FileText, CheckCircle, Shield, Clock } from 'lucide-react';
import bonoriyaLogo from '../../imports/Bonoriya_2___1_.png';

interface AgreementPreviewProps {
  onClose: () => void;
  /** Optional pre-filled partner data. Defaults to sample data. */
  partnerData?: {
    partnerName: string;
    businessName: string;
    email: string;
    mobile: string;
    address?: string;
    gstNumber?: string;
    acceptedAt: string;
  };
}

const SAMPLE_DATA = {
  partnerName: 'Rajan Kumar Sharma',
  businessName: 'Green Valley Homestay & Resort',
  email: 'rajan.sharma@greenvalley.com',
  mobile: '+91-9876543210',
  address: 'Shillong Road, Halher, Ri-Bhoi District, Meghalaya – 793101',
  gstNumber: '17ABCDE1234F1Z5',
  acceptedAt: new Date().toISOString(),
};

const CLAUSES = [
  {
    num: '1',
    title: 'Appointment of Partner',
    body: `The Partner agrees to register and list their property/properties and hospitality services on BONORIYA platform for promotion, bookings, and customer acquisition.

BONORIYA reserves the right to approve, reject, suspend, or remove any listing at its sole discretion.`,
  },
  {
    num: '2',
    title: 'Commission Structure',
    body: `The Partner agrees that BONORIYA shall charge a commission of 10% (Ten Percent) on the total booking value for every successful booking generated through BONORIYA platform.

Applicable on: Stay bookings, Room bookings, Day trip bookings, Package bookings, and any other paid bookings.

Commission shall be calculated on the final booking amount excluding taxes unless otherwise agreed in writing.`,
    highlight: true,
  },
  {
    num: '3',
    title: 'GST & Taxes',
    body: `All applicable taxes including GST, local taxes, and government levies shall apply as per prevailing Government rules.

The Partner shall be solely responsible for tax compliance, registration, filing, and payment. BONORIYA shall not be liable for any tax non-compliance by the Partner.`,
  },
  {
    num: '4',
    title: 'Licenses & Legal Compliance',
    body: `The Partner confirms that all required licenses, permits, approvals, and registrations have been obtained from relevant local/state/government authorities including but not limited to:

• Trade License  • Tourism Registration  • Fire Safety Clearance
• Pollution Clearance  • FSSAI License  • Homestay / Hotel Registration

Partner shall maintain compliance at all times. BONORIYA shall not be responsible for any regulatory violation by the Partner.`,
  },
  {
    num: '5',
    title: 'Property Information Accuracy',
    body: `Partner agrees that all submitted information must be true and accurate including property details, room details, pricing, photos, amenities, and availability. The Partner is solely responsible for any false or misleading information submitted.`,
  },
  {
    num: '6',
    title: 'Booking Fulfillment Responsibility',
    body: `The Partner is solely responsible for honoring all confirmed bookings generated via BONORIYA platform. Partner must provide services exactly as listed. Repeated booking denial or failure to honor bookings may result in immediate suspension from the platform.`,
  },
  {
    num: '7',
    title: 'Guest & Host Conduct',
    body: `Both Partner and Guest are expected to maintain professional, respectful, and lawful conduct throughout all interactions. Partner may refuse service in case of unlawful or disruptive behavior subject to applicable laws.`,
  },
  {
    num: '8',
    title: 'Limitation of Liability',
    body: `BONORIYA acts solely as an online intermediary platform connecting guests and hosts. BONORIYA shall not be liable for disputes, damages, losses, misconduct, claims, injuries, or disagreements arising between Partner/Host and Guest/Visitor including service disputes, property disputes, payment disputes, personal injury, theft, damage, or misconduct. All such disputes shall be resolved directly between Partner and Guest.`,
  },
  {
    num: '9',
    title: 'Payments & Settlement',
    body: `Payments and settlements shall be processed as per BONORIYA payment cycle (30-day monthly cycle). BONORIYA reserves the right to deduct commission, taxes, refund adjustments, and applicable penalties before settlement to the Partner.`,
  },
  {
    num: '10',
    title: 'Cancellation & Refund Policy',
    body: `Cancellation and refund shall be governed by the applicable booking policies displayed at the time of booking. Partner agrees to honor the displayed cancellation policy for all bookings.`,
  },
  {
    num: '11',
    title: 'Suspension / Termination',
    body: `BONORIYA reserves the right to suspend or terminate partner access in case of: Fraud, Policy violation, Misrepresentation, Legal non-compliance, Repeated service failures, or Serious customer complaints.`,
  },
  {
    num: '12',
    title: 'Modification of Agreement',
    body: `BONORIYA reserves the right to update this Agreement from time to time with reasonable notice. Continued use of the platform after notification constitutes acceptance of revised terms.`,
  },
  {
    num: '13',
    title: 'Governing Law',
    body: `This Agreement shall be governed by the laws of India. All disputes shall be subject to exclusive jurisdiction of competent courts in India.`,
  },
  {
    num: '14',
    title: 'Force Majeure',
    body: `BONORIYA shall not be liable for failure or delay caused by events beyond reasonable control including natural disasters, floods, fire, pandemic, government restrictions, war, technical failures, cyber attacks, or internet outage.`,
  },
  {
    num: '15',
    title: 'Indemnity Clause',
    body: `The Partner agrees to indemnify and hold harmless BONORIYA from all liabilities, losses, claims, damages, costs, and legal expenses arising due to Agreement breach, regulatory violation, invalid licenses, property disputes, guest disputes, fraud, or tax non-compliance. The Partner shall bear all legal and financial consequences of such events.`,
  },
  {
    num: '16',
    title: 'Electronic Acceptance & Digital Consent',
    body: `This Agreement is executed electronically. By registering as a Partner on BONORIYA platform and clicking "I AGREE TO THE TERMS & CONDITIONS", the Partner confirms they have read this Agreement in full, understand all terms, and agree to be legally bound.

No physical signature is required. Electronic acceptance shall have full legal validity and enforceability under applicable laws including the Information Technology Act, 2000.`,
    highlight: true,
  },
  {
    num: '17',
    title: 'Electronic Communication Consent',
    body: `The Partner agrees to receive all communications electronically through Email, WhatsApp, SMS, and BONORIYA platform notifications including agreement copy, updates, notices, payment communication, and policy changes.`,
  },
  {
    num: '18',
    title: 'Agreement Record & Audit Trail',
    body: `BONORIYA shall maintain digital records of agreement acceptance including: Partner Name, Email ID, Mobile Number, Property Name, Date & Time of Acceptance, IP Address, and Device Details. This digital audit trail shall serve as legally valid proof of acceptance.`,
  },
];

export default function AgreementPreview({ onClose, partnerData }: AgreementPreviewProps) {
  const data = partnerData || SAMPLE_DATA;
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set(['1', '2', '16']));
  const [allExpanded, setAllExpanded] = useState(false);

  const dateStr = new Date(data.acceptedAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const toggleClause = (num: string) => {
    setExpandedClauses(prev => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedClauses(new Set(['1', '2', '16']));
    } else {
      setExpandedClauses(new Set(CLAUSES.map(c => c.num)));
    }
    setAllExpanded(!allExpanded);
  };

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-white w-full max-w-[794px] rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Preview toolbar ── */}
        <div className="sticky top-0 z-10 bg-[#0F2218] text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-white/80" />
            <div>
              <p className="text-sm font-semibold leading-tight">Digital Partner Agreement</p>
              <p className="text-xs text-white/60 leading-tight">Sample Preview — matches the PDF sent to partner & admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
            >
              {allExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── A4 Document ── */}
        <div className="bg-gray-100 p-6">
          <div id="agreement-document" className="bg-white shadow-lg mx-auto" style={{ maxWidth: 794, minHeight: 1123 }}>

            {/* Document Header — Dark Green Banner with Logo */}
            <div className="bg-[#0F2218] px-8 pt-8 pb-6 text-center">
              <img src={bonoriyaLogo} alt="BONORIYA" className="h-16 mx-auto mb-3 object-contain" />
              <p className="text-white/70 text-xs tracking-wide mb-4">
                Off-beat Tourism &bull; Prefab Cottages &bull; Northeast India
              </p>
              <div className="border-t border-white/20 pt-4">
                <p className="text-white font-bold text-sm tracking-widest uppercase mb-1">Digital Partner Agreement</p>
                <p className="text-white/60 text-xs">Terms &amp; Conditions for Partner Registration and Platform Listing</p>
              </div>
            </div>

            {/* Document Body */}
            <div className="px-8 py-6">

              {/* Document number / reference */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">Agreement Reference</p>
                  <p className="text-sm font-mono font-semibold text-gray-700">
                    BNR-AGR-{new Date(data.acceptedAt).getFullYear()}-{Math.random().toString(36).slice(2,8).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Document Date</p>
                  <p className="text-sm font-medium text-gray-700">{dateStr}</p>
                </div>
              </div>

              {/* Parties Section */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-3">Agreement Parties</p>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                  This Digital Partner Agreement ("Agreement") is entered into between:
                </p>

                {/* Party 1 */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#0F2218] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F2218]">BONORIYA</p>
                    <p className="text-xs text-gray-500">Hereinafter referred to as "BONORIYA", "Company", or "Platform"</p>
                    <p className="text-xs text-gray-500 mt-1">📧 info@bonoriya.com &nbsp;|&nbsp; 📞 +91-9864282966</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-green-200" />
                  <span className="text-xs font-semibold text-green-700">AND</span>
                  <div className="flex-1 h-px bg-green-200" />
                </div>

                {/* Party 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 flex-1">
                    <div>
                      <p className="text-xs text-gray-500">Partner Name</p>
                      <p className="text-sm font-semibold text-gray-800">{data.partnerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Business Name</p>
                      <p className="text-sm font-semibold text-gray-800">{data.businessName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm text-gray-700">{data.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Mobile</p>
                      <p className="text-sm text-gray-700">{data.mobile}</p>
                    </div>
                    {data.address && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm text-gray-700">{data.address}</p>
                      </div>
                    )}
                    {data.gstNumber && (
                      <div>
                        <p className="text-xs text-gray-500">GST Number</p>
                        <p className="text-sm font-mono text-gray-700">{data.gstNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                This Agreement governs the listing, promotion, booking, and management of properties, rooms, stays, homestays, resorts, eco-tourism units, day-trip venues, and hospitality services listed on BONORIYA platform.
              </p>

              {/* Clauses */}
              <div className="space-y-2 mb-6">
                {CLAUSES.map(clause => {
                  const isOpen = expandedClauses.has(clause.num);
                  return (
                    <div
                      key={clause.num}
                      className={`border rounded-lg overflow-hidden transition-all ${
                        clause.highlight
                          ? 'border-[#0F2218]/30 bg-[#0F2218]/5'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <button
                        onClick={() => toggleClause(clause.num)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            clause.highlight ? 'bg-[#0F2218] text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {clause.num}
                          </span>
                          <span className={`text-sm font-semibold ${clause.highlight ? 'text-[#0F2218]' : 'text-gray-800'}`}>
                            {clause.title}
                          </span>
                        </div>
                        {isOpen
                          ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        }
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1">
                          <div className="ml-9">
                            {clause.body.split('\n\n').map((para, i) => (
                              <p key={i} className="text-xs text-gray-600 leading-relaxed mb-2 last:mb-0 whitespace-pre-line">
                                {para}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Digital Acceptance Block */}
              <div className="bg-[#0F2218] rounded-xl p-6 text-white text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <p className="font-bold text-sm tracking-wide uppercase">Digital Acceptance Confirmed</p>
                </div>
                <p className="text-white/70 text-xs mb-4">
                  By registering on BONORIYA platform and checking the Terms &amp; Conditions box, the Partner has electronically accepted this Agreement.
                </p>
                <div className="grid grid-cols-2 gap-3 text-left mb-4">
                  <div className="bg-white/10 rounded-lg px-3 py-2">
                    <p className="text-white/50 text-xs mb-0.5">Partner Name</p>
                    <p className="text-white text-sm font-semibold">{data.partnerName}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg px-3 py-2">
                    <p className="text-white/50 text-xs mb-0.5">Business</p>
                    <p className="text-white text-sm font-semibold">{data.businessName}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg px-3 py-2">
                    <p className="text-white/50 text-xs mb-0.5">Email</p>
                    <p className="text-white text-xs">{data.email}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg px-3 py-2">
                    <p className="text-white/50 text-xs mb-0.5">Mobile</p>
                    <p className="text-white text-sm">{data.mobile}</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg px-4 py-2 flex items-center justify-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-white/60" />
                  <p className="text-white/80 text-xs">Accepted on: <strong className="text-white">{dateStr}</strong></p>
                </div>
                <p className="text-white/50 text-xs mt-3">
                  This Agreement becomes effective immediately upon digital acceptance. No physical signature required.
                </p>
              </div>

              {/* Security / Legal note */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
                <Shield className="h-5 w-5 text-[#0F2218] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Secure Digital Record</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    BONORIYA maintains a complete digital audit trail of this agreement acceptance including Partner name, email, mobile, date &amp; time of acceptance, IP address, and device details. This digital record has full legal validity under the Information Technology Act, 2000.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-4 text-center">
                <p className="text-xs text-gray-400 mb-1">
                  BONORIYA &nbsp;·&nbsp; info@bonoriya.com &nbsp;·&nbsp; +91-9864282966
                </p>
                <p className="text-xs text-gray-400">
                  This is a computer-generated document. This document is automatically emailed to the partner and admin@bonoriya.com upon successful registration.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Email delivery info panel ── */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <p className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4" /> This PDF is emailed automatically to:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-green-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Partner Email</p>
                <p className="text-xs text-gray-500">{data.email}</p>
                <p className="text-xs text-green-600 mt-0.5">✓ Welcome email + PDF download link</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3">
              <div className="w-8 h-8 bg-[#0F2218]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-[#0F2218]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">BONORIYA Admin</p>
                <p className="text-xs text-gray-500">admin@bonoriya.com</p>
                <p className="text-xs text-[#0F2218] mt-0.5">✓ Registration copy + PDF for records</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Download className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-xs text-gray-500">
              The PDF is also stored in <span className="font-mono bg-gray-100 px-1 rounded">bonoriya-assets/agreements/</span> on Supabase Storage for permanent record-keeping.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
