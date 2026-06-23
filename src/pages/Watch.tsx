import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, MessageSquare, CornerDownRight, Check, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import api from '../api/index.ts';
import { Video, Comment } from '../types.ts';
import { formatViews, formatRelativeDate, buildCommentTree, DEFAULT_AVATAR } from '../utils.ts';

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

  useEffect(() => {
    loadVideoAndDetails();
    fetchSuggestedVideos();
  }, [id, user]);

  const loadVideoAndDetails = async () => {
    setLoading(true);
    try {
      const videoRes = await api.get(`/api/videos/${id}`);
      const { video: videoData, likesCount, dislikesCount, isLiked, isDisliked, isSubscribed, subscribersCount } = videoRes.data;
      setVideo({
        ...videoData,
        likesCount,
        dislikesCount,
        viewerRating: isLiked ? 'like' : isDisliked ? 'dislike' : null,
        isSubscribed,
        subscribersCount,
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
      // Exclude current video from suggested list
      setSuggestedVideos(res.data.filter((v: Video) => v.id !== Number(id)).slice(0, 8));
    } catch (e) {
      console.error('Could not load suggestions:', e);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('Войдите, чтобы оценить видео!');
      return;
    }
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
    if (!user) {
      alert('Войдите, чтобы оценить видео!');
      return;
    }
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
    if (!user) {
      alert('Войдите, чтобы подписаться на канал!');
      return;
    }
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Пожалуйста, авторизуйтесь для публикации отзывов.');
      return;
    }
    if (!newComment.trim()) return;

    try {
      const res = await api.post('/api/comments', {
        content: newComment,
        videoId: id,
      });
      setComments([res.data, ...comments]);
      setNewComment('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReply = async (parentId: number) => {
    if (!user) {
      alert('Авторизуйтесь, чтобы ответить.');
      return;
    }
    if (!replyText.trim()) return;

    try {
      const res = await api.post('/api/comments', {
        content: replyText,
        videoId: id,
        parentId,
      });

      setComments(comments.map(c => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: [...c.replies, res.data],
          };
        }
        return c;
      }));

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
        setComments(comments.map(c => {
          if (c.id === parentCommentId) {
            return {
              ...c,
              replies: c.replies.filter(r => r.id !== commentId),
            };
          }
          return c;
        }));
      } else {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-white p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-black aspect-video w-full animate-pulse"></div>
          <div className="h-6 bg-gray-200 w-3/4 animate-pulse"></div>
          <div className="h-10 bg-gray-100 w-full animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 w-full animate-pulse"></div>)}
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

  return (
    <div className="flex-1 bg-white p-6 grid grid-cols-1 lg:grid-cols-3 gap-6" id="watch-layout">
      {/* Main column: player, info, comments */}
      <div className="lg:col-span-2" id="v-player-container-block">
        {/* HTML5 video player styled like classic black screen */}
        <div className="bg-black aspect-video w-full relative border border-gray-300" id="video-frame">
          <video
            src={video.videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
            id="media-source"
            poster={video.thumbnailUrl}
          />
        </div>

        {/* Video Title */}
        <h1 className="font-sans font-bold text-base text-gray-950 mt-4 leading-normal" id="video-detail-title">
          {video.title}
        </h1>

        {/* Metrics, author & action panels */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-3.5 mt-2 gap-4">
          {/* Author Block */}
          <div className="flex items-center gap-3">
            <Link to={`/channel/${video.authorId}`} className="shrink-0 h-11 w-11 rounded-full overflow-hidden border border-gray-200">
              <img
                src={video.authorAvatar || DEFAULT_AVATAR}
                alt={video.authorName}
                className="h-full w-full object-cover"
              />
            </Link>
            <div className="min-w-0">
              <Link to={`/channel/${video.authorId}`} className="block font-bold text-xs text-gray-900 leading-snug hover:text-blue-600">
                {video.authorName}
              </Link>
              <span className="text-[10px] text-gray-400 font-bold block">{video.subscribersCount || 0} подписчиков</span>
            </div>

            {/* Subscribe Toggle Button */}
            {user?.id !== video.authorId && (
              <button
                onClick={handleSubscribe}
                className={`ml-3 px-3 py-1.5 rounded-[1px] font-bold text-xs uppercase tracking-tight transition-all py-1.5 ${video.isSubscribed ? 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200' : 'bg-yt-red border border-yt-darkred text-white hover:bg-yt-darkred'}`}
                id="btn-subscribe-toggle"
              >
                {video.isSubscribed ? (
                  <span className="flex items-center gap-1">
                    <Check size={12} className="stroke-[3]" /> Вы подписаны
                  </span>
                ) : (
                  'Подписаться'
                )}
              </button>
            )}
          </div>

          {/* Views count + Like/Dislike Ratings Widgets */}
          <div className="flex items-center gap-4">
            <div className="text-[11px] text-gray-500 font-semibold uppercase shrink-0">
              <span className="font-bold text-sm text-gray-800">{video.views.toLocaleString()}</span> просмотров
            </div>

            <div className="flex items-center border border-gray-300 rounded-[2px] bg-[#f8f8f8] h-7 pt-0.5" id="ratings-cluster">
              {/* Like Button */}
              <button
                onClick={handleLike}
                className={`px-3 py-1 hover:bg-gray-200 flex items-center gap-1.5 transition-colors border-r border-gray-300 ${video.viewerRating === 'like' ? 'text-blue-600 bg-blue-50/20 font-bold' : 'text-gray-600'}`}
                id="btn-like-interaction"
              >
                <ThumbsUp size={11} className="stroke-[3]" />
                <span className="text-[10px] font-bold">{video.likesCount || 0}</span>
              </button>
              {/* Dislike Button */}
              <button
                onClick={handleDislike}
                className={`px-3 py-1 hover:bg-gray-200 flex items-center gap-1.5 transition-colors ${video.viewerRating === 'dislike' ? 'text-red-600 bg-red-50/20 font-bold' : 'text-gray-600'}`}
                id="btn-dislike-interaction"
              >
                <ThumbsDown size={11} className="stroke-[3]" />
                <span className="text-[10px] font-bold">{video.dislikesCount || 0}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Video Description box */}
        <div className="bg-[#f2f2f2] border border-gray-200 p-3 mt-4 text-xs text-gray-800 leading-relaxed rounded-sm rounded-t-none" id="v-description-wrapper">
          <div className="flex items-center gap-2 mb-1.5 border-b border-gray-300 pb-1.5">
            <span className="font-bold text-gray-900">Опубликовано:</span>
            <span>{new Date(video.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p className={`${showFullDesc ? '' : 'line-clamp-3'} whitespace-pre-wrap`}>
            {video.description || 'У ролика нет описания.'}
          </p>
          <button
            onClick={() => setShowFullDesc(!showFullDesc)}
            className="mt-2 text-blue-600 font-bold hover:underline block text-[10px] uppercase flex items-center gap-0.5"
            id="desc-see-more-toggle"
          >
            {showFullDesc ? (
              <><span>Свернуть</span> <ChevronUp size={12} /></>
            ) : (
              <><span>Показать все</span> <ChevronDown size={12} /></>
            )}
          </button>
        </div>

        {/* --- Comments architecture --- */}
        <div className="mt-8" id="video-comments-block">
          <h3 className="font-sans font-bold text-xs text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2 uppercase tracking-wide">
            <MessageSquare size={13} className="text-gray-500" />
            Отзывы и комментарии ({comments.length})
          </h3>

          {/* New Comments post form */}
          {user ? (
            <form onSubmit={handleAddComment} className="flex gap-3 mt-4" id="comment-add-box">
              <img
                src={user.avatar || DEFAULT_AVATAR}
                className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                alt="my avatar"
              />
              <div className="flex-1 flex flex-col gap-2">
                <textarea
                  placeholder="Оставьте свой публичный комментарий..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="w-full p-2 text-sm border border-gray-300 rounded-[1px] resize-none"
                  required
                />
                <button type="submit" className="self-end bg-yt-red text-white py-1 px-3 text-xs font-bold uppercase hover:bg-yt-darkred border border-yt-darkred rounded-[1px]">
                  Отправить
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-gray-50 border border-gray-200 p-4 text-center text-xs mt-4 rounded-sm">
              Пожалуйста,{' '}
              <Link to="/login" className="text-blue-600 underline font-bold">
                авторизуйтесь в системе
              </Link>
              , чтобы оставлять свои комментарии и отзывы.
            </div>
          )}

          {/* Comments list threads */}
          <div className="mt-6 space-y-6" id="comments-timeline">
            {comments.map((comment) => (
              <div key={comment.id} className="group border-b border-gray-50 pb-4 last:border-0" id={`comment-row-${comment.id}`}>
                {/* Main Root comment */}
                <div className="flex gap-3">
                  <img
                    src={comment.authorAvatar || DEFAULT_AVATAR}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                    alt="Comment author"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900">{comment.authorName}</span>
                      <span className="text-[9px] text-gray-400 font-medium">{formatRelativeDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-1 leading-relaxed bg-white">{comment.content}</p>
                    
                    {/* Actions: Replay, delete triggers */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        onClick={() => {
                          setReplyToId(replyToId === comment.id ? null : comment.id);
                          setReplyText('');
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline uppercase"
                      >
                        Ответить
                      </button>
                      {(user && (user.id === comment.authorId || user.isAdmin)) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-[10px] text-red-500 font-bold hover:underline uppercase"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub replies list */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-10 mt-3 space-y-3 bg-gray-50/50 p-2.5 border-l-2 border-gray-200 rounded-sm">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2.5" id={`reply-row-${reply.id}`}>
                        <div className="text-gray-400 mt-1 shrink-0">
                          <CornerDownRight size={12} />
                        </div>
                        <img
                          src={reply.authorAvatar || DEFAULT_AVATAR}
                          className="w-6 h-6 rounded-full object-cover border border-gray-200"
                          alt="reply author"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[11px] text-gray-900">{reply.authorName}</span>
                            <span className="text-[9px] text-gray-400">{formatRelativeDate(reply.createdAt)}</span>
                          </div>
                          <p className="text-xs text-gray-700 mt-0.5 leading-snug">{reply.content}</p>
                          {(user && (user.id === reply.authorId || user.isAdmin)) && (
                            <button
                              onClick={() => handleDeleteComment(reply.id, comment.id)}
                              className="text-[9px] text-red-500 hover:underline block mt-0.5 uppercase font-bold"
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline replies editor */}
                {replyToId === comment.id && (
                  <div className="ml-10 mt-3 flex items-start gap-2 max-w-lg">
                    <input
                      type="text"
                      placeholder="Напишите ответ..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 px-2.5 py-1 border border-gray-300 rounded-[1px] text-xs bg-white h-7 focus:border-blue-500"
                      required
                    />
                    <button
                      onClick={() => handleAddReply(comment.id)}
                      className="bg-yt-red border border-yt-darkred hover:bg-yt-darkred text-white font-bold h-7 px-3 rounded-[1px] text-[10px] uppercase shrink-0"
                    >
                      Ответить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suggested / Sidebar videos container */}
      <div className="lg:col-span-1" id="suggestions-column">
        <h3 className="font-sans font-bold text-xs text-gray-900 border-b border-gray-200 pb-2 uppercase tracking-wide flex items-center gap-1.5 col-span-1">
          <Play size={11} className="text-yt-red fill-yt-red" />
          Похожие видео
        </h3>

        <div className="flex flex-col gap-3 mt-4" id="suggestions-list">
          {suggestedVideos.map((s) => (
            <Link key={s.id} to={`/watch/${s.id}`} className="group flex gap-2.5 border-b border-gray-50 pb-2 select-all h-20 overflow-hidden" id={`suggest-video-${s.id}`}>
              {/* Thumbnail representation */}
              <div className="relative w-32 shrink-0 aspect-video overflow-hidden border border-gray-200 bg-black">
                <img
                  src={s.thumbnailUrl}
                  alt={s.title}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-[9px] font-mono font-bold text-white px-1 mt-auto rounded-sm">
                  {s.duration}
                </span>
              </div>
              {/* Info description */}
              <div className="flex-1 min-w-0">
                <h4 className="font-sans font-bold text-[11px] text-gray-950 leading-tight line-clamp-2 hover:text-blue-600 transition-colors uppercase-none">
                  {s.title}
                </h4>
                <p className="text-[10px] text-gray-500 font-semibold mt-1 truncate">{s.authorName}</p>
                <span className="text-[9px] text-gray-400 block mt-0.5">{formatViews(s.views)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
