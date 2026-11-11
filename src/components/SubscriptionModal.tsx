import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Check, 
  Sparkles, 
  CreditCard, 
  Download, 
  ShieldCheck, 
  Zap, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export function SubscriptionModal({ isOpen, onClose, userEmail, userName }: SubscriptionModalProps) {
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'enterprise'>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [autoRenew, setAutoRenew] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadInvoice = () => {
    const invoiceContent = `=====================================================
AURA GLOBAL SKILL & LIFE COACH - OFFICIAL RECEIPT
=====================================================
Invoice Number: INV-2026-04-8921
Issue Date:     April 6, 2026
Billing Period: April 6, 2026 - May 6, 2026
Customer:       ${userName || 'Aura Member'}
Email:          ${userEmail || 'member@auracommunity.org'}
Payment Method: Visa ending in •••• 4242
Status:         PAID (Active)

-----------------------------------------------------
ITEM DESCRIPTION                         AMOUNT (USD)
-----------------------------------------------------
Aura Pro Subscription (Monthly)                $12.00
  - Gemini 3.8 Live Voice Conversations
  - Google Search Real-Time Grounding
  - Unlimited Micro-Lessons & Audio Transcribe
  - Priority Global Skill Exchange Matching

Subtotal:                                      $12.00
VAT / Taxes (0%):                               $0.00
-----------------------------------------------------
TOTAL PAID:                                    $12.00
=====================================================
Thank you for learning and teaching with Aura!
Support: billing@auracoach.app
`;

    const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Aura_Receipt_INV-2026-04.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setActionNotice('Invoice downloaded successfully.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSwitchPlan = (plan: 'free' | 'pro' | 'enterprise') => {
    setCurrentPlan(plan);
    setActionNotice(`Switched plan to Aura ${plan.charAt(0).toUpperCase() + plan.slice(1)}! Changes will reflect on your next cycle.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleAutoRenew = () => {
    const nextVal = !autoRenew;
    setAutoRenew(nextVal);
    setActionNotice(nextVal ? 'Auto-renewal enabled for next cycle.' : 'Auto-renewal paused. Access remains active until period ends.');
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 md:p-8 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-indigo-200">
              <Sparkles size={14} /> Subscription & Membership
            </div>
            <h3 className="text-2xl font-display font-bold">Manage Aura Plan</h3>
            <p className="text-xs text-indigo-200 max-w-md">
              Upgrade your learning journey with unlimited AI voice coaching, real-time Google search data, and priority mentor exchanges.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {actionNotice && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2"
            >
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>{actionNotice}</span>
            </motion.div>
          )}

          {/* Current Membership Status Card */}
          <div className="p-5 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-zinc-400">Current Plan</span>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {currentPlan.toUpperCase()}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  {autoRenew ? 'Auto-Renew Active' : 'Expiring'}
                </span>
              </div>
              <p className="text-lg font-bold text-zinc-900">
                {currentPlan === 'pro' ? '$12.00 / month' : currentPlan === 'enterprise' ? '$29.00 / month' : 'Free Forever'}
              </p>
              <div className="flex items-center gap-3 text-xs text-zinc-500 pt-1">
                <span className="flex items-center gap-1"><Calendar size={13} /> Renews May 6, 2026</span>
                <span>•</span>
                <span className="flex items-center gap-1"><CreditCard size={13} /> Visa •••• 4242</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleDownloadInvoice}
              className="px-4 py-2.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-zinc-50 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download size={14} className="text-zinc-500" /> Download Invoice
            </button>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <span className={cn("text-xs font-bold", billingCycle === 'monthly' ? "text-zinc-900" : "text-zinc-400")}>
              Monthly Billing
            </span>
            <button 
              type="button"
              onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative cursor-pointer",
                billingCycle === 'annual' ? "bg-indigo-600" : "bg-zinc-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                billingCycle === 'annual' ? "left-7" : "left-1"
              )} />
            </button>
            <span className={cn("text-xs font-bold flex items-center gap-1.5", billingCycle === 'annual' ? "text-indigo-600" : "text-zinc-400")}>
              Annual Billing <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Save 20%</span>
            </span>
          </div>

          {/* Plan Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Free */}
            <div className={cn(
              "p-4 rounded-2xl border transition-all flex flex-col justify-between",
              currentPlan === 'free' 
                ? "border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/20" 
                : "border-zinc-200 bg-white hover:border-zinc-300"
            )}>
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-zinc-900">Starter</h4>
                <p className="text-xl font-bold">$0</p>
                <p className="text-[11px] text-zinc-500">Essential peer skills exchange and community access.</p>
                <ul className="text-xs space-y-1.5 pt-2 text-zinc-600">
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Basic AI Coach</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> 3 Micro-Lessons / Day</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Skill Exchange Profile</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchPlan('free')}
                disabled={currentPlan === 'free'}
                className={cn(
                  "mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  currentPlan === 'free'
                    ? "bg-zinc-100 text-zinc-400 cursor-default"
                    : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                )}
              >
                {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
              </button>
            </div>

            {/* Pro */}
            <div className={cn(
              "p-4 rounded-2xl border transition-all flex flex-col justify-between relative",
              currentPlan === 'pro' 
                ? "border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md" 
                : "border-zinc-200 bg-white hover:border-zinc-300"
            )}>
              <div className="absolute -top-2.5 right-3 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Popular
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-1">
                  Pro <Sparkles size={14} className="text-indigo-600" />
                </h4>
                <p className="text-xl font-bold">
                  {billingCycle === 'monthly' ? '$12' : '$9.99'}
                  <span className="text-xs font-normal text-zinc-500">/mo</span>
                </p>
                <p className="text-[11px] text-zinc-500">Full generative suite for serious self-learners.</p>
                <ul className="text-xs space-y-1.5 pt-2 text-zinc-600">
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Gemini 3.8 Live Voice</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Google Search Grounding</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Unlimited Micro-Lessons</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> AI Cover Illustrations</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchPlan('pro')}
                disabled={currentPlan === 'pro'}
                className={cn(
                  "mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  currentPlan === 'pro'
                    ? "bg-indigo-600 text-white cursor-default"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                )}
              >
                {currentPlan === 'pro' ? 'Current Plan' : 'Select Pro'}
              </button>
            </div>

            {/* Enterprise Mentor */}
            <div className={cn(
              "p-4 rounded-2xl border transition-all flex flex-col justify-between",
              currentPlan === 'enterprise' 
                ? "border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/20" 
                : "border-zinc-200 bg-white hover:border-zinc-300"
            )}>
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-zinc-900">Mentor Elite</h4>
                <p className="text-xl font-bold">
                  {billingCycle === 'monthly' ? '$29' : '$24'}
                  <span className="text-xs font-normal text-zinc-500">/mo</span>
                </p>
                <p className="text-[11px] text-zinc-500">Custom branded courses and priority matching.</p>
                <ul className="text-xs space-y-1.5 pt-2 text-zinc-600">
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Verified Mentor Badge</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Priority Match Placement</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Dedicated Coach Context</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Unlimited Audio Transcription</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchPlan('enterprise')}
                disabled={currentPlan === 'enterprise'}
                className={cn(
                  "mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  currentPlan === 'enterprise'
                    ? "bg-indigo-600 text-white cursor-default"
                    : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                )}
              >
                {currentPlan === 'enterprise' ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          </div>

          {/* Auto-Renew & Security footer */}
          <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleAutoRenew}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer",
                  autoRenew 
                    ? "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100" 
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
              >
                {autoRenew ? 'Pause Auto-Renew' : 'Resume Auto-Renew'}
              </button>
              <span className="text-zinc-400">Cancel or switch plans anytime.</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors cursor-pointer w-full sm:w-auto text-center"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
