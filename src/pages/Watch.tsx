import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  CornerDownRight,
  Check,
  ChevronDown,
  ChevronUp,
  Monitor,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import api from '../api/index.ts';
import { Video, Comment } from '../types.ts';
import { formatViews, formatRelativeDate, buildCommentTree, DEFAULT_AVATAR } from '../utils.ts';
import { setPageMeta } from '../seo.ts';
import { useWatchProgress } from '../hooks/useWatchProgress.ts';
import VideoPlayer from '../components/VideoPlayer.tsx';
import SuggestedVideos from '../components/SuggestedVideos.tsx';
import WatchMobileSheet from '../components/WatchMobileSheet.tsx';

export default function Watch() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [suggestedVideos, setSuggestedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [savedProgress, setSavedProgress] = useState(0);
  const [theaterMode, setTheaterMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const { resumeOffered, handleResume, handleStartFromBeginning } = useWatchProgress(videoRef, {
    videoId: id ? Number(id) : undefined,
    initialProgress: savedProgress,
    enabled: !!video && !!id,
    onViewCounted: (views) => {
      setVideo((prev) => (prev ? { ...prev, views } : prev));
    },
  });

  useEffect(() => {
    setTheaterMode(false);
    loadVideoAndDetails();
    fetchSuggestedVideos();
    window.scrollTo(0, 0);
  }, [id, user]);

  const loadVideoAndDetails = async () => {
    setLoading(true);
    try {
      const videoRes = await api.get(`/api/videos/${id}`);
      const { video: videoData, likesCount, dislikesCount, isLiked, isDisliked, isSubscribed, subscribersCount, watchProgress } = videoRes.data;
      setVideo({
        ...videoData,
        likesCount,
        dislikesCount,
        viewerRating: isLiked ? 'like' : isDisliked ? 'dislike' : null,
        isSubscribed,
        subscribersCount,
        watchProgress,
      });
      if (watchProgress?.progressSeconds > 3 && !watchProgress.completed) {
        setSavedProgress(watchProgress.progressSeconds);
      } else {
        setSavedProgress(0);
      }

      setPageMeta({
        title: videoData.title,
        description: videoData.description || `Смотреть «${videoData.title}» на LarpTubeX — ${videoData.authorName}`,
      });
      const commentsRes = await api.get(`/api/videos/${id}/comments`);
      setComments(buildCommentTree(commentsRes.data) as Comment[]);
    } catch (e) {
      console.error('Error fetching film detail:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestedVideos = async () => {
    try {
      const res = await api.get('/api/videos');
      setSuggestedVideos(res.data.filter((v: Video) => v.id !== Number(id)).slice(0, 16));
    } catch (e) {
      console.error('Could not load suggestions:', e);
    }
  };

  const handleLike = async () => {
    if (!user) return alert('Войдите, чтобы оценить видео!');
    try {
      const res = await api.post(`/api/videos/${id}/like`);
      if (video) {
        setVideo({
          ...video,
          likesCount: res.data.likesCount,
          dislikesCount: res.data.dislikesCount,
          viewerRating: res.data.isLiked ? 'like' : res.data.isDisliked ? 'dislike' : null,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDislike = async () => {
    if (!user) return alert('Войдите, чтобы оценить видео!');
    try {
      const res = await api.post(`/api/videos/${id}/dislike`);
      if (video) {
        setVideo({
          ...video,
          likesCount: res.data.likesCount,
          dislikesCount: res.data.dislikesCount,
          viewerRating: res.data.isLiked ? 'like' : res.data.isDisliked ? 'dislike' : null,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return alert('Войдите, чтобы подписаться на канал!');
    if (!video) return;
    try {
      const res = await api.post(`/api/channels/${video.authorId}/subscribe`);
      setVideo({
        ...video,
        isSubscribed: res.data.isSubscribed,
        subscribersCount: (video.subscribersCount || 0) + (res.data.isSubscribed ? 1 : -1),
      });
    } catch (e: any) {
      alert(e.response?.data?.error || 'Subscription failed');
    }
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Пожалуйста, авторизуйтесь для публикации отзывов.');
    if (!newComment.trim()) return;
    try {
      const res = await api.post('/api/comments', { content: newComment, videoId: id });
      setComments([res.data, ...comments]);
      setNewComment('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReply = async (parentId: number) => {
    if (!user) return alert('Авторизуйтесь, чтобы ответить.');
    if (!replyText.trim()) return;
    try {
      const res = await api.post('/api/comments', { content: replyText, videoId: id, parentId });
      setComments(comments.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, res.data] } : c)));
      setReplyText('');
      setReplyToId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteComment = async (commentId: number, parentCommentId?: number) => {
    if (!confirm('Вы действительно хотите удалить этот комментарий?')) return;
    try {
      await api.delete(`/api/comments/${commentId}`);
      if (parentCommentId) {
        setComments(comments.map((c) =>
          c.id === parentCommentId ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) } : c
        ));
      } else {
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-[#f9f9f9] p-4 lg:p-6">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-black aspect-video w-full animate-pulse rounded-sm" />
            <div className="h-6 bg-gray-200 w-3/4 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex-1 bg-white p-12 text-center text-gray-500 font-semibold text-sm">
        Упс! Данного видео не существует или оно было удалено модератором.
      </div>
    );
  }

  const playerProps = {
    src: video.videoUrl,
    poster: video.thumbnailUrl,
    title: video.title,
    externalVideoRef: videoRef,
    resumeOffered,
    resumeAtSeconds: savedProgress,
    onResume: handleResume,
    onStartFromBeginning: handleStartFromBeginning,
    autoPlay: !resumeOffered,
  };

  const videoMeta = (
    <>
      <h1 className="font-bold text-base sm:text-lg text-gray-950 leading-snug" id="video-detail-title">
        {video.title}
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-3 mt-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/channel/${video.authorId}`} className="shrink-0 h-10 w-10 rounded-full overflow-hidden ring-2 ring-gray-100">
            <img src={video.authorAvatar || DEFAULT_AVATAR} alt={video.authorName} className="h-full w-full object-cover" />
          </Link>
          <div className="min-w-0">
            <Link to={`/channel/${video.authorId}`} className="block font-bold text-sm text-gray-900 hover:text-blue-600 truncate">
              {video.authorName}
            </Link>
            <span className="text-[11px] text-gray-500">{video.subscribersCount || 0} подписчиков</span>
          </div>
          {user?.id !== video.authorId && (
            <button
              onClick={handleSubscribe}
              className={`ml-1 px-4 py-2 rounded-full font-bold text-xs transition-all shrink-0 ${
                video.isSubscribed
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-yt-red text-white hover:bg-yt-darkred shadow-sm'
              }`}
            >
              {video.isSubscribed ? (
                <span className="flex items-center gap-1"><Check size={14} /> Подписка</span>
              ) : (
                'Подписаться'
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">{formatViews(video.views)}</span>
          <div className="flex items-center rounded-full bg-gray-100 overflow-hidden h-9">
            <button
              onClick={handleLike}
              className={`px-4 h-full flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                video.viewerRating === 'like' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ThumbsUp size={16} className={video.viewerRating === 'like' ? 'fill-blue-600' : ''} />
              {video.likesCount || 0}
            </button>
            <div className="w-px h-5 bg-gray-300" />
            <button
              onClick={handleDislike}
              className={`px-4 h-full flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                video.viewerRating === 'dislike' ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ThumbsDown size={16} className={video.viewerRating === 'dislike' ? 'fill-red-600' : ''} />
              {video.dislikesCount || 0}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setTheaterMode((t) => !t)}
            className={`hidden lg:flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-bold border transition-colors ${
              theaterMode ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            title="Режим кинотеатра"
          >
            <Monitor size={14} />
            Театр
          </button>
        </div>
      </div>

      <div className="bg-gray-100 rounded-xl p-4 mt-4 text-sm text-gray-800">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-2 font-medium">
          <span>{formatViews(video.views)}</span>
          <span>•</span>
          <span>{new Date(video.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <p className={`${showFullDesc ? '' : 'line-clamp-3'} whitespace-pre-wrap leading-relaxed`}>
          {video.description || 'У ролика нет описания.'}
        </p>
        <button
          onClick={() => setShowFullDesc(!showFullDesc)}
          className="mt-2 text-gray-900 font-bold text-xs flex items-center gap-0.5 hover:underline"
        >
          {showFullDesc ? (<>Свернуть <ChevronUp size={14} /></>) : (<>Развернуть <ChevronDown size={14} /></>)}
        </button>
      </div>
    </>
  );

  const commentsBlock = (
    <div className="mt-8" id="video-comments-block">
      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-gray-500" />
        {comments.length} комментариев
      </h3>

      {user ? (
        <form onSubmit={handleAddComment} className="flex gap-3 mb-6">
          <img src={user.avatar || DEFAULT_AVATAR} className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200" alt="" />
          <div className="flex-1">
            <input
              placeholder="Добавьте комментарий..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full border-0 border-b border-gray-300 bg-transparent pb-2 text-sm focus:border-gray-900 rounded-none"
              required
            />
            {newComment.trim() && (
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setNewComment('')} className="text-xs font-semibold text-gray-600 px-3 py-1.5">Отмена</button>
                <button type="submit" className="text-xs font-bold text-white bg-yt-red px-4 py-1.5 rounded-full">Комментировать</button>
              </div>
            )}
          </div>
        </form>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-center text-sm mb-6">
          <Link to="/login" className="text-blue-600 font-bold hover:underline">Войдите</Link>, чтобы комментировать
        </div>
      )}

      <div className="space-y-5">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <img src={comment.authorAvatar || DEFAULT_AVATAR} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs text-gray-900">{comment.authorName}</span>
                <span className="text-[11px] text-gray-500">{formatRelativeDate(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
              <div className="flex gap-3 mt-1">
                <button onClick={() => { setReplyToId(replyToId === comment.id ? null : comment.id); setReplyText(''); }} className="text-xs font-semibold text-gray-600 hover:text-gray-900">Ответить</button>
                {user && (user.id === comment.authorId || user.isAdmin) && (
                  <button onClick={() => handleDeleteComment(comment.id)} className="text-xs font-semibold text-red-600">Удалить</button>
                )}
              </div>
              {comment.replies?.length > 0 && (
                <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-100">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2">
                      <CornerDownRight size={14} className="text-gray-300 shrink-0 mt-2" />
                      <img src={reply.authorAvatar || DEFAULT_AVATAR} className="w-7 h-7 rounded-full shrink-0" alt="" />
                      <div>
                        <span className="font-bold text-[11px]">{reply.authorName}</span>
                        <span className="text-[10px] text-gray-400 ml-2">{formatRelativeDate(reply.createdAt)}</span>
                        <p className="text-xs text-gray-700 mt-0.5">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {replyToId === comment.id && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Ответ..."
                    className="flex-1 text-xs border border-gray-200 rounded-full px-3 py-1.5"
                  />
                  <button onClick={() => handleAddReply(comment.id)} className="text-xs font-bold bg-yt-red text-white px-3 py-1.5 rounded-full">Отправить</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-[#f9f9f9] min-h-full" id="watch-layout">
      {/* ——— Mobile: sticky player + pull-up sheet ——— */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-40 bg-black shadow-lg">
          <VideoPlayer {...playerProps} compact className="aspect-video w-full" />
        </div>
        <div className="h-[92px]" aria-hidden />
        <WatchMobileSheet
          videoTitle={video.title}
          suggestions={<SuggestedVideos videos={suggestedVideos} variant="sheet" />}
        >
          {videoMeta}
          {commentsBlock}
        </WatchMobileSheet>
      </div>

      {/* ——— Desktop ——— */}
      <div className={`hidden lg:block p-6 ${theaterMode ? 'max-w-[1600px]' : 'max-w-[1280px]'} mx-auto`}>
        <div className={`grid gap-6 ${theaterMode ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <div className={theaterMode ? 'col-span-1' : 'col-span-2'}>
            <VideoPlayer {...playerProps} className="aspect-video w-full" />
            <div className="mt-4">{videoMeta}</div>
            {commentsBlock}
          </div>
          {!theaterMode && (
            <div className="col-span-1">
              <SuggestedVideos videos={suggestedVideos} variant="sidebar" />
            </div>
          )}
        </div>
        {theaterMode && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <SuggestedVideos videos={suggestedVideos} variant="grid" title="Рекомендуем далее" />
          </div>
        )}
      </div>
    </div>
  );
}
