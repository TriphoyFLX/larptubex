import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, AlertCircle, Sparkles, Image, Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import api, { uploadFile } from '../api/index.ts';
import { CommunityPost } from '../types.ts';
import { formatRelativeDate, DEFAULT_AVATAR } from '../utils.ts';
import { setPageMeta } from '../seo.ts';

export default function Community() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({
      title: 'Сообщество',
      description: 'Лента сообщества LarpTubeX — посты авторов, обсуждения и новости каналов.',
    });
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/posts');
      setPosts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      let imageUrl: string | undefined;
      if (newImageFile) {
        imageUrl = await uploadFile('images', newImageFile);
      }

      const res = await api.post('/api/posts', {
        content: newContent,
        imageUrl,
      });

      setPosts([res.data, ...posts]);
      setNewContent('');
      setNewImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    } catch (e) {
      console.error('Error adding community entry', e);
    }
  };

  const handleLikePost = async (id: number) => {
    if (!user) {
      alert('Пожалуйста, авторизуйтесь для оценки записи.');
      return;
    }
    try {
      const res = await api.post(`/api/posts/${id}/like`);
      setPosts(posts.map(p => p.id === id ? { ...p, likesCount: res.data.likesCount } : p));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 bg-white p-6 max-w-3xl mx-auto" id="community-tab">
      <div className="border-b border-gray-200 pb-3 mb-6">
        <h1 className="font-sans font-bold text-base text-gray-950 uppercase tracking-wide flex items-center gap-2">
          <MessageSquare size={16} className="text-yt-red" />
          Сообщество LarpTubeX
        </h1>
        <p className="text-xs text-gray-400 mt-1">Официальные посты от авторов каналов, блоги, новости и живые обсуждения.</p>
      </div>

      {user ? (
        /* Form */
        <form onSubmit={handleCreatePost} className="bg-[#fcfcfc] border border-gray-300 p-5 rounded-sm space-y-4 mb-8 yt-card" id="global-community-post-creator">
          <div className="flex items-center gap-2.5 border-b pb-2 border-gray-100">
            <img src={user.avatar || DEFAULT_AVATAR} className="w-6 h-6 rounded-full border" alt="author avatar" />
            <span className="font-bold text-xs text-gray-700">Опубликовать запись от имени {user.displayName}</span>
          </div>
          <textarea
            placeholder="Поделитесь с сообществом чем-то интересным..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            className="w-full text-xs p-2.5 border border-gray-300 rounded bg-white"
            required
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setNewImageFile(file);
                if (imagePreview) URL.revokeObjectURL(imagePreview);
                setImagePreview(URL.createObjectURL(file));
              }
            }}
            className="w-full text-xs"
          />
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="max-h-40 border object-cover" />
          )}
          <button type="submit" className="bg-yt-red border border-yt-darkred text-white py-1.5 px-4 text-xs font-bold hover:bg-yt-darkred rounded-[1px] select-none block ml-auto uppercase">
            Опубликовать
          </button>
        </form>
      ) : (
        <div className="bg-gray-50 border border-gray-200 p-4 text-center text-xs mb-8 rounded">
          <Link to="/login" className="text-blue-600 underline font-bold">Войдите</Link>, чтобы оставить свою запись в ленте сообщества.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse bg-gray-50 border h-28 w-full p-4 space-y-2">
              <div className="h-4 bg-gray-200 u-1/4 rounded"></div>
              <div className="h-4 bg-gray-200 u-3/4 rounded"></div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-center text-xs text-gray-400 py-20 italic">В ленте сообщества пока нет записей.</p>
      ) : (
        <div className="space-y-6" id="community-feed-list">
          {posts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 p-5 rounded-sm" id={`community-post-${post.id}`}>
              <div className="flex gap-3 items-center">
                <Link to={`/channel/${post.authorId}`} className="shrink-0 h-9 w-9 rounded-full overflow-hidden border border-gray-200">
                  <img src={post.authorAvatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="Author" />
                </Link>
                <div>
                  <Link to={`/channel/${post.authorId}`} className="font-bold text-xs text-gray-900 block hover:text-blue-600 leading-tight">{post.authorName}</Link>
                  <span className="text-[10px] text-gray-400 font-medium">{formatRelativeDate(post.createdAt)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-700 mt-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              {post.imageUrl && (
                <img src={post.imageUrl} className="mt-4 max-h-80 w-full object-cover border border-gray-200 rounded-sm" alt="Atachement Image" />
              )}
              {/* Interaction Block */}
              <div className="flex gap-4 items-center mt-5 pt-3.5 border-t border-gray-100 text-[10px] text-gray-400 font-bold uppercase select-none">
                <button onClick={() => handleLikePost(post.id)} className="flex items-center gap-1 group text-gray-500 hover:text-yt-red transition-colors">
                  <Heart size={14} className="text-gray-400 group-hover:text-yt-red" />
                  <span>Полезно ({post.likesCount})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
