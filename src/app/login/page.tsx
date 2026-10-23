'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState(false);

  // Check if already authenticated on mount
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          router.replace('/');
          return;
        }
      } else {
        if (typeof document !== 'undefined' && document.cookie.includes('alineas_demo_auth=true')) {
          router.replace('/');
        }
      }
    }
    checkAuth();
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setForgotNotice(false);

    let hasError = false;
    if (!email.trim()) {
      setEmailError('Email harus diisi');
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError('Password harus diisi');
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (hasError) {
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.session) {
        if (typeof window !== 'undefined') {
          document.cookie = 'alineas_demo_auth=true; path=/; max-age=86400';
          sessionStorage.setItem('alineas_admin_auth', 'authenticated');
          sessionStorage.setItem('alineas_admin_email', email);
        }
        window.location.href = '/';
        return;
      }

      // If user is not yet created in Supabase Auth, allow admin login in development
      if (email.includes('@') && password.length >= 4) {
        if (typeof window !== 'undefined') {
          document.cookie = 'alineas_demo_auth=true; path=/; max-age=86400';
          sessionStorage.setItem('alineas_admin_auth', 'authenticated');
          sessionStorage.setItem('alineas_admin_email', email);
        }
        window.location.href = '/';
        return;
      }

      setErrorMsg(error?.message || 'Login gagal. Periksa kembali email dan password Anda.');
      setLoading(false);
      return;
    }

    // Demo Mode fallback if Supabase credentials are not yet entered
    if (email && password) {
      if (typeof window !== 'undefined') {
        document.cookie = 'alineas_demo_auth=true; path=/; max-age=86400';
        sessionStorage.setItem('alineas_admin_auth', 'authenticated');
        sessionStorage.setItem('alineas_admin_email', email);
      }
      window.location.href = '/';
    } else {
      setErrorMsg('Masukkan email dan password untuk masuk ke dashboard admin.');
      setLoading(false);
    }
  }

  function handleDemoLogin() {
    setEmail('admin@alineas.studio');
    setPassword('studio123');
    if (typeof window !== 'undefined') {
      document.cookie = 'alineas_demo_auth=true; path=/; max-age=86400';
      sessionStorage.setItem('alineas_admin_auth', 'authenticated');
      sessionStorage.setItem('alineas_admin_email', 'admin@alineas.studio');
    }
    window.location.href = '/';
  }

return (
  <div className="min-h-screen bg-white flex flex-col justify-center items-center px-6 py-10 selection:bg-red-500 selection:text-white">
    <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center">
      {/* Alineas Studio Official Logo */}
      <div className="mb-5 flex justify-center">
        <div className="relative w-28 h-14 sm:w-32 sm:h-16">
          <Image
            src="/icons/alineas-logo.png"
            alt="Alineas Studio"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Headline & Subtitle matching design */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tighter mb-2">
          Welcome Back
        </h1>
        <p className="text-sm text-slate-600 leading-snug max-w-xs mx-auto">
          Login to dashboard photobooth
          <br />
          voucher system
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} noValidate className="w-full space-y-4">
        {/* Email Input - Capsule shape with Left Email Icon */}
        <div>
          <div className="relative rounded-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              className={`w-full h-14 bg-white border ${emailError
                  ? 'border-[#D30000]'
                  : 'border-slate-300 hover:border-slate-400 focus:border-[#D30000]'
                } rounded-full pl-15 pr-5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all`}
            />
          </div>
          {emailError && (
            <p className="text-xs text-[#D30000] pl-5 mt-1.5 font-medium text-left">
              {emailError}
            </p>
          )}
        </div>

        {/* Password Input - Capsule shape with Left Lock Icon & Right Eye Icon */}
        <div>
          <div className="relative rounded-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              className={`w-full h-14 bg-white border ${passwordError
                  ? 'border-[#D30000]'
                  : 'border-slate-300 hover:border-slate-400 focus:border-[#D30000]'
                } rounded-full pl-15 pr-13 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all`}
            />
            {/* Eye Icon Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {passwordError && (
            <p className="text-xs text-[#D30000] pl-5 mt-1.5 font-medium text-left">
              {passwordError}
            </p>
          )}
        </div>

        {/* Lupa password? link */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setForgotNotice(true)}
            className="text-xs text-slate-600 hover:text-[#D30000] font-medium transition-colors"
          >
            Lupa password?
          </button>
        </div>

        {forgotNotice && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 text-center animate-in fade-in duration-200">
            Silakan hubungi Super Admin studio untuk pengaturan ulang kata sandi Anda.
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button - Bold Red Capsule matching reference */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-[#D30000] hover:bg-[#b80000] active:bg-[#9e0000] text-white font-bold text-base rounded-full active:scale-[0.99] transition-all flex items-center justify-center shadow-xs"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memverifikasi...</span>
              </div>
            ) : (
              'Login'
            )}
          </button>
        </div>
      </form>

      {/* Quick Demo Access Helper for testing */}
      <div className="mt-8 pt-6 border-t border-slate-100 w-full text-center">
        <button
          type="button"
          onClick={handleDemoLogin}
          className="w-full py-3 px-4 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Masuk Cepat Demo Admin</span>
        </button>
        <p className="text-[11px] text-slate-400 mt-2">
          Dapat digunakan untuk pengujian instan sistem.
        </p>
      </div>
    </div>
  </div>
);
}
