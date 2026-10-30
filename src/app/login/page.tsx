'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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
        }
      }
    }
    checkAuth();
  }, [router]);

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setResetSent(false);

    if (!email.trim()) {
      setEmailError('Masukkan email Anda untuk reset password');
      return;
    }
    setEmailError(null);
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setErrorMsg('Konfigurasi Supabase belum diatur.');
      setLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setErrorMsg(error.message || 'Gagal mengirim email reset password.');
      setLoading(false);
      return;
    }

    setResetSent(true);
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

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

    if (!supabase) {
      setErrorMsg('Konfigurasi Supabase belum diatur.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data?.session) {
      setErrorMsg('Email atau password salah. Periksa kembali akun Anda.');
      setLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('alineas_admin_auth', 'authenticated');
      sessionStorage.setItem('alineas_admin_email', email.trim());
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

        {/* Headline & Subtitle */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tighter mb-2">
            {isForgotMode ? 'Lupa Password' : 'Welcome Back'}
          </h1>
          <p className="text-sm text-slate-600 leading-snug max-w-xs mx-auto">
            {isForgotMode ? (
              'Masukkan email akun Anda untuk menerima link pengaturan ulang password'
            ) : (
              <>
                Login to dashboard photobooth
                <br />
                voucher system
              </>
            )}
          </p>
        </div>

        {isForgotMode ? (
          <form onSubmit={handleForgotPassword} noValidate className="w-full space-y-4">
            <div>
              <div className="relative rounded-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
                <input
                  type="email"
                  placeholder="Email terdaftar"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  className={`w-full h-14 bg-white border ${
                    emailError
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

            {resetSent && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Link ganti password sudah dikirim ke <strong>{email}</strong>. Silakan cek kotak
                  masuk atau folder Spam email Anda.
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-[#D30000] hover:bg-[#b80000] active:bg-[#9e0000] text-white font-bold text-base rounded-full active:scale-[0.99] transition-all flex items-center justify-center shadow-xs"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mengirim...</span>
                  </div>
                ) : (
                  'Kirim Link Reset Password'
                )}
              </button>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setErrorMsg(null);
                  setEmailError(null);
                  setResetSent(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#D30000] font-semibold transition-colors py-2 px-3"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Login</span>
              </button>
            </div>
          </form>
        ) : (
          /* Login Form */
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
                  className={`w-full h-14 bg-white border ${
                    emailError
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
                  className={`w-full h-14 bg-white border ${
                    passwordError
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
                onClick={() => {
                  setIsForgotMode(true);
                  setErrorMsg(null);
                  setEmailError(null);
                  setPasswordError(null);
                  setResetSent(false);
                }}
                className="text-xs text-slate-600 hover:text-[#D30000] font-medium transition-colors"
              >
                Lupa password?
              </button>
            </div>

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
        )}
      </div>
    </div>
  );
}
