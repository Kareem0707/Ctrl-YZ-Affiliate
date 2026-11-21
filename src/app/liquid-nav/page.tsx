'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Smartphone,
  Sparkles,
  Palette,
  Eye,
  Check,
  Code2,
  Layers,
  ArrowRightLeft,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import LiquidBottomNav, { NavItem } from '@/components/navigation/LiquidBottomNav';

export default function LiquidNavShowcasePage() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isRTL, setIsRTL] = useState<boolean>(false);
  const [showIndicator, setShowIndicator] = useState<boolean>(true);
  const [backgroundType, setBackgroundType] = useState<'gradient' | 'cards' | 'dark' | 'store'>('gradient');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Color schemes
  const colorPresets = [
    { name: 'Electric Indigo (Default)', primary: '#4324E8', soft: '#B8A9FA' },
    { name: 'Ctrl YZ Blue', primary: '#0258ED', soft: '#DBEAFE' },
    { name: 'Refined Orange', primary: '#EA580C', soft: '#FED7AA' },
    { name: 'Emerald Fintech', primary: '#059669', soft: '#A7F3D0' },
    { name: 'Obsidian Ink', primary: '#18181B', soft: '#E4E4E7' },
  ];
  const [selectedPreset, setSelectedPreset] = useState(colorPresets[0]);

  // Tab definitions
  const englishTabs: NavItem[] = [
    { id: 'home', label: 'Home', iconName: 'home' },
    { id: 'cards', label: 'Cards', iconName: 'cards' },
    { id: 'add-funds', label: 'Add Funds', iconName: 'add-funds' },
    { id: 'transaction', label: 'Transaction', iconName: 'transaction' },
    { id: 'profile', label: 'Profile', iconName: 'profile' },
  ];

  const arabicTabs: NavItem[] = [
    { id: 'home', label: 'الرئيسية', iconName: 'home' },
    { id: 'cards', label: 'البطاقات', iconName: 'cards' },
    { id: 'add-funds', label: 'شحن رصيد', iconName: 'add-funds' },
    { id: 'transaction', label: 'المعاملات', iconName: 'transaction' },
    { id: 'profile', label: 'حسابي', iconName: 'profile' },
  ];

  const activeTabsList = isRTL ? arabicTabs : englishTabs;

  const sampleTransactions = [
    { title: 'Spotify Premium', date: 'Today, 2:45 PM', amount: '-$9.99', type: 'debit' },
    { title: 'Affiliate Commission (Ctrl YZ)', date: 'Today, 11:20 AM', amount: '+$340.00', type: 'credit' },
    { title: 'Apple Store Purchase', date: 'Yesterday', amount: '-$1,299.00', type: 'debit' },
    { title: 'Stripe Payout Ref #892', date: '2 days ago', amount: '+$842.50', type: 'credit' },
    { title: 'Starbucks Coffee', date: '3 days ago', amount: '-$5.40', type: 'debit' },
  ];

  const codeSnippet = `import LiquidBottomNav from '@/components/navigation/LiquidBottomNav';

export default function MobileScreen() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="relative min-h-screen bg-neutral-900 pb-28">
      {/* Scrollable Page Content */}
      <main className="p-4 space-y-4">
        {/* Your cards, lists, charts */}
      </main>

      {/* Floating Concave Liquid Navigation */}
      <LiquidBottomNav
        activeTab={activeTab}
        onChange={setActiveTab}
        primaryColor="${selectedPreset.primary}"
        softFillColor="${selectedPreset.soft}"
        isRTL={${isRTL}}
        showHomeIndicator={${showIndicator}}
      />
    </div>
  );
}`;

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans">
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition"
            >
              <ArrowLeft size={14} />
              Back to Storefront
            </Link>
            <div className="h-4 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-sm font-bold tracking-tight text-white">
                Liquid Mobile Bottom Navigation
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                True Concave Cutout
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRTL(!isRTL)}
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <ArrowRightLeft size={13} />
              <span>Direction: <strong className="text-white">{isRTL ? 'RTL (العربية)' : 'LTR (English)'}</strong></span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Showcase Layout */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Center Column: Mobile Device Simulator */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <div className="w-full max-w-[420px]">
            {/* Phone Bezel */}
            <div className="relative rounded-[48px] p-3.5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border-4 border-slate-700/60 ring-1 ring-white/10">
              {/* Phone Screen Container */}
              <div
                className={`relative rounded-[38px] overflow-hidden w-full h-[760px] flex flex-col transition-colors duration-300 ${
                  backgroundType === 'gradient'
                    ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950'
                    : backgroundType === 'cards'
                    ? 'bg-[#090D16]'
                    : backgroundType === 'dark'
                    ? 'bg-neutral-950'
                    : 'bg-[#F4F4F5]'
                }`}
              >
                {/* Phone Speaker & Dynamic Island / Status Bar */}
                <div className="pt-3 px-6 flex items-center justify-between text-[11px] font-semibold text-white/70 select-none z-30">
                  <span>9:41</span>
                  <div className="w-24 h-4 bg-black rounded-full" />
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <div className="w-4 h-2.5 border border-white/70 rounded-[2px] p-[1px] flex items-center">
                      <div className="h-full w-full bg-white/90 rounded-[1px]" />
                    </div>
                  </div>
                </div>

                {/* Proof of True Concave Notch: Floating Backing Badge */}
                <div className="px-5 pt-3 pb-1 z-20">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[11px] text-white/90">
                    <Sparkles size={12} className="text-amber-400" />
                    <span>Watch content glide behind the concave cutout!</span>
                  </div>
                </div>

                {/* Scrollable Viewport Content */}
                <div
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className="flex-1 overflow-y-auto px-4 pt-2 pb-28 space-y-4 text-left scrollbar-thin scrollbar-thumb-white/10"
                >
                  {/* Account / Header Card */}
                  <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {isRTL ? 'إجمالي الرصيد المتاح' : 'Total Available Balance'}
                        </p>
                        <h2 className="text-2xl font-bold font-mono tracking-tight text-white mt-0.5">
                          $14,850.40
                        </h2>
                      </div>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
                        style={{ backgroundColor: selectedPreset.primary }}
                      >
                        YZ
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] text-slate-400 block">{isRTL ? 'الأرباح المعلقة' : 'Pending'}</span>
                        <span className="font-semibold text-amber-400 font-mono">+$1,420.00</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] text-slate-400 block">{isRTL ? 'التحويل التالي' : 'Next Payout'}</span>
                        <span className="font-semibold text-emerald-400 font-mono">Nov 28</span>
                      </div>
                    </div>
                  </div>

                  {/* Vibrant Colorful Swatch Banner (To visibly prove transparency through the notch gap) */}
                  <div className="relative rounded-2xl p-4 overflow-hidden shadow-lg border border-white/15 bg-gradient-to-r from-rose-500 via-fuchsia-600 to-indigo-600 text-white">
                    <div className="relative z-10">
                      <span className="text-[10px] font-mono uppercase bg-black/30 px-2 py-0.5 rounded font-bold">
                        Ultra High Contrast
                      </span>
                      <h3 className="text-base font-bold mt-1.5">
                        {isRTL ? 'اختبار الشفافية الحقيقية' : 'True Concave Transparency'}
                      </h3>
                      <p className="text-[11px] text-white/90 mt-1 leading-relaxed">
                        Notice how vibrant background colors and patterns shine through the 8px notch gap without artificial white border tricks.
                      </p>
                    </div>
                  </div>

                  {/* Quick Action Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {['Send', 'Request', 'Top Up'].map((action, i) => (
                      <button
                        key={action}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition"
                      >
                        <div
                          className="w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1.5 text-xs font-bold"
                          style={{ backgroundColor: `${selectedPreset.primary}33`, color: selectedPreset.soft }}
                        >
                          {i === 0 ? '↑' : i === 1 ? '↓' : '+'}
                        </div>
                        <span className="text-[11px] font-medium text-slate-200">{action}</span>
                      </button>
                    ))}
                  </div>

                  {/* Transactions List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                      <span>{isRTL ? 'أحدث العمليات' : 'Recent Activity'}</span>
                      <span className="text-[11px] text-indigo-400 cursor-pointer">{isRTL ? 'عرض الكل' : 'View All'}</span>
                    </div>

                    {sampleTransactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs text-white"
                      >
                        <div>
                          <p className="font-semibold">{tx.title}</p>
                          <p className="text-[10px] text-slate-400">{tx.date}</p>
                        </div>
                        <span
                          className={`font-mono font-bold ${
                            tx.type === 'credit' ? 'text-emerald-400' : 'text-slate-200'
                          }`}
                        >
                          {tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Extra bottom padding spacer */}
                  <div className="h-10" />
                </div>

                {/* THE FLOATING LIQUID BOTTOM NAVIGATION BAR */}
                <LiquidBottomNav
                  items={activeTabsList}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                  primaryColor={selectedPreset.primary}
                  softFillColor={selectedPreset.soft}
                  isRTL={isRTL}
                  showHomeIndicator={showIndicator}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Configuration & Specs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Active State & Controls */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders size={18} className="text-indigo-400" />
                Interactive Customizer
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Tab: <strong className="text-white uppercase">{activeTab}</strong>
              </span>
            </div>

            {/* Direct Tab Switchers */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Select Active Tab (Simulate Click)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {activeTabsList.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium text-center transition border ${
                      activeTab === t.id
                        ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Palette Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block flex items-center gap-1.5">
                <Palette size={14} className="text-indigo-400" />
                Brand Color Presets
              </label>
              <div className="space-y-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setSelectedPreset(preset)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                      selectedPreset.name === preset.name
                        ? 'bg-slate-800 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center -space-x-1.5">
                        <span
                          className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span
                          className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: preset.soft }}
                        />
                      </div>
                      <span className="font-medium">{preset.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                      {preset.primary}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Background Environment Switcher */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-400" />
                Background Test Environment
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'gradient', label: 'Vibrant Mesh' },
                  { id: 'cards', label: 'Fintech Dark' },
                  { id: 'dark', label: 'OLED Black' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setBackgroundType(bg.id as any)}
                    className={`p-2 rounded-lg text-xs font-medium border text-center transition ${
                      backgroundType === bg.id
                        ? 'bg-slate-800 text-white border-indigo-500'
                        : 'bg-slate-800/40 text-slate-400 border-slate-700'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Switch: Home Indicator */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Mobile Indicator Pill</p>
                <p className="text-[11px] text-slate-400">Subtle centered home bar at bottom</p>
              </div>
              <button
                onClick={() => setShowIndicator(!showIndicator)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  showIndicator ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    showIndicator ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Card: Engineering Highlights */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers size={16} className="text-indigo-400" />
              Architecture & Physics Specs
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <p className="font-semibold text-white mb-0.5">1. True Transparent SVG Cutout Mask</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  No pseudo-borders or background color matching. Uses an SVG <code className="text-indigo-300">mask</code> with a base <code className="text-indigo-300">rx=22</code> rect and an animated cutout path.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <p className="font-semibold text-white mb-0.5">2. Mathematical $C^1$ Smoothness</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  The concave notch features a uniform 8px concentric gap around the 56px circle, with continuous outward fillets that flatten out seamlessly to the top edge.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <p className="font-semibold text-white mb-0.5">3. Edge Tab Tolerance (Tab 1 & Tab 5)</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Because the cutout is masked against the base rounded card, when Tab 1 (Home) or Tab 5 (Profile) is active, the notch never distorts or clips the card's 22px corner radius.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <p className="font-semibold text-white mb-0.5">4. Dynamic ResizeObserver Physics</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Tab centers are measured via <code className="text-indigo-300">getBoundingClientRect()</code>, ensuring lockstep synchronization on any screen size from 320px to 428px.
                </p>
              </div>
            </div>
          </div>

          {/* Card: React Code Snippet */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 size={16} className="text-indigo-400" />
                Quick Integration
              </h3>
              <button
                onClick={copyCodeToClipboard}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                {copiedCode ? <Check size={13} className="text-emerald-400" /> : null}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
              {codeSnippet}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
