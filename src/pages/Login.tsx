import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/authStore.ts';
import api from '../api/index.ts';
import { LogIn, AlertCircle, Mail } from 'lucide-react';
import BrandLogo from '../components/BrandLogo.tsx';
import { setPageMeta } from '../seo.ts';

type AuthConfig = {
  googleClientId: string | null;
  googleEnabled: boolean;
  emailCodeEnabled: boolean;
};

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, sendEmailCode, loginWithEmailCode, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [authProgress, setAuthProgress] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    setPageMeta({
      title: 'Вход',
      description: 'Авторизация в LarpTubeX — войдите в свой аккаунт и канал.',
      noIndex: true,
    });
    api.get<AuthConfig>('/api/auth/config').then((res) => setAuthConfig(res.data)).catch(() => {
      setAuthConfig({ googleClientId: null, googleEnabled: false, emailCodeEnabled: false });
    });
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorCode('Пожалуйста, введите все данные');
      return;
    }
    setAuthProgress(true);
    setErrorCode('');
    setInfoMessage('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorCode(err.message || 'Ошибка аутентификации');
    } finally {
      setAuthProgress(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorCode('Введите email');
      return;
    }
    setAuthProgress(true);
    setErrorCode('');
    setInfoMessage('');
    try {
      await sendEmailCode(email);
      setOtpSent(true);
      setInfoMessage('Код отправлен на почту. Проверьте входящие и папку «Спам».');
    } catch (err: any) {
      setErrorCode(err.message || 'Не удалось отправить код');
    } finally {
      setAuthProgress(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otpCode) {
      setErrorCode('Введите email и код из письма');
      return;
    }
    setAuthProgress(true);
    setErrorCode('');
    try {
      await loginWithEmailCode(email, otpCode);
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorCode(err.message || 'Неверный код');
    } finally {
      setAuthProgress(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setErrorCode('Google не вернул токен авторизации');
      return;
    }
    setAuthProgress(true);
    setErrorCode('');
    setInfoMessage('');
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorCode(err.message || 'Ошибка входа через Google');
    } finally {
      setAuthProgress(false);
    }
  };

  const loginContent = (
    <div className="w-full max-w-sm yt-surface border border-[var(--yt-border)] p-8 shadow-sm rounded-sm yt-card" id="login-box">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <BrandLogo variant="auth" linked={false} />
        </div>
        <p className="text-xs yt-text-secondary">Авторизация в системе видеохостинга</p>
      </div>

      {errorCode && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-sm flex items-start gap-2" id="error-alert">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{errorCode}</span>
        </div>
      )}

      {infoMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-sm">
          {infoMessage}
        </div>
      )}

      {authConfig?.googleEnabled && (
        <div className="mb-4">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErrorCode('Не удалось открыть окно Google')}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          </div>
          <p className="mt-2 text-[10px] text-center yt-text-secondary leading-relaxed">
            Если Google пишет «no registered origin», добавь в Console → Credentials → Web client →{' '}
            <strong>Authorized JavaScript origins</strong> (не Redirect URIs):{' '}
            <code className="text-[#3ea6ff]">{typeof window !== 'undefined' ? window.location.origin : 'https://larptubex.ru'}</code>
          </p>
        </div>
      )}

      {authConfig?.emailCodeEnabled && (
        <div className="mb-5">
          {!otpSent ? (
            <form onSubmit={handleSendCode} className="space-y-3">
              <p className="text-xs font-bold yt-text-secondary uppercase tracking-wide">Вход по коду на почту</p>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--yt-border)] rounded-[1px] text-sm yt-input"
                required
              />
              <button
                type="submit"
                disabled={authProgress}
                className="w-full border border-[var(--yt-border)] yt-text-primary font-bold py-2 px-4 rounded-[1px] text-xs uppercase hover:bg-[var(--yt-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Mail size={13} />
                <span>{authProgress ? 'Отправка...' : 'Получить код'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <p className="text-xs yt-text-secondary">Код отправлен на <strong>{email}</strong></p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-[var(--yt-border)] rounded-[1px] text-sm yt-input tracking-[0.3em] text-center font-mono"
                maxLength={6}
                required
              />
              <button
                type="submit"
                disabled={authProgress || otpCode.length < 6}
                className="w-full bg-yt-red text-white font-bold py-2 px-4 rounded-[1px] text-xs uppercase hover:bg-yt-darkred transition-colors disabled:opacity-50"
              >
                {authProgress ? 'Проверка...' : 'Войти по коду'}
              </button>
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtpCode(''); setInfoMessage(''); }}
                className="w-full text-xs text-[#3ea6ff] hover:underline"
              >
                Изменить email или запросить код заново
              </button>
            </form>
          )}
        </div>
      )}

      {(authConfig?.googleEnabled || authConfig?.emailCodeEnabled) && (
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-[var(--yt-border)]" />
          <span className="text-[10px] uppercase yt-text-secondary">или пароль</span>
          <div className="h-px flex-1 bg-[var(--yt-border)]" />
        </div>
      )}

      <form onSubmit={handleCredentialsSubmit} className="space-y-4" id="credentials-login-form">
        <div>
          <label className="block text-xs font-bold yt-text-secondary mb-1">Email адрес</label>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--yt-border)] rounded-[1px] text-sm yt-input"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold yt-text-secondary mb-1">Пароль</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--yt-border)] rounded-[1px] text-sm yt-input"
            required
          />
        </div>

        <button
          type="submit"
          disabled={authProgress}
          className="w-full bg-yt-red text-white font-bold py-2 px-4 rounded-[1px] text-xs uppercase hover:bg-yt-darkred transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-1"
        >
          <LogIn size={13} />
          <span>{authProgress ? 'Загрузка...' : 'Авторизоваться'}</span>
        </button>
      </form>

      <p className="mt-6 text-center text-xs yt-text-secondary">
        Впервые на платформе?{' '}
        <Link to="/register" className="text-[#3ea6ff] hover:underline font-bold">
          Регистрация канала
        </Link>
      </p>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center p-4 yt-page" id="login-container">
      {authConfig?.googleEnabled && authConfig.googleClientId ? (
        <GoogleOAuthProvider clientId={authConfig.googleClientId}>
          {loginContent}
        </GoogleOAuthProvider>
      ) : (
        loginContent
      )}
    </div>
  );
}
