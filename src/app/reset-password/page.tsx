'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setErrorMsg('Konfigurasi Supabase belum diatur.');
      setVerifyingSession(false);
      return;
    }

    async function verifyRecoverySession() {
      if (!supabase) return;

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const tokenHash = params.get('token_hash');
      const type = params.get('type');

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (tokenHash && type === 'recovery') {
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMsg(
          'Sesi reset password tidak ditemukan atau sudah kedaluwarsa. Silakan minta link reset baru dari halaman login.'
        );
      }
      setVerifyingSession(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setErrorMsg(null);
        setVerifyingSession(false);
      }
    });

    verifyRecoverySession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    let hasError = false;
    if (!password || password.length < 6) {
      setPasswordError('Password baru minimal 6 karakter');
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (confirmPassword !== password) {
      setConfirmError('Konfirmasi password tidak cocok');
      hasError = true;
    } else {
      setConfirmError(null);
    }

    if (hasError) return;

    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setErrorMsg('Konfigurasi Supabase belum diatur.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMsg(error.message || 'Gagal memperbarui password. Silakan coba lagi.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => {
      router.replace('/');
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-6 py-10 selection:bg-red-500 selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center">
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

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tighter mb-2">
            Password Baru
          </h1>
          <p className="text-sm text-slate-600 leading-snug max-w-xs mx-auto">
            Masukkan password baru untuk akun dashboard admin Anda
          </p>
        </div>

        {verifyingSession ? (
          <div className="py-8 flex flex-col items-center gap-3 text-sm text-slate-600">
            <div className="w-6 h-6 border-2 border-[#D30000] border-t-transparent rounded-full animate-spin" />
            <span>Memverifikasi link pemulihan...</span>
          </div>
        ) : success ? (
          <div className="w-full space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Password berhasil diperbarui! Mengalihkan Anda ke dashboard...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} noValidate className="w-full space-y-4">
            <div>
              <div className="relative rounded-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password Baru (min. 6 karakter)"
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

            <div>
              <div className="relative rounded-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi Password Baru"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmError) setConfirmError(null);
                  }}
                  className={`w-full h-14 bg-white border ${
                    confirmError
                      ? 'border-[#D30000]'
                      : 'border-slate-300 hover:border-slate-400 focus:border-[#D30000]'
                  } rounded-full pl-15 pr-13 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all`}
                />
              </div>
              {confirmError && (
                <p className="text-xs text-[#D30000] pl-5 mt-1.5 font-medium text-left">
                  {confirmError}
                </p>
              )}
            </div>

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
                    <span>Menyimpan...</span>
                  </div>
                ) : (
                  'Simpan Password Baru'
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs text-slate-600 hover:text-[#D30000] font-medium transition-colors"
              >
                Kembali ke halaman Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

