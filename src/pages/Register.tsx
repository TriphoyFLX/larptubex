import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.ts';
import { uploadFile } from '../api/index.ts';
import { AlertCircle, Sparkles } from 'lucide-react';
import BrandLogo from '../components/BrandLogo.tsx';
import { setPageMeta } from '../seo.ts';

export default function Register() {
  const navigate = useNavigate();
  const { register, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [errorText, setErrorText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: 'Регистрация',
      description: 'Создайте канал на LarpTubeX — регистрация и публикация видео.',
      noIndex: true,
    });
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName || !password) {
      setErrorText('Пожалуйста, введите имя, email и пароль');
      return;
    }
    if (password.length < 6) {
      setErrorText('Пароль должен содержать минимум 6 символов');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorText('Пароль должен содержать буквы и цифры');
      return;
    }
    setSubmitting(true);
    setErrorText('');
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        avatarUrl = await uploadFile('avatars', avatarFile);
      }
      await register({
        email,
        displayName,
        password,
        avatar: avatarUrl,
        bio: bio.trim() || undefined,
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorText(err.message || 'Ошибка в процессе создания канала');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center p-4 bg-[#f1f1f1]" id="register-container">
      <div className="w-full max-w-md bg-white border border-gray-300 p-8 shadow-sm rounded-sm yt-card" id="register-box">
        {/* Logo and Titles */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo variant="auth" linked={false} />
          </div>
          <p className="text-xs text-gray-500">Регистрация нового видеоканала</p>
        </div>

        {errorText && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded flex items-start gap-2 animate-pulse" id="error-alert-box">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-4" id="register-form">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Эл. почта *</label>
            <input
              type="email"
              placeholder="chef@larptubex.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-[1px] text-sm bg-gray-50/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Название канала *</label>
            <input
              type="text"
              placeholder="Кулинарный дневник"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-[1px] text-sm bg-gray-50/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Пароль канала *</label>
            <input
              type="password"
              placeholder="Минимум 8 символов, буквы и цифры"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-[1px] text-sm bg-gray-50/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Аватар канала (опционально)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setAvatarFile(file);
                  if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                  setAvatarPreview(URL.createObjectURL(file));
                }
              }}
              className="w-full text-xs"
            />
            {avatarPreview && (
              <img src={avatarPreview} alt="Avatar preview" className="mt-2 w-16 h-16 rounded-full object-cover border" />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Описание канала (опционально)</label>
            <textarea
              placeholder="Расскажите о том, какой контент вы планируете публиковать на своем новом канале..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-[1px] text-sm bg-gray-50/20 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-yt-red text-white font-bold py-2 px-4 rounded-[1px] text-xs uppercase hover:bg-yt-darkred transition-colors disabled:bg-gray-400 mt-2 flex items-center justify-center gap-1.5"
            id="btn-register-submit"
          >
            <Sparkles size={13} />
            <span>{submitting ? 'Запуск...' : 'Создать канал'}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500" id="login-redirect-link">
          Уже есть канал на LarpTubeX?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-bold">
            Войти в аккаунт
          </Link>
        </p>
      </div>
    </div>
  );
}
