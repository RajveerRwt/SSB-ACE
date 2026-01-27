
import React from 'react';
import { FileText, Shield, CreditCard, ArrowLeft } from 'lucide-react';
import { TestType } from '../types';

interface LegalPageProps {
  type: TestType;
  onBack: () => void;
}

const LegalPages: React.FC<LegalPageProps> = ({ type, onBack }) => {
  const renderContent = () => {
    switch (type) {
      case TestType.TERMS:
        return (
          <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
            <h3 className="text-xl font-black uppercase text-slate-900">Terms & Conditions</h3>
            <p className="italic text-xs text-slate-400">Last Updated: January 2026</p>
            
            {/* OFFICIAL DISCLAIMER SECTION */}
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl mb-8">
                <h4 className="font-black text-red-700 uppercase text-xs mb-3 tracking-widest">Official Disclaimer</h4>
                <p className="text-red-900/80 font-medium mb-3">
                    This website (SSBPREP.ONLINE) is a private educational platform and is <strong>NOT associated, affiliated, authorized, endorsed by, or in any way officially connected</strong> with the Indian Army, Indian Air Force, Indian Navy, Ministry of Defence, or any other Government agency.
                </p>
                <p className="text-red-900/80 font-medium">
                    The AI personas <strong>"Major Veer"</strong> (AI Guide) and <strong>"Col. Arjun Singh"</strong> (AI Interviewer) are purely fictional characters created solely for the purpose of providing a realistic simulation environment. They bear no relation to any real persons, living or dead. All assessments are AI-generated estimates for practice purposes only.
                </p>
            </div>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">1. Acceptance of Terms</h4>
              <p>By accessing and using SSBPREP.ONLINE ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">2. Educational Purpose</h4>
              <p>This Platform is a simulation and training tool designed for SSB aspirants. The assessments (PPDT, TAT, Interview) are AI-generated estimates and do not guarantee selection in the actual Services Selection Board.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">3. User Accounts</h4>
              <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">4. Intellectual Property</h4>
              <p>All content, including AI models, logos (SSBPREP), and training materials, are the property of the Platform owner and protected by copyright laws.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">5. Limitation of Liability</h4>
              <p>In no event shall the Platform owners be liable for any damages (including, without limitation, damages for loss of data or profit) arising out of the use or inability to use the materials on the Platform.</p>
            </section>
          </div>
        );

      case TestType.PRIVACY:
        return (
          <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
            <h3 className="text-xl font-black uppercase text-slate-900">Privacy Policy</h3>
            <p className="italic text-xs text-slate-400">Last Updated: January 2026</p>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">1. Information We Collect</h4>
              <p>We collect information you provide directly to us, such as your name, email address, and PIQ (Personal Information Questionnaire) details. We also collect audio data during AI Interviews for the purpose of generating feedback.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">2. How We Use Information</h4>
              <p>We use the information to:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Provide, maintain, and improve our services.</li>
                  <li>Generate personalized AI feedback for your tests.</li>
                  <li>Process transactions and send related information.</li>
                </ul>
              </p>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">3. Data Security</h4>
              <p>We implement appropriate security measures to protect your personal information. Audio recordings from interviews are processed in real-time and are not permanently stored on our public servers unless explicitly saved by you.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">4. Third-Party Services</h4>
              <p>We use third-party services like Razorpay for payment processing and Supabase/Google Cloud for data hosting. These parties have their own privacy policies regarding how they handle your data.</p>
            </section>
          </div>
        );

      case TestType.REFUND:
        return (
          <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
            <h3 className="text-xl font-black uppercase text-slate-900">Cancellation & Refund Policy</h3>
            <p className="italic text-xs text-slate-400">Last Updated: January 2026</p>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">1. Digital Services</h4>
              <p>SSBPREP.ONLINE provides instant access to digital training tools (AI Interview, Psychology Tests). Due to the nature of digital content, all sales are considered final once the service is activated.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">2. No Refunds</h4>
              <p>We do not offer refunds for "Pro Subscriptions" or "Add-on Packs" once the payment is successfully processed and the credits have been added to your account.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">3. Failed Transactions</h4>
              <p>In case of a failed transaction where money has been deducted from your account but credits were not assigned, the amount will be automatically refunded to your source account within 5-7 business days by our payment gateway partner (Razorpay).</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">4. Contact for Issues</h4>
              <p>If you face any technical issues preventing you from using the service you purchased, please contact us at <strong>contact.ssbprep@gmail.com</strong> within 24 hours of purchase.</p>
            </section>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getHeader = () => {
    switch (type) {
      case TestType.TERMS: return { icon: FileText, title: 'Terms of Service', color: 'text-blue-600', bg: 'bg-blue-50' };
      case TestType.PRIVACY: return { icon: Shield, title: 'Privacy Policy', color: 'text-green-600', bg: 'bg-green-50' };
      case TestType.REFUND: return { icon: CreditCard, title: 'Refund Policy', color: 'text-purple-600', bg: 'bg-purple-50' };
      default: return { icon: FileText, title: 'Legal', color: 'text-slate-600', bg: 'bg-slate-50' };
    }
  };

  const header = getHeader();
  const Icon = header.icon;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4">
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase text-xs tracking-widest"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className={`p-8 md:p-12 ${header.bg} flex items-center gap-6 border-b border-slate-100`}>
           <div className={`w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm ${header.color}`}>
             <Icon size={32} />
           </div>
           <div>
             <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900">{header.title}</h1>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Legal Compliance & Information</p>
           </div>
        </div>
        
        <div className="p-8 md:p-12">
          {renderContent()}
        </div>

        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             Questions? Contact us at contact.ssbprep@gmail.com
           </p>
        </div>
      </div>
    </div>
  );
};

export default LegalPages;
