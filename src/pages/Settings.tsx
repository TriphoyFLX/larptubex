import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  User, Image, Type, AtSign, FileText, Save, X, Camera, Upload,
  CheckCircle2, AlertCircle, Eye, Loader2, ChevronRight, Palette,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import { useThemeStore, type ThemeMode } from '../store/themeStore.ts';
import api, { uploadFile } from '../api/index.ts';
import { DEFAULT_AVATAR, formatChannelHandle } from '../utils.ts';
import HashtagInput from '../components/HashtagInput.tsx';

type SettingsTab = 'branding' | 'profile' | 'about' | 'appearance';

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'Светлая тема' },
  { mode: 'dark', label: 'Тёмная тема' },
  { mode: 'system', label: 'Как в системе' },
];

export default function Settings() {
  const { user, updateProfile } = useAuthStore();
  const location = useLocation();
  const { mode, setMode } = useThemeStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [profileHashtags, setProfileHashtags] = useState('');
  const [avatar, setAvatar] = useState('');
  const [banner, setBanner] = useState('');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [dirty, setDirty] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const handleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tab = (location.state as { tab?: string })?.tab;
    if (tab === 'appearance') {
      setActiveTab('appearance');
    }
  }, [location.state]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setHandle(user.handle || '');
      setBio(user.bio || '');
      setProfileHashtags((user.hashtags || []).map((t) => `#${t}`).join(', '));
      setAvatar(user.avatar || DEFAULT_AVATAR);
      setBanner(user.banner || '');
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [avatarPreview, bannerPreview]);

  useEffect(() => {
    if (!user || !dirty) return;
    const normalized = handle.trim().toLowerCase().replace(/^@/, '');
    if (!normalized || normalized === (user.handle || '')) {
      setHandleStatus('idle');
      return;
    }
    if (normalized.length < 3 || !/^[a-z0-9_]+$/.test(normalized)) {
      setHandleStatus('invalid');
      return;
    }

    setHandleStatus('checking');
    if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current);
    handleCheckTimer.current = setTimeout(async () => {
      try {
        const res = await api.get('/api/user/handle/check', { params: { handle: normalized } });
        setHandleStatus(res.data.available ? 'available' : 'taken');
      } catch {
        setHandleStatus('invalid');
      }
    }, 400);

    return () => {
      if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current);
    };
  }, [handle, user, dirty]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const markDirty = () => setDirty(true);

  const onAvatarSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    markDirty();
  };

  const onBannerSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    markDirty();
  };

  const resetForm = () => {
    setDisplayName(user.displayName);
    setHandle(user.handle || '');
    setBio(user.bio || '');
    setProfileHashtags((user.hashtags || []).map((t) => `#${t}`).join(', '));
    setAvatar(user.avatar || DEFAULT_AVATAR);
    setBanner(user.banner || '');
    setAvatarFile(null);
    setBannerFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setAvatarPreview(null);
    setBannerPreview(null);
    setDirty(false);
    setError('');
    setSuccess('');
    setHandleStatus('idle');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (handleStatus === 'taken' || handleStatus === 'invalid') {
      setError('Исправьте имя пользователя перед сохранением');
      return;
    }

    setSaving(true);
    try {
      let finalAvatar = avatar;
      let finalBanner = banner;

      if (avatarFile) {
        setUploadingAvatar(true);
        finalAvatar = await uploadFile('avatars', avatarFile);
        setUploadingAvatar(false);
      }
      if (bannerFile) {
        setUploadingBanner(true);
        finalBanner = await uploadFile('banners', bannerFile);
        setUploadingBanner(false);
      }

      await updateProfile({
        displayName: displayName.trim(),
        handle: handle.trim().toLowerCase().replace(/^@/, '') || undefined,
        bio: bio.trim(),
        avatar: finalAvatar,
        banner: finalBanner || null,
        hashtags: profileHashtags,
      });

      setAvatar(finalAvatar);
      setBanner(finalBanner);
      setAvatarFile(null);
      setBannerFile(null);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setAvatarPreview(null);
      setBannerPreview(null);
      setDirty(false);
      setSuccess('Изменения сохранены и опубликованы на канале');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
      setUploadingBanner(false);
    }
  };

  const previewAvatar = avatarPreview || avatar || DEFAULT_AVATAR;
  const previewBanner = bannerPreview || banner;

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: 'branding', label: 'Оформление канала', icon: Image },
    { id: 'profile', label: 'Основные данные', icon: User },
    { id: 'about', label: 'Описание', icon: FileText },
    { id: 'appearance', label: 'Оформление', icon: Palette },
  ];

  return (
    <div className="flex-1 yt-page min-h-[calc(100vh-56px)]" id="settings-view">
      {/* YouTube Studio-style header */}
      <div className="yt-surface yt-border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1 text-[10px] yt-text-muted uppercase font-bold tracking-wider mb-1">
              <Link to={`/channel/${user.id}`} className="hover:text-[#3ea6ff]">Канал</Link>
              <ChevronRight size={10} />
              <span className="yt-text-secondary">Настройка канала</span>
            </div>
            <h1 className="text-lg font-bold yt-text-primary">Настройка канала</h1>
            <p className="text-xs yt-text-secondary mt-0.5">
              Управляйте тем, как ваш канал выглядит для зрителей — как на YouTube
            </p>
          </div>
          <Link
            to={`/channel/${user.id}`}
            className="flex items-center gap-1.5 text-xs font-bold text-[#3ea6ff] hover:underline uppercase"
          >
            <Eye size={13} />
            Посмотреть канал
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Left nav — Studio sidebar */}
        <aside className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-left transition-colors ${
                activeTab === tab.id
                  ? 'yt-surface border border-[var(--yt-border)] yt-text-primary shadow-sm'
                  : 'yt-text-secondary yt-hover'
              }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'text-yt-red' : 'yt-text-muted'} />
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Main form area */}
        <div className="space-y-4">
          {/* Live preview card — YouTube channel header mockup */}
          {activeTab !== 'appearance' && (
            <div className="yt-surface border border-[var(--yt-border)] overflow-hidden shadow-sm">
              <div className="px-4 py-2 yt-border-b bg-[var(--yt-bg-hover)] flex items-center justify-between">
                <span className="text-[10px] font-bold yt-text-secondary uppercase tracking-wider">Предпросмотр канала</span>
                <span className="text-[10px] yt-text-muted">Как видят зрители</span>
              </div>

              {/* Banner preview */}
              <div className="h-28 sm:h-36 relative bg-gradient-to-r from-[var(--yt-bg-hover)] to-[var(--yt-bg-active)] overflow-hidden">
                {previewBanner ? (
                  <img src={previewBanner} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center yt-text-muted text-xs font-medium">
                    Баннер канала (2560×1440 рекомендуется)
                  </div>
                )}
              </div>

              {/* Profile row preview */}
              <div className="px-4 pb-4 -mt-8 relative">
                <div className="flex items-end gap-4">
                  <div className="w-20 h-20 rounded-full border-4 border-[var(--yt-bg-elevated)] overflow-hidden yt-skeleton shrink-0 shadow">
                    <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="pb-1 min-w-0">
                    <h2 className="font-bold text-base yt-text-primary truncate">{displayName || 'Название канала'}</h2>
                    <p className="text-xs yt-text-secondary font-medium">
                      {formatChannelHandle({ handle: handle || user.handle, id: user.id })}
                      {' • '}
                      0 подписчиков
                    </p>
                  </div>
                </div>
                {bio && (
                  <p className="text-xs yt-text-secondary mt-3 line-clamp-2 leading-relaxed">{bio}</p>
                )}
              </div>
            </div>
          )}

          {/* Alerts */}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-2.5 text-xs font-medium">
              <CheckCircle2 size={14} />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2.5 text-xs font-medium">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {activeTab === 'appearance' ? (
            <div className="yt-surface border border-[var(--yt-border)] shadow-sm">
              <div className="px-5 py-3 yt-border-b bg-[var(--yt-bg-hover)]">
                <h2 className="text-sm font-bold yt-text-primary">Тема оформления</h2>
                <p className="text-[11px] yt-text-secondary mt-0.5">
                  Выберите светлую, тёмную тему или следуйте системным настройкам
                </p>
              </div>
              <div className="p-5 space-y-1">
                {THEME_OPTIONS.map(({ mode: themeMode, label }) => (
                  <button
                    key={themeMode}
                    type="button"
                    onClick={() => setMode(themeMode)}
                    className={`yt-theme-option w-full ${mode === themeMode ? 'active' : ''}`}
                  >
                    <span className="dot" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="yt-surface border border-[var(--yt-border)] shadow-sm">
              <div className="px-5 py-3 yt-border-b bg-[var(--yt-bg-hover)]">
                <h2 className="text-sm font-bold yt-text-primary">
                  {activeTab === 'branding' && 'Брендинг канала'}
                  {activeTab === 'profile' && 'Основные данные'}
                  {activeTab === 'about' && 'Описание канала'}
                </h2>
              </div>

              <div className="p-5 space-y-6">
                {/* TAB: Branding */}
                {activeTab === 'branding' && (
                  <>
                    <section>
                      <label className="block text-xs font-bold yt-text-primary uppercase tracking-wide mb-2">
                        Фото профиля
                      </label>
                      <p className="text-[11px] yt-text-secondary mb-3">
                        Рекомендуется квадратное изображение не менее 98×98 пикселей. Форматы: JPG, PNG, GIF, WebP.
                      </p>
                      <div className="flex items-center gap-5">
                        <div className="relative group">
                          <img
                            src={previewAvatar}
                            alt="Avatar preview"
                            className="w-24 h-24 rounded-full object-cover border-2 border-[var(--yt-border)]"
                          />
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <Camera size={20} className="text-white" />
                          </button>
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="yt-button flex items-center gap-1.5"
                          >
                            <Upload size={12} />
                            {uploadingAvatar ? 'Загрузка...' : 'Изменить'}
                          </button>
                          <p className="text-[10px] yt-text-muted mt-1.5">Макс. 5 МБ</p>
                        </div>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={onAvatarSelect}
                        />
                      </div>
                    </section>

                    <section className="yt-border-t pt-6">
                      <label className="block text-xs font-bold yt-text-primary uppercase tracking-wide mb-2">
                        Баннер канала
                      </label>
                      <p className="text-[11px] yt-text-secondary mb-3">
                        Отображается в верхней части канала. Рекомендуемый размер: 2560×1440. Минимум: 2048×1152.
                      </p>
                      <div
                        className="relative h-36 bg-[var(--yt-bg-hover)] border-2 border-dashed border-[var(--yt-border-strong)] overflow-hidden group cursor-pointer"
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        {previewBanner ? (
                          <img src={previewBanner} alt="Banner preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center yt-text-muted">
                            <Image size={28} className="mb-2 opacity-50" />
                            <span className="text-xs font-medium">Нажмите, чтобы загрузить баннер</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-xs font-bold uppercase flex items-center gap-1.5">
                            <Camera size={14} />
                            {uploadingBanner ? 'Загрузка...' : 'Изменить баннер'}
                          </span>
                        </div>
                      </div>
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={onBannerSelect}
                      />
                      {previewBanner && (
                        <button
                          type="button"
                          onClick={() => {
                            setBanner('');
                            setBannerFile(null);
                            if (bannerPreview) URL.revokeObjectURL(bannerPreview);
                            setBannerPreview(null);
                            markDirty();
                          }}
                          className="mt-2 text-[10px] text-red-600 font-bold hover:underline uppercase"
                        >
                          Удалить баннер
                        </button>
                      )}
                    </section>
                  </>
                )}

                {/* TAB: Profile */}
                {activeTab === 'profile' && (
                  <>
                    <section>
                      <label htmlFor="displayName" className="flex items-center gap-1.5 text-xs font-bold yt-text-primary uppercase tracking-wide mb-2">
                        <Type size={12} />
                        Название канала
                      </label>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => { setDisplayName(e.target.value); markDirty(); }}
                        maxLength={50}
                        className="w-full h-9 px-3 text-sm border border-[var(--yt-border)] yt-input"
                        placeholder="Как вас будут видеть зрители"
                        required
                      />
                      <p className="text-[10px] yt-text-muted mt-1 text-right">{displayName.length}/50</p>
                    </section>

                    <section>
                      <label htmlFor="handle" className="flex items-center gap-1.5 text-xs font-bold yt-text-primary uppercase tracking-wide mb-2">
                        <AtSign size={12} />
                        Имя пользователя (handle)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 yt-text-muted text-sm">@</span>
                        <input
                          id="handle"
                          type="text"
                          value={handle}
                          onChange={(e) => {
                            setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                            markDirty();
                          }}
                          maxLength={30}
                          className="w-full h-9 pl-7 pr-10 text-sm border border-[var(--yt-border)] yt-input font-mono"
                          placeholder="mychannel"
                        />
                        {handleStatus === 'checking' && (
                          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 yt-text-muted animate-spin" />
                        )}
                        {handleStatus === 'available' && (
                          <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                        )}
                        {(handleStatus === 'taken' || handleStatus === 'invalid') && (
                          <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
                        )}
                      </div>
                      <p className="text-[10px] mt-1">
                        {handleStatus === 'available' && <span className="text-green-600 font-medium">Имя доступно</span>}
                        {handleStatus === 'taken' && <span className="text-red-600 font-medium">Имя уже занято</span>}
                        {handleStatus === 'invalid' && <span className="text-red-600 font-medium">Только a-z, 0-9 и _</span>}
                        {handleStatus === 'idle' && <span className="yt-text-muted">Уникальный идентификатор канала, как на YouTube</span>}
                      </p>
                    </section>

                    <section className="yt-desc-box p-3 text-xs yt-text-secondary">
                      <span className="font-bold yt-text-primary">Email аккаунта:</span> {user.email}
                      <p className="text-[10px] yt-text-muted mt-1">Email изменить нельзя — как на YouTube</p>
                    </section>
                  </>
                )}

                {/* TAB: About */}
                {activeTab === 'about' && (
                  <section>
                    <label htmlFor="bio" className="flex items-center gap-1.5 text-xs font-bold yt-text-primary uppercase tracking-wide mb-2">
                      <FileText size={12} />
                      Описание канала
                    </label>
                    <p className="text-[11px] yt-text-secondary mb-2">
                      Расскажите зрителям о себе. Описание отображается на вкладке «Информация» и под названием канала.
                    </p>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => { setBio(e.target.value); markDirty(); }}
                      maxLength={1000}
                      rows={6}
                      className="w-full p-3 text-sm border border-[var(--yt-border)] yt-input resize-y leading-relaxed"
                      placeholder="Расскажите зрителям, о чём ваш канал..."
                    />
                    <p className="text-[10px] yt-text-muted mt-1 text-right">{bio.length}/1000</p>

                    <div className="mt-6 pt-6 yt-border-t">
                      <HashtagInput
                        value={profileHashtags}
                        onChange={(v) => { setProfileHashtags(v); markDirty(); }}
                        label="Хэштеги канала"
                        hint="Темы вашего канала: gaming, ларп, обзоры. Отображаются в профиле и в поиске по #тегу."
                      />
                    </div>
                  </section>
                )}
              </div>

              {/* Sticky save bar — YouTube style */}
              <div className="px-5 py-3 yt-border-t bg-[var(--yt-bg-hover)] flex items-center justify-between gap-3">
                <p className="text-[10px] yt-text-muted hidden sm:block">
                  {dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}
                </p>
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={!dirty || saving}
                    className="yt-button flex items-center gap-1 disabled:opacity-40"
                  >
                    <X size={12} />
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !dirty || handleStatus === 'taken' || handleStatus === 'invalid'}
                    className="yt-button-primary flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {saving ? 'Сохранение...' : 'Опубликовать'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
