import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, MessageSquare, ChevronUp, ChevronDown, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/authStore.ts';
import api from '../api/index.ts';
import { Short, Comment } from '../types.ts';
import { DEFAULT_AVATAR } from '../utils.ts';
import { useWatchProgress } from '../hooks/useWatchProgress.ts';

interface ShortDetail extends Short {
  viewerRating?: 'like' | 'dislike' | null;
}

export default function Shorts() {
  const { user } = useAuthStore();
  const [shortsList, setShortsList] = useState<Short[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeShortDetail, setActiveShortDetail] = useState<ShortDetail | null>(null);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);

  const currentShort = shortsList[activeIndex];

  useWatchProgress(activeVideoRef, {
    shortId: currentShort?.id,
    enabled: !!currentShort,
    onViewCounted: (views) => {
      setActiveShortDetail((prev) => prev ? { ...prev, views } : prev);
    },
  });

  useEffect(() => {
    fetchShorts();
  }, [user]);

  useEffect(() => {
    if (shortsList.length > 0) {
      loadActiveShortDetails();
    }
  }, [activeIndex, shortsList]);

  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (vid) {
        if (idx === activeIndex) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
          vid.currentTime = 0;
        }
      }
    });
  }, [activeIndex, shortsList]);

  const fetchShorts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/shorts');
      setShortsList(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveShortDetails = async () => {
    const current = shortsList[activeIndex];
    if (!current) return;
    try {
      const res = await api.get(`/api/shorts/${current.id}`);
      const { short, likesCount, dislikesCount, isLiked, isDisliked } = res.data;
      setActiveShortDetail({
        ...short,
        likesCount,
        dislikesCount,
        viewerRating: isLiked ? 'like' : isDisliked ? 'dislike' : null,
      });

      const commentsRes = await api.get(`/api/shorts/${current.id}/comments`);
      setComments(commentsRes.data);
    } catch (e) {
      console.error('Error fetching short details:', e);
    }
  };

  const handleNext = () => {
    if (activeIndex < shortsList.length - 1) {
      setActiveIndex(activeIndex + 1);
      setShowComments(false);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setShowComments(false);
    }
  };

  const updateRating = (res: { likesCount: number; dislikesCount: number; isLiked: boolean; isDisliked: boolean }) => {
    setActiveShortDetail((prev) =>
      prev
        ? {
            ...prev,
            likesCount: res.likesCount,
            dislikesCount: res.dislikesCount,
            viewerRating: res.isLiked ? 'like' : res.isDisliked ? 'dislike' : null,
          }
        : prev
    );
  };

  const handleLike = async () => {
    if (!user) {
      alert('Войдите, чтобы поставить лайк!');
      return;
    }
    if (!activeShortDetail) return;
    try {
      const res = await api.post(`/api/shorts/${activeShortDetail.id}/like`);
      updateRating(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      alert('Войдите, чтобы поставить дизлайк!');
      return;
    }
    if (!activeShortDetail) return;
    try {
      const res = await api.post(`/api/shorts/${activeShortDetail.id}/dislike`);
      updateRating(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Авторизуйтесь, чтобы написать комментарий.');
      return;
    }
    if (!activeShortDetail || !newCommentText.trim()) return;

    try {
      const res = await api.post('/api/comments', {
        content: newCommentText,
        shortId: activeShortDetail.id,
      });
      setComments([res.data, ...comments]);
      setNewCommentText('');
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center p-6 h-[calc(100vh-100px)]">
        <div className="animate-pulse space-y-4 flex flex-col items-center">
          <div className="w-[300px] h-[500px] bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  if (shortsList.length === 0) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-12 text-gray-500 font-semibold select-none">
        <p className="text-sm">В настоящий момент коротких видеороликов Shorts нет.</p>
        <Link to="/upload" className="mt-3 button yt-button-primary uppercase text-xs">
          Опубликовать первое короткое
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-100 flex items-center justify-center py-6 px-4 md:px-0 relative h-[calc(100vh-50px)] overflow-hidden" id="shorts-panel">
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
        <button
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="p-2.5 bg-white hover:bg-gray-100 border border-gray-300 rounded shadow-md text-gray-700 disabled:opacity-40 transition-opacity"
          id="btn-shorts-prev"
        >
          <ChevronUp size={20} className="stroke-[3]" />
        </button>
        <button
          onClick={handleNext}
          disabled={activeIndex === shortsList.length - 1}
          className="p-2.5 bg-white hover:bg-gray-100 border border-gray-300 rounded shadow-md text-gray-700 disabled:opacity-40 transition-opacity"
          id="btn-shorts-next"
        >
          <ChevronDown size={20} className="stroke-[3]" />
        </button>
      </div>

      <div className="relative flex max-w-4xl w-full justify-center items-center h-full max-h-[640px]">
        <div className="relative aspect-[9/16] h-full max-h-[600px] bg-black border-2 border-gray-900 rounded shadow-2xl overflow-hidden" id="shorts-viewport-card">
          <video
            ref={(el) => {
              videoRefs.current[activeIndex] = el;
              activeVideoRef.current = el;
            }}
            src={currentShort.videoUrl}
            loop
            preload="auto"
            playsInline
            className="w-full h-full object-cover"
            onClick={(e) => {
              const target = e.currentTarget;
              if (target.paused) target.play();
              else target.pause();
            }}
          />

          <div className="absolute bottom-0 left-0 right-0 p-4 pt-16 bg-gradient-to-t from-black/80 to-transparent text-white z-10">
            <h3 className="font-bold text-sm uppercase-none tracking-wide">{currentShort.title}</h3>
            <p className="text-xs text-gray-200 mt-1 line-clamp-2">{currentShort.description}</p>

            <div className="flex items-center gap-2 mt-3.5">
              <Link to={`/channel/${currentShort.authorId}`} className="h-7 w-7 rounded-full overflow-hidden border border-white">
                <img
                  src={currentShort.authorAvatar || DEFAULT_AVATAR}
                  className="w-full h-full object-cover"
                  alt="Author"
                />
              </Link>
              <Link to={`/channel/${currentShort.authorId}`} className="text-xs font-bold hover:underline">
                {currentShort.authorName}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5 ml-4 text-center select-none" id="shorts-interactions-rail">
          <div className="flex flex-col items-center">
            <button
              onClick={handleLike}
              className={`p-3.5 rounded-full border border-gray-300 shadow-md ${activeShortDetail?.viewerRating === 'like' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
              id="btn-shorts-like"
            >
              <ThumbsUp size={16} className="stroke-[3]" />
            </button>
            <span className="text-[10px] text-gray-600 font-bold mt-1.5">{activeShortDetail?.likesCount || 0}</span>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={handleDislike}
              className={`p-3.5 rounded-full border border-gray-300 shadow-md ${activeShortDetail?.viewerRating === 'dislike' ? 'bg-red-600 text-white border-red-600' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
              id="btn-shorts-dislike"
            >
              <ThumbsDown size={16} className="stroke-[3]" />
            </button>
            <span className="text-[10px] text-gray-600 font-bold mt-1.5">{activeShortDetail?.dislikesCount || 0}</span>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowComments(true)}
              className="p-3.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-full shadow-md text-gray-700 transition-colors"
              id="btn-shorts-comments-open"
            >
              <MessageSquare size={16} />
            </button>
            <span className="text-[10px] text-gray-600 font-bold mt-1.5">{comments.length}</span>
          </div>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 z-30 shadow-2xl flex flex-col p-4"
              id="shorts-comments-slideout-drawer"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                <span className="font-bold text-xs text-gray-800 uppercase tracking-wide">Комментарии ({comments.length})</span>
                <button onClick={() => setShowComments(false)} className="text-gray-400 hover:text-black">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[380px]">
                {comments.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-20 italic">Напишите первый отзыв к этому Shorts!</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-2 bg-gray-50/50 p-2 border border-gray-100 rounded-sm">
                      <img
                        src={c.authorAvatar || DEFAULT_AVATAR}
                        className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                        alt="Author Avatar"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[10px] text-gray-800 block leading-tight">{c.authorName}</span>
                        <p className="text-[11px] text-gray-700 mt-1 leading-normal break-words">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {user ? (
                <form onSubmit={handlePostComment} className="mt-auto border-t border-gray-100 pt-3 flex gap-2" id="shorts-comment-form">
                  <input
                    type="text"
                    placeholder="Ваш комментарий..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 p-2 text-xs border border-gray-300 rounded-[1px] h-8 focus:border-blue-500"
                    required
                  />
                  <button type="submit" className="bg-yt-red text-white w-8 h-8 flex items-center justify-center shrink-0 hover:bg-yt-darkred rounded-[1px]">
                    <Send size={12} className="fill-white" />
                  </button>
                </form>
              ) : (
                <p className="text-[10px] text-gray-400 mt-auto pt-3 text-center">
                  <Link to="/login" className="text-blue-600 underline font-bold">Войдите</Link>, чтобы комментировать.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
