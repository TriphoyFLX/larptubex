import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Flame, Users, BookOpen, AlertCircle, Calendar, Eye, Heart, Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import api, { uploadFile } from '../api/index.ts';
import { Video, Short, CommunityPost, Playlist } from '../types.ts';
import { formatViews, formatRelativeDate, DEFAULT_AVATAR } from '../utils.ts';

export default function Channel() {
  const { id } = useParams();
  const { user } = useAuthStore();
  
  const [channelData, setChannelData] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [shortsList, setShortsList] = useState<Short[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [playlistItems, setPlaylistItems] = useState<Playlist[]>([]);
  
  const [activeTab, setActiveTab] = useState<'home' | 'videos' | 'shorts' | 'posts' | 'playlists' | 'about'>('home');
  const [loading, setLoading] = useState(true);

  // New Post variables (visible only to the owner)
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageFile, setNewPostImageFile] = useState<File | null>(null);
  
  // Custom playlist vars
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  useEffect(() => {
    loadChannelProfile();
  }, [id, user]);

  const loadChannelProfile = async () => {
    setLoading(true);
    try {
      // 1. Fetch channel metadata detail
      const res = await api.get(`/api/channels/${id}`);
      setChannelData(res.data);

      // 2. Fetch specific channel videos
      const videosRes = await api.get('/api/videos');
      const authorVideos = videosRes.data.filter((v: Video) => v.authorId === Number(id));
      setVideos(authorVideos);

      // 3. Fetch specific channel shorts
      const shortsRes = await api.get('/api/shorts');
      const authorShorts = shortsRes.data.filter((s: Short) => s.authorId === Number(id));
      setShortsList(authorShorts);

      // 4. Fetch specific channel community posts
      const postsRes = await api.get('/api/posts');
      const authorPosts = postsRes.data.filter((p: CommunityPost) => p.authorId === Number(id));
      setCommunityPosts(authorPosts);

      // 5. Fetch playlists
      const playlistsRes = await api.get('/api/playlists', { params: { authorId: id } });
      setPlaylistItems(playlistsRes.data);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeToggle = async () => {
    if (!user) {
      alert('Войдите, чтобы подписаться на канал!');
      return;
    }
    try {
      const res = await api.post(`/api/channels/${id}/subscribe`);
      setChannelData({
        ...channelData,
        isSubscribed: res.data.isSubscribed,
        subscribersCount: (channelData.subscribersCount || 0) + (res.data.isSubscribed ? 1 : -1)
      });
    } catch (e: any) {
      alert(e.response?.data?.error || 'Subscription failed');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    try {
      let imageUrl: string | undefined;
      if (newPostImageFile) {
        imageUrl = await uploadFile('images', newPostImageFile);
      }
      const res = await api.post('/api/posts', {
        content: newPostContent,
        imageUrl,
      });
      setCommunityPosts([res.data, ...communityPosts]);
      setNewPostContent('');
      setNewPostImageFile(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const res = await api.post('/api/playlists', {
        name: newPlaylistName,
        description: newPlaylistDesc,
        isPrivate: false,
      });
      setPlaylistItems([res.data, ...playlistItems]);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setShowPlaylistForm(false);
    } catch (e) {
      console.error(e);
    }
  };

  const isOwner = user?.id === Number(id);

  if (loading) {
    return (
      <div className="flex-1 bg-white p-6 animate-pulse space-y-6">
        <div className="bg-gray-200 h-32 w-full"></div>
        <div className="flex gap-4 items-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-gray-200 w-48"></div>
            <div className="h-4 bg-gray-200 w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!channelData) {
    return (
      <div className="flex-1 bg-white p-12 text-center text-gray-500 font-semibold text-sm">
        Упс! Данный канал не существует на нашей платформе.
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white" id="channel-view">
      {/* 2015 Channel Banner placeholder */}
      <div className="h-32 w-full bg-[#dfdfdf] border-b border-gray-200 relative overflow-hidden select-none" id="channel-banner">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 opacity-60"></div>
        <div className="absolute bottom-3 right-4 bg-black/60 px-2 py-1 text-[10px] text-white tracking-widest font-bold">
          LARPTUBE STUDIO v1.5
        </div>
      </div>

      {/* Profile summary banner */}
      <div className="max-w-6xl mx-auto px-6 py-5 border-b border-gray-200" id="channel-profile-row">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <img
              src={channelData.avatar || DEFAULT_AVATAR}
              className="w-16 h-16 rounded-full object-cover border border-gray-300"
              alt="Channel Logo"
            />
            <div className="min-w-0">
              <h1 className="font-sans font-bold text-base text-gray-950 truncate leading-tight uppercase-none">{channelData.displayName}</h1>
              <p className="text-[11px] text-gray-400 mt-1.5 font-semibold">
                @{channelData.id} • {channelData.subscribersCount} подписчиков • {videos.length} видео
              </p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic max-w-lg">{channelData.bio || 'У этого автора пока нет описания канала.'}</p>
            </div>
          </div>

          {!isOwner && (
            <button
              onClick={handleSubscribeToggle}
              className={`px-4 py-1.5 rounded-[1px] font-bold text-xs uppercase transition-all tracking-tight ${channelData.isSubscribed ? 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200' : 'bg-yt-red border border-yt-darkred text-white hover:bg-yt-darkred'}`}
            >
              {channelData.isSubscribed ? 'Вы подписаны' : 'Подписаться'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs list representation */}
      <div className="border-b border-gray-200" id="channel-tabs-list">
        <div className="max-w-6xl mx-auto px-6 flex text-xs font-bold uppercase text-gray-600 select-none">
          {(['home', 'videos', 'shorts', 'posts', 'playlists', 'about'] as const).map((tab) => {
            const labels = {
              home: 'Главная',
              videos: 'Видео',
              shorts: 'Shorts',
              posts: 'Посты',
              playlists: 'Плейлисты',
              about: 'Информация',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3.5 px-4 border-b-2 hover:text-black transition-all ${activeTab === tab ? 'border-yt-red text-black font-black' : 'border-transparent font-semibold'}`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Area Contents */}
      <div className="max-w-6xl mx-auto px-6 py-6" id="channel-content-box">
        {/* TAB 1: Главная - Show highlighted video */}
        {activeTab === 'home' && (
          <div className="space-y-8" id="tab-home">
            {videos.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10">Канал пока еще не опубликовал ни одного ролика.</p>
            ) : (
              <div>
                <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5 mb-4 uppercase tracking-wider">Популярный ролик</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start bg-gray-50 border border-gray-100 p-4 rounded-sm">
                  <Link to={`/watch/${videos[0].id}`} className="block relative aspect-video overflow-hidden border border-gray-200 bg-black md:col-span-1">
                    <img src={videos[0].thumbnailUrl} className="w-full h-full object-cover" alt="Cover" />
                    <span className="absolute bottom-1 right-1 bg-black/80 font-mono text-[10px] px-1 rounded text-white">{videos[0].duration}</span>
                  </Link>
                  <div className="md:col-span-2">
                    <Link to={`/watch/${videos[0].id}`} className="text-sm font-bold text-gray-950 hover:text-blue-600">{videos[0].title}</Link>
                    <span className="text-[10px] text-gray-400 font-medium block mt-1">{formatViews(videos[0].views)} • {formatRelativeDate(videos[0].createdAt)}</span>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed bg-white/50 p-2 border border-gray-100 rounded-sm">{videos[0].description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Видео */}
        {activeTab === 'videos' && (
          <div id="tab-videos">
            {videos.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10">В этой вкладке пусто.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.map((v) => (
                  <Link key={v.id} to={`/watch/${v.id}`} className="block group">
                    <div className="relative aspect-video overflow-hidden border border-gray-200 bg-black">
                      <img src={v.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Cover" />
                      <span className="absolute bottom-1 right-1 bg-black/80 font-mono text-[9px] px-1 rounded text-white">{v.duration}</span>
                    </div>
                    <h4 className="font-bold text-[11px] text-gray-950 mt-2 leading-tight line-clamp-2 uppercase-none">{v.title}</h4>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">{formatViews(v.views)} • {formatRelativeDate(v.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Shorts */}
        {activeTab === 'shorts' && (
          <div id="tab-shorts">
            {shortsList.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10">Короткие ролики пока не загружены.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {shortsList.map((s) => (
                  <Link key={s.id} to="/shorts" className="block group">
                    <div className="relative aspect-[9/16] overflow-hidden border border-gray-200 bg-black rounded">
                      <video src={s.videoUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" muted />
                    </div>
                    <h4 className="font-bold text-[11px] text-gray-950 mt-2 leading-tight truncate">{s.title}</h4>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">{formatViews(s.views)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Посты (Community) */}
        {activeTab === 'posts' && (
          <div className="max-w-2xl mx-auto space-y-6" id="tab-posts">
            {/* Owner's craft area */}
            {isOwner && (
              <form onSubmit={handleCreatePost} className="bg-gray-50 border border-gray-200 p-4 rounded-sm space-y-3" id="community-post-craft">
                <span className="font-bold text-xs uppercase tracking-wide block border-b pb-1.5 border-gray-200">Создать запись сообщества</span>
                <textarea
                  placeholder="О чем вы думаете сегодня? Напишите сообщение для своей аудитории..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={3}
                  className="w-full p-2 text-xs border border-gray-300 rounded-[1px] bg-white resize-none"
                  required
                />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setNewPostImageFile(e.target.files?.[0] || null)}
                  className="w-full text-xs"
                />
                <button type="submit" className="bg-yt-red border border-yt-darkred text-white py-1 px-4 text-xs font-bold hover:bg-yt-darkred rounded-[1px] block ml-auto uppercase">
                  Опубликовать
                </button>
              </form>
            )}

            {communityPosts.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10">Тут пока пусто.</p>
            ) : (
              communityPosts.map((post) => (
                <div key={post.id} className="bg-white border border-gray-200 p-5 rounded-sm" id={`post-item-${post.id}`}>
                  <div className="flex gap-3 items-center">
                    <img src={post.authorAvatar || DEFAULT_AVATAR} className="w-8 h-8 rounded-full border" alt="A" />
                    <div>
                      <span className="font-bold text-xs text-gray-900 block">{post.authorName}</span>
                      <span className="text-[10px] text-gray-400">{formatRelativeDate(post.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 mt-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  {post.imageUrl && (
                    <img src={post.imageUrl} className="mt-4 max-h-72 w-full object-cover border border-gray-100 rounded-sm" alt="Post Attached visual" />
                  )}
                  {/* Actions summary */}
                  <div className="flex gap-4 items-center mt-4 border-t border-gray-50 pt-3 text-[10px] text-gray-400 font-bold uppercase select-none">
                    <span className="flex items-center gap-1"><Heart size={12} className="text-red-500 fill-red-500/15" /> Лайков: {post.likesCount}</span>
                    <span>Ответов: {post.commentsCount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 5: Playlists */}
        {activeTab === 'playlists' && (
          <div id="tab-playlists">
            {isOwner && (
              <div className="mb-6 flex justify-end">
                <button onClick={() => setShowPlaylistForm(!showPlaylistForm)} className="yt-button flex items-center gap-1 border border-gray-300 py-1.5 px-3 rounded text-[11px] font-bold">
                  <Plus size={12} /> {showPlaylistForm ? 'Скрыть панель' : 'Создать плейлист'}
                </button>
              </div>
            )}

            {/* Form */}
            {showPlaylistForm && (
              <form onSubmit={handleCreatePlaylist} className="max-w-md bg-gray-50 border border-gray-200 p-4 rounded-sm space-y-3 mb-6" id="playlist-creator-box">
                <span className="font-bold text-xs uppercase block border-b pb-1.5">Новый Плейлист</span>
                <input
                  type="text"
                  placeholder="Введите название плейлиста..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full h-8 px-2.5 border"
                  required
                />
                <textarea
                  placeholder="Введите описание..."
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2 border resize-none bg-white"
                />
                <button type="submit" className="bg-yt-red text-white py-1.5 px-4 text-xs font-bold uppercase hover:bg-yt-darkred block ml-auto">
                  Создать
                </button>
              </form>
            )}

            {playlistItems.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10">На канале пока не создано ни одного плейлиста.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {playlistItems.map((p) => (
                  <Link key={p.id} to={`/playlist/${p.id}`} className="block border border-gray-200 hover:border-gray-300 p-3 bg-gray-50/50 rounded-sm">
                    <div className="bg-gray-300 aspect-video w-full flex items-center justify-center text-gray-400 text-xs font-bold uppercase relative select-none">
                      Плейлист
                      <span className="absolute bottom-1 right-1 bg-black/85 text-white font-mono text-[9px] px-1 rounded font-normal">LIST</span>
                    </div>
                    <h4 className="font-bold text-[11px] text-gray-950 mt-2 truncate leading-tight uppercase-none">{p.name}</h4>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5 leading-tight">{p.description || 'Описание отсутствует'}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: Описание (About) */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="tab-about">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5 uppercase tracking-wider">О канале</h3>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 border rounded-sm italic">
                {channelData.bio || 'Этот канал не указал детальной автобиографии.'}
              </p>
            </div>
            <div className="md:col-span-1 space-y-4 border-l border-gray-100 pl-6 h-full font-sans">
              <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5 uppercase tracking-wider">Статистика</h3>
              <div className="space-y-3.5 text-xs text-gray-600 font-medium">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-gray-400" />
                  <span>Классический участник с {new Date(channelData.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye size={13} className="text-gray-400" />
                  <span>Суммарно: {channelData.totalViews || 0} просмотров видео</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
