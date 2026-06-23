import { Hash } from 'lucide-react';
import { parseHashtagPreview } from '../utils.ts';

type HashtagInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
};

export default function HashtagInput({
  value,
  onChange,
  label = 'Хэштеги',
  hint = 'Через запятую или пробел. Латиница, кириллица, цифры. До 12 тегов.',
  disabled = false,
}: HashtagInputProps) {
  const preview = parseHashtagPreview(value);

  return (
    <div>
      <label className="block text-xs font-bold yt-text-primary mb-1 flex items-center gap-1">
        <Hash size={12} className="yt-text-muted" />
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="gaming, ларп, tutorial"
        className="w-full px-3 py-2 border border-[var(--yt-border)] rounded-[1px] yt-input text-sm"
      />
      <p className="text-[10px] yt-text-muted mt-1">{hint}</p>
      {preview.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {preview.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--yt-bg-hover)] text-[#3ea6ff] border border-[var(--yt-border)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
