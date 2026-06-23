export const SITE = {
  name: 'LarpTubeX',
  title: 'LarpTubeX — видеохостинг, Shorts и сообщество',
  description:
    'LarpTubeX — российская видеоплатформа: загружайте видео и Shorts, смотрите каналы, подписывайтесь на авторов, общайтесь в ленте сообщества.',
  keywords:
    'LarpTubeX, видеохостинг, видео, shorts, стриминг, каналы, подписки, сообщество, загрузка видео',
  locale: 'ru_RU',
  themeColor: '#cc181e',
  logo: '/brand/logo.png',
  logoSvg: '/brand/logo.svg',
  favicon: '/favicon.png',
} as const;

export function setPageMeta(options: {
  title?: string;
  description?: string;
  noIndex?: boolean;
}) {
  const { title, description, noIndex } = options;

  if (title) {
    document.title = title.includes(SITE.name) ? title : `${title} | ${SITE.name}`;
  }

  const descTag = document.querySelector('meta[name="description"]');
  if (description && descTag) {
    descTag.setAttribute('content', description);
  }

  let robotsTag = document.querySelector('meta[name="robots"]');
  if (noIndex) {
    if (!robotsTag) {
      robotsTag = document.createElement('meta');
      robotsTag.setAttribute('name', 'robots');
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute('content', 'noindex, nofollow');
  } else if (robotsTag) {
    robotsTag.setAttribute('content', 'index, follow');
  }
}
