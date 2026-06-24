import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Flame, Users, BookOpen, AlertCircle, Calendar, Eye, Heart, Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import api, { uploadFile } from '../api/index.ts';
import { Video, Short, CommunityPost, Playlist } from '../types.ts';
import { formatViews, formatRelativeDate, DEFAULT_AVATAR, formatChannelHandle, isSameUser } from '../utils.ts';
import HashtagList from '../components/HashtagList.tsx';
import VideoThumbnail from '../components/VideoThumbnail.tsx';
import { setPageMeta } from '../seo.ts';

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
      setPageMeta({
        title: res.data.displayName,
        description: res.data.bio || `Канал ${res.data.displayName} на LarpTubeX`,
      });

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
    if (isOwner) return;
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

  const isOwner = isSameUser(user?.id, id);

  if (loading) {
    return (
      <div className="flex-1 yt-page yt-content-page animate-pulse space-y-6">
        <div className="yt-skeleton h-32 w-full"></div>
        <div className="flex gap-4 items-center">
          <div className="w-20 h-20 yt-skeleton rounded-full"></div>
          <div className="space-y-2 flex-1">
            <div className="h-5 yt-skeleton w-48"></div>
            <div className="h-4 yt-skeleton w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!channelData) {
    return (
      <div className="flex-1 yt-page p-12 text-center yt-text-secondary font-semibold text-sm">
        Упс! Данный канал не существует на нашей платформе.
      </div>
    );
  }

  return (
    <div className="flex-1 yt-page" id="channel-view">
      {/* Channel Banner */}
      <div className="h-32 sm:h-44 w-full yt-border-b relative overflow-hidden select-none" id="channel-banner">
        {channelData.banner ? (
          <img src={channelData.banner} alt="Channel banner" className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--yt-bg-hover)] to-[var(--yt-bg-active)]" />
            <div className="absolute bottom-3 right-4 bg-black/60 px-2 py-1 text-[10px] text-white tracking-widest font-bold">
              LARPTUBE STUDIO v1.5
            </div>
          </>
        )}
      </div>

      {/* Profile summary banner */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5 yt-border-b -mt-6 relative" id="channel-profile-row">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex items-end gap-4">
            <img
              src={channelData.avatar || DEFAULT_AVATAR}
              className="w-20 h-20 rounded-full object-cover border-4 border-[var(--yt-bg)] shadow-sm yt-surface"
              alt="Channel Logo"
            />
            <div className="min-w-0 pb-1">
              <h1 className="font-sans font-bold text-lg yt-text-primary truncate leading-tight">{channelData.displayName}</h1>
              <p className="text-[11px] yt-text-secondary mt-1 font-semibold">
                {formatChannelHandle(channelData)} • {channelData.subscribersCount} подписчиков • {videos.length} видео
              </p>
              <p className="text-xs yt-text-secondary mt-1 line-clamp-2 max-w-lg">{channelData.bio || 'У этого автора пока нет описания канала.'}</p>
              {channelData.hashtags?.length > 0 && (
                <HashtagList tags={channelData.hashtags} className="mt-2" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner ? (
              <Link
                to="/settings"
                className="px-4 py-1.5 rounded-[1px] font-bold text-xs uppercase tracking-tight bg-[var(--yt-bg-hover)] border border-[var(--yt-border)] yt-text-primary yt-hover transition-all"
                id="btn-customize-channel"
              >
                Настроить канал
              </Link>
            ) : (
              <button
                onClick={handleSubscribeToggle}
                className={`px-4 py-1.5 rounded-[1px] font-bold text-xs uppercase transition-all tracking-tight ${channelData.isSubscribed ? 'bg-[var(--yt-bg-hover)] border border-[var(--yt-border)] yt-text-secondary yt-hover' : 'bg-yt-red border border-yt-darkred text-white hover:bg-yt-darkred'}`}
              >
                {channelData.isSubscribed ? 'Вы подписаны' : 'Подписаться'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs list representation */}
      <div className="yt-border-b" id="channel-tabs-list">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 flex text-xs font-bold uppercase yt-text-secondary select-none overflow-x-auto">
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
                className={`py-3.5 px-4 border-b-2 transition-all ${activeTab === tab ? 'border-yt-red yt-text-primary font-black' : 'border-transparent font-semibold yt-hover'}`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Area Contents */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6" id="channel-content-box">
        {/* TAB 1: Главная - Show highlighted video */}
        {activeTab === 'home' && (
          <div className="space-y-8" id="tab-home">
            {videos.length === 0 ? (
              <p className="text-center text-xs yt-text-muted py-10">Канал пока еще не опубликовал ни одного ролика.</p>
            ) : (
              <div>
                <h3 className="text-xs font-bold yt-text-primary yt-border-b pb-1.5 mb-4 uppercase tracking-wider">Популярный ролик</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start yt-surface border border-[var(--yt-border)] p-4 rounded-sm">
                  <Link to={`/watch/${videos[0].id}`} className="block relative aspect-video overflow-hidden border border-[var(--yt-border)] bg-black md:col-span-1">
                    <img src={videos[0].thumbnailUrl} className="w-full h-full object-cover" alt="Cover" />
                    <span className="absolute bottom-1 right-1 bg-black/80 font-mono text-[10px] px-1 rounded text-white">{videos[0].duration}</span>
                  </Link>
                  <div className="md:col-span-2">
                    <Link to={`/watch/${videos[0].id}`} className="text-sm font-bold yt-text-primary hover:text-[#3ea6ff]">{videos[0].title}</Link>
                    <span className="text-[10px] yt-text-muted font-medium block mt-1">{formatViews(videos[0].views)} • {formatRelativeDate(videos[0].createdAt)}</span>
                    <p className="text-xs yt-text-secondary mt-2 line-clamp-3 leading-relaxed yt-desc-box p-2">{videos[0].description}</p>
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
              <p className="text-center text-xs yt-text-muted py-10">В этой вкладке пусто.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
                {videos.map((v) => (
                  <div key={v.id} className="group">
                    <VideoThumbnail
                      src={v.thumbnailUrl}
                      alt={v.title}
                      duration={v.duration}
                      to={`/watch/${v.id}`}
                      showHoverPlay
                    />
                    <Link to={`/watch/${v.id}`}>
                      <h4 className="font-bold text-[11px] yt-text-primary mt-2 leading-tight line-clamp-2">{v.title}</h4>
                    </Link>
                    <span className="text-[10px] yt-text-muted mt-0.5 block">{formatViews(v.views)} • {formatRelativeDate(v.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Shorts */}
        {activeTab === 'shorts' && (
          <div id="tab-shorts">
            {shortsList.length === 0 ? (
              <p className="text-center text-xs yt-text-muted py-10">Короткие ролики пока не загружены.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {shortsList.map((s) => (
                  <Link key={s.id} to="/shorts" className="block group">
                    <div className="relative aspect-[9/16] overflow-hidden border border-[var(--yt-border)] bg-black rounded">
                      <video src={s.videoUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" muted />
                    </div>
                    <h4 className="font-bold text-[11px] yt-text-primary mt-2 leading-tight truncate">{s.title}</h4>
                    <span className="text-[10px] yt-text-muted mt-0.5 block">{formatViews(s.views)}</span>
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
              <form onSubmit={handleCreatePost} className="yt-surface border border-[var(--yt-border)] p-4 rounded-sm space-y-3" id="community-post-craft">
                <span className="font-bold text-xs uppercase tracking-wide block yt-border-b pb-1.5">Создать запись сообщества</span>
                <textarea
                  placeholder="О чем вы думаете сегодня? Напишите сообщение для своей аудитории..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={3}
                  className="w-full p-2 text-xs border border-[var(--yt-border)] rounded-[1px] yt-input resize-none"
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
              <p className="text-center text-xs yt-text-muted py-10">Тут пока пусто.</p>
            ) : (
              communityPosts.map((post) => (
                <div key={post.id} className="yt-surface border border-[var(--yt-border)] p-5 rounded-sm" id={`post-item-${post.id}`}>
                  <div className="flex gap-3 items-center">
                    <img src={post.authorAvatar || DEFAULT_AVATAR} className="w-8 h-8 rounded-full border border-[var(--yt-border)]" alt="A" />
                    <div>
                      <span className="font-bold text-xs yt-text-primary block">{post.authorName}</span>
                      <span className="text-[10px] yt-text-muted">{formatRelativeDate(post.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-xs yt-text-primary mt-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  {post.imageUrl && (
                    <img src={post.imageUrl} className="mt-4 max-h-72 w-full object-cover border border-[var(--yt-border)] rounded-sm" alt="Post Attached visual" />
                  )}
                  {/* Actions summary */}
                  <div className="flex gap-4 items-center mt-4 yt-border-t pt-3 text-[10px] yt-text-muted font-bold uppercase select-none">
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
                <button onClick={() => setShowPlaylistForm(!showPlaylistForm)} className="yt-button flex items-center gap-1 border border-[var(--yt-border)] py-1.5 px-3 rounded text-[11px] font-bold">
                  <Plus size={12} /> {showPlaylistForm ? 'Скрыть панель' : 'Создать плейлист'}
                </button>
              </div>
            )}

            {/* Form */}
            {showPlaylistForm && (
              <form onSubmit={handleCreatePlaylist} className="max-w-md yt-surface border border-[var(--yt-border)] p-4 rounded-sm space-y-3 mb-6" id="playlist-creator-box">
                <span className="font-bold text-xs uppercase block yt-border-b pb-1.5">Новый Плейлист</span>
                <input
                  type="text"
                  placeholder="Введите название плейлиста..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full h-8 px-2.5 border border-[var(--yt-border)] yt-input"
                  required
                />
                <textarea
                  placeholder="Введите описание..."
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2 border border-[var(--yt-border)] resize-none yt-input"
                />
                <button type="submit" className="bg-yt-red text-white py-1.5 px-4 text-xs font-bold uppercase hover:bg-yt-darkred block ml-auto">
                  Создать
                </button>
              </form>
            )}

            {playlistItems.length === 0 ? (
              <p className="text-center text-xs yt-text-muted py-10">На канале пока не создано ни одного плейлиста.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {playlistItems.map((p) => (
                  <Link key={p.id} to={`/playlist/${p.id}`} className="block border border-[var(--yt-border)] yt-hover p-3 yt-surface rounded-sm">
                    <div className="yt-skeleton aspect-video w-full flex items-center justify-center yt-text-muted text-xs font-bold uppercase relative select-none">
                      Плейлист
                      <span className="absolute bottom-1 right-1 bg-black/85 text-white font-mono text-[9px] px-1 rounded font-normal">LIST</span>
                    </div>
                    <h4 className="font-bold text-[11px] yt-text-primary mt-2 truncate leading-tight uppercase-none">{p.name}</h4>
                    <p className="text-[10px] yt-text-muted truncate mt-0.5 leading-tight">{p.description || 'Описание отсутствует'}</p>
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
              <h3 className="text-xs font-bold yt-text-primary yt-border-b pb-1.5 uppercase tracking-wider">О канале</h3>
              <p className="text-xs yt-text-primary leading-relaxed whitespace-pre-wrap yt-desc-box p-4 italic">
                {channelData.bio || 'Этот канал не указал детальной автобиографии.'}
              </p>
              {channelData.hashtags?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[10px] font-bold yt-text-secondary uppercase tracking-wider mb-2">Хэштеги канала</h4>
                  <HashtagList tags={channelData.hashtags} size="md" />
                </div>
              )}
            </div>
            <div className="md:col-span-1 space-y-4 border-l border-[var(--yt-border)] pl-6 h-full font-sans">
              <h3 className="text-xs font-bold yt-text-primary yt-border-b pb-1.5 uppercase tracking-wider">Статистика</h3>
              <div className="space-y-3.5 text-xs yt-text-secondary font-medium">
                <div className="flex items-center gap-2">
                  <Users size={13} className="yt-text-muted" />
                  <span>{formatChannelHandle(channelData)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="yt-text-muted" />
                  <span>Дата регистрации: {new Date(channelData.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye size={13} className="yt-text-muted" />
                  <span>Суммарно: {channelData.totalViews || 0} просмотров видео</span>
                </div>
              </div>
              {isOwner && (
                <Link
                  to="/settings"
                  className="inline-block mt-4 text-[10px] font-bold text-[#3ea6ff] hover:underline uppercase"
                >
                  Редактировать профиль →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
