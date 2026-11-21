'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  ShieldCheck,
  UserPlus,
  LogIn,
  CheckCircle,
  Smartphone,
  CreditCard,
  Building,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { loginAsDemoAdmin, loginAsDemoMarketer, registerMarketer, signInWithGoogle } = useAuth();
  const { locale } = useLanguage();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'vodafone_cash' | 'instapay' | 'bank_transfer'>('vodafone_cash');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setLoading(true);
    try {
      await registerMarketer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || `${phone.trim()}@affiliate.com`,
        whatsapp: phone.trim(),
        payoutMethod,
        payoutAccount: payoutAccount.trim() || phone.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/affiliate');
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl w-full max-w-md p-6 sm:p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img
              src="/ctrl-logo-light.png"
              alt="Ctrl YZ"
              className="h-10 w-auto object-contain"
            />
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            {mode === 'register' ? 'انضم كمسوق في Ctrl YZ' : 'تسجيل الدخول للمنصة'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            ابدأ البيع بدون رأس مال واحصل على عمولات يومية
          </p>
        </div>

        {/* Toggle Mode Tabs */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl mb-6 text-xs font-black">
          <button
            onClick={() => setMode('register')}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            مسوق جديد (تسجيل مجاني)
          </button>
          <button
            onClick={() => setMode('login')}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            تسجيل الدخول السريع
          </button>
        </div>

        {success ? (
          <div className="p-6 bg-emerald-50 rounded-2xl text-center space-y-2 border border-emerald-200">
            <CheckCircle size={40} className="text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-emerald-900">تم تسجيل حسابك بنجاح!</h4>
            <p className="text-xs text-emerald-700">جاري نقلك إلى لوحة تحكم المسوق...</p>
          </div>
        ) : mode === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4 text-xs font-bold text-gray-700">
            <div>
              <label className="block mb-1">الاسم الكامل *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="محمد عادل الشريف"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-normal focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block mb-1">رقم الهاتف (الواتساب) *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block mb-1">البريد الإلكتروني (اختياري)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marketer@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-normal focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block mb-1">طريقة استلام أرباحك المفضلة</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('vodafone_cash')}
                  className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 ${
                    payoutMethod === 'vodafone_cash' ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <Smartphone size={16} />
                  <span>فودافون كاش</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('instapay')}
                  className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 ${
                    payoutMethod === 'instapay' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <CreditCard size={16} />
                  <span>انستاباي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank_transfer')}
                  className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 ${
                    payoutMethod === 'bank_transfer' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <Building size={16} />
                  <span>تحويل بنكي</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-1">رقم المحفظة أو عنوان انستاباي</label>
              <input
                type="text"
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-all mt-4"
            >
              {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب المسوق والبدء الآن'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
              اختر أحد الحسابات التجريبية للدخول المباشر:
            </p>

            <button
              onClick={() => {
                loginAsDemoMarketer('marketer-001');
                router.push('/affiliate');
              }}
              className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 text-right flex items-center justify-between transition-colors group"
            >
              <div>
                <span className="font-bold text-sm text-gray-900 block group-hover:text-emerald-800">
                  أحمد عادل (أعلى مسوق مبيعاً)
                </span>
                <span className="text-[11px] text-gray-400">كود الإحالة: AHMED-YZ • رصيد: 2,450 ج.م</span>
              </div>
              <TrendingUp size={20} className="text-emerald-600" />
            </button>

            <button
              onClick={() => {
                loginAsDemoMarketer('marketer-002');
                router.push('/affiliate');
              }}
              className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 text-right flex items-center justify-between transition-colors group"
            >
              <div>
                <span className="font-bold text-sm text-gray-900 block group-hover:text-emerald-800">
                  سارة محمود (مسوقة إنستغرام)
                </span>
                <span className="text-[11px] text-gray-400">كود الإحالة: SARAH-SHOP • رصيد: 1,680 ج.م</span>
              </div>
              <TrendingUp size={20} className="text-emerald-600" />
            </button>

            <button
              onClick={() => {
                loginAsDemoAdmin();
                router.push('/admin');
              }}
              className="w-full p-4 rounded-2xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-right flex items-center justify-between transition-colors"
            >
              <div>
                <span className="font-bold text-sm text-purple-900 block">
                  دخول كأدمن المنصة (Master Admin)
                </span>
                <span className="text-[11px] text-purple-600">صلاحيات كاملة للمنتجات، الشحن، والتحويلات</span>
              </div>
              <ShieldCheck size={20} className="text-purple-600" />
            </button>

            <div className="pt-2">
              <button
                onClick={async () => {
                  await signInWithGoogle();
                  router.push('/affiliate');
                }}
                className="w-full py-3 bg-white border border-gray-300 rounded-2xl font-bold text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
              >
                <span>تسجيل الدخول بواسطة Google (Firebase)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
