import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'motion/react';
import { ChevronUp } from 'lucide-react';

const SNAP_COLLAPSED = 0;
const SNAP_HALF = 1;
const SNAP_FULL = 2;

function getHeights() {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  return {
    collapsed: 92,
    half: Math.min(vh * 0.55, 440),
    full: Math.min(vh * 0.9, vh - 56),
  };
}

type WatchMobileSheetProps = {
  children: ReactNode;
  suggestions: ReactNode;
  videoTitle: string;
};

export default function WatchMobileSheet({ children, suggestions, videoTitle }: WatchMobileSheetProps) {
  const [snap, setSnap] = useState(SNAP_COLLAPSED);
  const [heights, setHeights] = useState(getHeights);
  const sheetRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(typeof window !== 'undefined' ? window.innerHeight - getHeights().collapsed : 0);

  const getTargetY = (snapIndex: number, h = heights) => {
    const vh = window.innerHeight;
    const sheetH = snapIndex === SNAP_FULL ? h.full : snapIndex === SNAP_HALF ? h.half : h.collapsed;
    return vh - sheetH;
  };

  useEffect(() => {
    const onResize = () => setHeights(getHeights());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    animate(y, getTargetY(snap, heights), { type: 'spring', damping: 28, stiffness: 320 });
  }, [snap, heights]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity < -400 || offset < -80) {
      setSnap((s) => Math.min(SNAP_FULL, s + 1));
    } else if (velocity > 400 || offset > 80) {
      setSnap((s) => Math.max(SNAP_COLLAPSED, s - 1));
    } else {
      const currentY = y.get();
      const vh = window.innerHeight;
      const distCollapsed = Math.abs(currentY - (vh - heights.collapsed));
      const distHalf = Math.abs(currentY - (vh - heights.half));
      const distFull = Math.abs(currentY - (vh - heights.full));
      const min = Math.min(distCollapsed, distHalf, distFull);
      if (min === distFull) setSnap(SNAP_FULL);
      else if (min === distHalf) setSnap(SNAP_HALF);
      else setSnap(SNAP_COLLAPSED);
    }
  };

  const backdropOpacity = useTransform(y, (latest) => {
    const vh = window.innerHeight;
    const progress = 1 - (latest - (vh - heights.full)) / (heights.full - heights.collapsed);
    return Math.min(0.4, Math.max(0, progress * 0.4));
  });

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black pointer-events-none z-20 lg:hidden"
        style={{ opacity: backdropOpacity }}
      />

      <motion.div
        ref={sheetRef}
        className="fixed inset-x-0 z-30 lg:hidden bg-white rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.2)] flex flex-col"
        style={{ y, top: 0, height: heights.full }}
        drag="y"
        dragConstraints={{
          top: typeof window !== 'undefined' ? window.innerHeight - heights.full : 0,
          bottom: typeof window !== 'undefined' ? window.innerHeight - heights.collapsed : 0,
        }}
        dragElastic={0.06}
        onDragEnd={onDragEnd}
      >
        <div className="shrink-0 pt-2.5 pb-2 px-4 cursor-grab active:cursor-grabbing touch-none border-b border-gray-100">
          <div className="w-11 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
          <button
            type="button"
            onClick={() => setSnap((s) => (s < SNAP_FULL ? s + 1 : SNAP_COLLAPSED))}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide py-0.5"
          >
            <ChevronUp size={14} className={`transition-transform duration-200 ${snap === SNAP_FULL ? 'rotate-180' : ''}`} />
            {snap === SNAP_FULL ? 'Свернуть' : snap === SNAP_HALF ? 'Ещё выше — все рекомендации' : 'Потяните вверх — рекомендации'}
          </button>
          {snap === SNAP_COLLAPSED && (
            <p className="text-sm font-bold text-gray-900 line-clamp-2 text-center mt-1.5 px-1 leading-snug">{videoTitle}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10 watch-sheet-scroll">
          {snap >= SNAP_HALF && <div className="mb-5 pt-2">{suggestions}</div>}
          {children}
        </div>
      </motion.div>
    </>
  );
}
