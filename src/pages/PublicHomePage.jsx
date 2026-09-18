import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, MapPin } from 'lucide-react';
import { fetchEventSettings } from '../api/client.js';
import ManagedCreditFooter from '../layouts/ManagedCreditFooter.jsx';

const defaultGalleryImages = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=600&q=80'
];

const homeHeroEyebrow = 'Welcome to Our Wedding Celebration';

export default function PublicHomePage() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [activeHeroPhotoColorIndex, setActiveHeroPhotoColorIndex] = useState(0);
  const [activeGalleryColorIndex, setActiveGalleryColorIndex] = useState(0);
  const [activeLoveStoryIndex, setActiveLoveStoryIndex] = useState(0);

  useEffect(() => {
    async function loadEvent() {
      try {
        setEvent(await fetchEventSettings());
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to load invitation preview');
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading || !event) return undefined;

    const gallery = normalizeGalleryImages(event.galleryImages);
    const heroPhotos = normalizeHeroPhotoStripImages(event.heroPhotoStripImages, gallery);
    setActiveHeroPhotoColorIndex(0);
    if (heroPhotos.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveHeroPhotoColorIndex((current) => (current + 1) % heroPhotos.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [loading, event]);

  useEffect(() => {
    if (loading || !event) return undefined;

    const gallery = normalizeGalleryImages(event.galleryImages);
    setActiveGalleryColorIndex(0);
    if (gallery.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveGalleryColorIndex((current) => (current + 1) % gallery.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [loading, event]);

  useEffect(() => {
    if (!event) return;
    setActiveLoveStoryIndex(0);
  }, [event]);

  if (loading) {
    return <div className="card text-center">Preparing invitation preview...</div>;
  }

  if (!event) {
    return <div className="card text-center">Invitation preview unavailable.</div>;
  }

  const coupleNames = getCoupleNames(event);
  const coupleParentLines = getCoupleParentLines(event, coupleNames);
  const gallery = normalizeGalleryImages(event.galleryImages);
  const heroPhotos = normalizeHeroPhotoStripImages(event.heroPhotoStripImages, gallery);
  const heroImage = event.coverImage || defaultGalleryImages[0];
  const formattedDate = formatInvitationDate(event.date, 'Tanggal acara akan segera diumumkan');
  const countdown = getCountdown(event.date, now);
  const scheduleTitle = event.scheduleTitle || getScheduleTitle(event.date, formattedDate);
  const scheduleItems = getScheduleItems(event);
  const loveStoryScenes = getLoveStoryScenes(event, gallery);
  const activeLoveStorySafeIndex = Math.min(activeLoveStoryIndex, Math.max(loveStoryScenes.length - 1, 0));
  const activeLoveStoryScene = loveStoryScenes[activeLoveStorySafeIndex] || loveStoryScenes[0];

  return (
    <section className="overflow-hidden">
      <div className="cinematic-hero relative min-h-[100svh] overflow-hidden border-b border-ink/15">
        <img
          src={heroImage}
          alt=""
          className={`cinematic-hero-image absolute inset-0 h-full w-full object-cover grayscale ${getHeroImagePosition(event.heroImagePosition)}`}
        />
        <div className="cinematic-hero-glass absolute inset-0" />
        <div className="cinematic-vignette absolute inset-0" />

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-start px-5 pb-24 pt-[20vh] text-center sm:pt-[22vh] lg:pt-[27vh]">
          <p className="cinematic-stagger cinematic-delay-1 cinematic-hero-eyebrow">
            {homeHeroEyebrow}
          </p>

          {heroPhotos.length > 0 && (
            <div className="cinematic-stagger cinematic-delay-2 cinematic-hero-photo-strip mt-8 grid w-full max-w-[25rem] grid-cols-3 gap-1.5 sm:max-w-2xl sm:gap-3 lg:max-w-4xl">
              {heroPhotos.map((src, index) => (
                <div key={`${src}-${index}`} className="cinematic-hero-photo-card aspect-[2/3] overflow-hidden rounded-md border border-ink/10 bg-white/40 p-1.5 shadow-glow backdrop-blur-sm sm:p-2">
                  <img
                    src={src}
                    alt=""
                    className={`h-full w-full rounded-[3px] object-cover grayscale ${
                      index === activeHeroPhotoColorIndex % heroPhotos.length ? 'is-color-active' : ''
                    }`}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              ))}
            </div>
          )}

          <h1 className="cinematic-stagger cinematic-delay-3 mx-auto mt-6 max-w-[21rem] font-display text-[2.35rem] leading-[1.05] sm:max-w-3xl sm:text-5xl lg:max-w-6xl lg:whitespace-nowrap lg:text-6xl">
            <CoupleName names={coupleNames} />
          </h1>
          {coupleParentLines.length > 0 && (
            <CoupleParentLines lines={coupleParentLines} />
          )}
          <div className="cinematic-stagger cinematic-delay-4 mx-auto mt-8 h-px w-24 bg-ink/20" />
          <p className="cinematic-stagger cinematic-delay-5 mt-8 text-sm font-semibold text-ink/70">{formattedDate}</p>
          {event.location && <p className="cinematic-stagger cinematic-delay-5 mt-2 text-sm text-ink/55">{event.location}</p>}
          {event.description && (
            <p className="cinematic-stagger cinematic-delay-5 mt-6 max-w-xl text-sm leading-7 text-ink/65">{event.description}</p>
          )}

          <div className="cinematic-stagger cinematic-delay-6 mt-12 w-full max-w-[440px]">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/45">
              {getInvitationText(event, 'countdownIntroLabel', 'Menuju Hari Bahagia')}
            </p>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {countdown.map((item) => (
                <div key={item.label} className="cinematic-countdown-card rounded-md border border-ink/10 bg-white/55 px-2 py-3 shadow-glow backdrop-blur-sm">
                  <p key={item.value} className="countdown-tick font-display text-2xl tabular-nums leading-none sm:text-3xl">
                    {item.value}
                  </p>
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/50 sm:text-[10px]">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(scheduleTitle || scheduleItems.length > 0) && (
        <section className="border-b border-ink/10 bg-white px-5 py-20">
          <div className="mx-auto max-w-5xl text-center">
            <p className="eyebrow">Rangkaian Acara</p>
            {scheduleTitle && (
              <h2 className="mt-4 font-display text-4xl uppercase leading-tight sm:text-5xl">
                {scheduleTitle}
              </h2>
            )}
            <div className="mx-auto mt-6 h-px max-w-3xl bg-ink/25" />
            <div className="mt-8 grid gap-8 md:grid-cols-2 md:divide-x md:divide-ink/20">
              {scheduleItems.map((item) => (
                <EventPreviewCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {loveStoryScenes.length > 0 && (
        <section className="love-story-cinema border-b border-ink/10 bg-linen px-5 py-14 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow">Love Story</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{event.loveStoryTitle || 'Our Journey'}</h2>
            <div className="mx-auto mt-5 h-px w-12 bg-ink/20" />
          </div>
          <div className="love-story-index mx-auto mt-10 max-w-6xl sm:mt-14">
            <div className="love-story-index-list" aria-label="Love Story chapters">
              {loveStoryScenes.map((scene, index) => (
                <button
                  key={`${scene.title}-${index}`}
                  type="button"
                  className={`love-story-index-button ${index === activeLoveStorySafeIndex ? 'is-active' : ''}`}
                  onClick={() => setActiveLoveStoryIndex(index)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{scene.title || scene.label || `Scene ${index + 1}`}</strong>
                  {scene.label && <em>{scene.label}</em>}
                </button>
              ))}
            </div>
            {activeLoveStoryScene && <LoveStoryPreview scene={activeLoveStoryScene} />}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="border-b border-ink/10 bg-white px-5 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow">The Story</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{event.galleryTitle || 'Our Moments'}</h2>
            <div className="mx-auto mt-5 h-px w-12 bg-ink/20" />
          </div>
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-3 gap-3 sm:gap-5">
            {gallery.map((src, index) => (
              <div key={`${src}-${index}`} className="cinematic-gallery-frame is-visible aspect-square">
                <img
                  src={src}
                  alt=""
                  className={`cinematic-gallery-image h-full w-full rounded-md border border-ink/10 object-cover grayscale ${
                    index === activeGalleryColorIndex % gallery.length ? 'is-color-active' : ''
                  }`}
                  loading={index > 2 ? 'lazy' : 'eager'}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <ManagedCreditFooter copyright={event.footerCopyright || '\u00a9 2026 The Wedding Collective'} />
    </section>
  );
}

function CoupleName({ names }) {
  if (names.length < 2) return names[0] || 'Nama Pasangan';

  return (
    <>
      <span className="cinematic-title-part block sm:inline">{names[0]}</span>
      <span className="cinematic-title-part block text-[0.78em] leading-[0.95] sm:mx-3 sm:inline sm:text-[0.9em]">&</span>
      <span className="cinematic-title-part block sm:inline">{names[1]}</span>
    </>
  );
}

function CoupleParentLines({ lines }) {
  return (
    <div className="cinematic-stagger cinematic-delay-4 mt-6 grid w-full max-w-3xl gap-3 text-center sm:grid-cols-2">
      {lines.map((line, index) => (
        <div key={`${line.name}-${index}`} className="rounded-md border border-ink/10 bg-white/35 px-4 py-3 shadow-glow backdrop-blur-sm">
          <p className="font-display text-xl leading-none text-ink/80">{line.name}</p>
          <p className="mt-2 text-xs leading-5 text-ink/58">{line.text}</p>
        </div>
      ))}
    </div>
  );
}

function EventPreviewCard({ item }) {
  return (
    <div className="px-4">
      <p className="font-display text-3xl uppercase">{item.title}</p>
      <div className="mx-auto mt-3 h-px w-16 bg-ink/25" />
      <div className="mt-5 space-y-2 text-sm leading-6 text-ink/68">
        {item.date && <p><CalendarDays className="mr-2 inline" size={15} />{item.date}</p>}
        {item.time && <p>{item.time}</p>}
        {item.venue && <p className="font-semibold text-ink/78"><MapPin className="mr-2 inline" size={15} />{item.venue}</p>}
      </div>
    </div>
  );
}

function LoveStoryPreview({ scene }) {
  return (
    <article className="love-story-index-preview">
      <figure className="love-story-index-image">
        {scene.image ? (
          <img src={scene.image} alt="" />
        ) : (
          <div className="grid h-full place-items-center bg-white text-ink/35">
            <span className="h-px w-16 bg-ink/20" />
          </div>
        )}
      </figure>
      <div className="love-story-index-copy">
        {scene.label && <p className="eyebrow mt-4">{scene.label}</p>}
        {scene.title && <h3 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{scene.title}</h3>}
        {scene.body && <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/62 sm:text-base sm:leading-8">{scene.body}</p>}
      </div>
    </article>
  );
}

function getInvitationText(event, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(event || {}, key)) return fallback;
  return event?.[key] ?? '';
}

function getCoupleNames(event) {
  const partners = [event.partnerOneName, event.partnerTwoName]
    .map((name) => String(name || '').trim())
    .filter(Boolean);

  return partners.length ? partners : [event.title || 'Nama Pasangan'];
}

function getCoupleParentLines(event, names = []) {
  return [
    { name: names[0] || event?.partnerOneName || '', text: event?.partnerOneParentLine },
    { name: names[1] || event?.partnerTwoName || '', text: event?.partnerTwoParentLine }
  ]
    .map((item) => ({
      name: String(item.name || '').trim(),
      text: String(item.text || '').trim()
    }))
    .filter((item) => item.text);
}

function normalizeGalleryImages(images) {
  if (Array.isArray(images)) {
    return images.map((src) => String(src || '').trim()).filter(Boolean);
  }

  return defaultGalleryImages;
}

function normalizeHeroPhotoStripImages(images, gallery) {
  if (Array.isArray(images) && images.length) {
    return images.map((src) => String(src || '').trim()).filter(Boolean).slice(0, 3);
  }

  return gallery.slice(0, 3);
}

function getHeroImagePosition(value) {
  const positions = {
    top: 'object-top',
    center: 'object-center',
    bottom: 'object-bottom'
  };

  return positions[value] || positions.center;
}

function formatInvitationDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(date);
}

function getScheduleTitle(date, fallback) {
  if (!date) return fallback;

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return fallback;

  const day = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(value);
  const numericDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(value).replace(/\//g, '.');

  return `${day} / ${numericDate}`;
}

function getScheduleItems(event) {
  return [
    {
      title: getInvitationText(event, 'ceremonyTitle', ''),
      date: getInvitationText(event, 'ceremonyDate', ''),
      time: getInvitationText(event, 'ceremonyTime', ''),
      venue: getInvitationText(event, 'ceremonyVenue', '')
    },
    {
      title: getInvitationText(event, 'receptionTitle', ''),
      date: getInvitationText(event, 'receptionDate', ''),
      time: getInvitationText(event, 'receptionTime', ''),
      venue: getInvitationText(event, 'receptionVenue', '')
    }
  ].filter((item) => item.title || item.date || item.time || item.venue);
}

function getLoveStoryScenes(event, gallery) {
  const scenes = Array.isArray(event.loveStoryScenes) ? event.loveStoryScenes : [];

  return scenes
    .slice(0, 3)
    .map((scene, index) => ({
      label: String(scene?.label || '').trim(),
      title: String(scene?.title || '').trim(),
      body: String(scene?.body || '').trim(),
      image: String(scene?.image || gallery[index % Math.max(gallery.length, 1)] || '').trim()
    }))
    .filter((scene) => scene.label || scene.title || scene.body || scene.image);
}

function getCountdown(date, now) {
  if (!date) {
    return [
      { label: 'Days', value: '00' },
      { label: 'Hours', value: '00' },
      { label: 'Mins', value: '00' },
      { label: 'Secs', value: '00' }
    ];
  }

  const diff = Math.max(0, new Date(date).getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return [
    { label: 'Days', value: String(days).padStart(2, '0') },
    { label: 'Hours', value: String(hours).padStart(2, '0') },
    { label: 'Mins', value: String(minutes).padStart(2, '0') },
    { label: 'Secs', value: String(seconds).padStart(2, '0') }
  ];
}
