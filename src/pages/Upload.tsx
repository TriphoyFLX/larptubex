import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, Film, Play, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import api, { uploadFile } from '../api/index.ts';
import { Category } from '../types.ts';
import { readVideoDuration } from '../utils.ts';

export default function Upload() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [contentType, setContentType] = useState<'video' | 'short'>('video');
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [duration, setDuration] = useState('0:00');

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
    fetchCategories();
  }, [user]);

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [videoPreview, thumbnailPreview]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/categories');
      setCategories(res.data);
      if (res.data.length > 0) {
        setCategoryId(res.data[0].id.toString());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(URL.createObjectURL(file));
    const dur = await readVideoDuration(file);
    setDuration(dur);
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoFile) {
      setErrorMessage('Название и видеофайл являются обязательными!');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setUploadProgress('Загрузка видео...');

    try {
      const videoUrl = await uploadFile('videos', videoFile);
      let thumbnailUrl: string | undefined;

      if (contentType === 'video' && thumbnailFile) {
        setUploadProgress('Загрузка обложки...');
        thumbnailUrl = await uploadFile('thumbnails', thumbnailFile);
      }

      setUploadProgress('Публикация...');

      if (contentType === 'video') {
        await api.post('/api/videos', {
          title,
          description: description.trim() || undefined,
          videoUrl,
          thumbnailUrl,
          categoryId: categoryId ? Number(categoryId) : undefined,
          duration: duration.trim() || '0:00',
        });
      } else {
        await api.post('/api/shorts', {
          title,
          description: description.trim() || undefined,
          videoUrl,
        });
      }
      navigate(`/channel/${user?.id}`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Произошла ошибка при загрузке.');
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="flex-1 yt-page p-6 max-w-3xl mx-auto" id="upload-panel">
      <div className="yt-border-b pb-3 mb-6">
        <h1 className="font-sans font-bold text-base yt-text-primary uppercase tracking-wide flex items-center gap-1.5">
          <UploadIcon size={16} className="text-yt-red" />
          Загрузить контент на LarpTubeX
        </h1>
        <p className="text-xs yt-text-muted mt-1">Загрузите видеофайл с компьютера — MP4, WebM или MOV до 500 МБ.</p>
      </div>

      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-sm flex items-start gap-2" id="upload-fail-alert">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {uploadProgress && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 text-xs p-3 rounded-sm">
          {uploadProgress}
        </div>
      )}

      <div className="flex gap-4 yt-border-b pb-4 mb-6 select-none">
        <button
          type="button"
          onClick={() => { setContentType('video'); setErrorMessage(''); }}
          className={`px-4 py-2 text-xs font-bold border rounded-[1px] flex items-center gap-2 ${contentType === 'video' ? 'yt-chip-active' : 'yt-chip yt-hover'}`}
        >
          <Film size={13} />
          <span>Стандартное видео</span>
        </button>
        <button
          type="button"
          onClick={() => { setContentType('short'); setErrorMessage(''); }}
          className={`px-4 py-2 text-xs font-bold border rounded-[1px] flex items-center gap-2 ${contentType === 'short' ? 'yt-chip-active' : 'yt-chip yt-hover'}`}
        >
          <Play size={13} className="fill-current" />
          <span>Короткий клип Shorts</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" id="upload-wizard-form">
        <div>
          <label className="block text-xs font-bold yt-text-primary mb-1">Название ролика *</label>
          <input
            type="text"
            placeholder="Введите название..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--yt-border)] rounded-[1px] yt-input"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold yt-text-primary mb-1">Описание</label>
          <textarea
            placeholder="О чём ваш ролик?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full p-2.5 text-xs border border-[var(--yt-border)] rounded-[1px] yt-input resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold yt-text-primary mb-1">Видеофайл *</label>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            onChange={handleVideoFileChange}
            className="w-full text-xs"
            required
          />
          {videoPreview && (
            <video src={videoPreview} controls className="mt-2 w-full max-h-48 yt-player-bg border border-[var(--yt-border)]" />
          )}
          {videoFile && (
            <p className="text-[10px] yt-text-secondary mt-1">
              {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} МБ) • {duration}
            </p>
          )}
        </div>

        {contentType === 'video' && (
          <>
            <div>
              <label className="block text-xs font-bold yt-text-primary mb-1">Обложка (опционально)</label>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleThumbnailFileChange}
                className="w-full text-xs"
              />
              {thumbnailPreview && (
                <img src={thumbnailPreview} alt="Preview" className="mt-2 max-h-32 border border-[var(--yt-border)] object-cover" />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold yt-text-primary mb-1">Категория</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border rounded-[1px] text-sm border-[var(--yt-border)] yt-input"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={submitting || !videoFile}
          className="w-full bg-yt-red text-white py-2 px-4 rounded-[1px] text-xs font-bold uppercase hover:bg-yt-darkred transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          id="btn-upload-submit"
        >
          <UploadIcon size={14} />
          <span>{submitting ? 'Загрузка...' : 'Опубликовать'}</span>
        </button>
      </form>
    </div>
  );
}
