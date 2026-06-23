import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.ts';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [authProgress, setAuthProgress] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorCode('Пожалуйста, введите все данные');
      return;
    }
    setAuthProgress(true);
    setErrorCode('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setErrorCode(err.message || 'Ошибка аутентификации');
    } finally {
      setAuthProgress(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center p-4 bg-[#f1f1f1]" id="login-container">
      <div className="w-full max-w-sm bg-white border border-gray-300 p-8 shadow-sm rounded-sm yt-card" id="login-box">
        {/* Header styling */}
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-1 mb-2">
            <span className="bg-yt-red text-white font-bold text-lg px-2 rounded-sm tracking-tight">LARP</span>
            <span className="font-display font-bold text-2xl tracking-tight">Tube<span className="text-yt-red">X</span></span>
          </div>
          <p className="text-xs text-gray-500">Авторизация в системе видеохостинга</p>
        </div>

        {errorCode && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-sm flex items-start gap-2 animate-pulse" id="error-alert">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{errorCode}</span>
          </div>
        )}

        <form onSubmit={handleCredentialsSubmit} className="space-y-4" id="credentials-login-form">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Email адрес</label>
            <div className="relative">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-[1px] text-sm bg-gray-50/20"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-600">Пароль</label>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-[1px] text-sm bg-gray-50/20"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={authProgress}
            className="w-full bg-yt-red text-white font-bold py-2 px-4 rounded-[1px] text-xs uppercase hover:bg-yt-darkred transition-colors disabled:bg-gray-400 mt-2 flex items-center justify-center gap-1"
          >
            <LogIn size={13} />
            <span>{authProgress ? 'Загрузка...' : 'Авторизоваться'}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Впервые на платформе?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-bold">
            Регистрация канала
          </Link>
        </p>
      </div>
    </div>
  );
}
