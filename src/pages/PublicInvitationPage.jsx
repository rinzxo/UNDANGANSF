import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, CheckCircle2, Copy, Download, Gift, Landmark, MapPin, Minus, Pause, Play, Plus, Ticket, UserRound, Volume2, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { fetchInvitation, submitInvitationRsvp } from '../api/client.js';
import ManagedCreditFooter from '../layouts/ManagedCreditFooter.jsx';

const defaultLoveStoryScenes = [
  {
    label: 'First Meet',
    title: 'Awal Bertemu',
    body: 'Sebuah pertemuan sederhana yang perlahan menjadi cerita yang ingin terus dijaga.',
    image: ''
  },
  {
    label: 'Closer',
    title: 'Semakin Dekat',
    body: 'Dari percakapan kecil, tumbuh rasa saling mengenal, saling percaya, dan saling pulang.',
    image: ''
  },
  {
    label: 'The Promise',
    title: 'Sebuah Janji',
    body: 'Di antara keluarga dan doa-doa baik, keduanya memilih melangkah bersama.',
    image: ''
  }
];

const defaultHeroEyebrow = 'We Invite You to join our wedding';
const legacyHeroEyebrow = 'Together with their families';
const defaultDateFallbackLabel = 'Tanggal acara akan segera diumumkan';
const defaultLocationFallbackLabel = 'Lokasi acara akan segera diumumkan';
const legacyDateFallbackLabel = 'Date to be announced';
const legacyLocationFallbackLabel = 'Location to be announced';

export default function PublicInvitationPage() {
  const { invitationId } = useParams();
  const qrRef = useRef(null);
  const audioRef = useRef(null);
  const galleryRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [activeLoveStoryIndex, setActiveLoveStoryIndex] = useState(0);
  const [activeHeroPhotoColorIndex, setActiveHeroPhotoColorIndex] = useState(0);
  const [activeGalleryColorIndex, setActiveGalleryColorIndex] = useState(0);
  const [showGiftOptions, setShowGiftOptions] = useState(false);
  const [rsvpForm, setRsvpForm] = useState({ attendance: 'attending', partySize: 1 });
  const [rsvpConfirmed, setRsvpConfirmed] = useState(false);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);

  useEffect(() => {
    async function loadInvitation() {
      try {
        const invitation = await fetchInvitation(invitationId);
        setData(invitation);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Invitation not found');
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [invitationId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    const targets = [...document.querySelectorAll('.reveal')];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [loading, data]);

  useEffect(() => {
    if (loading || !galleryRef.current) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return undefined;

    let frame = 0;

    function updateParallax() {
      frame = 0;
      const galleryNode = galleryRef.current;
      if (!galleryNode) return;

      const rect = galleryNode.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const totalTravel = viewportHeight + rect.height;
      const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / totalTravel));
      const centeredProgress = progress - 0.5;

      galleryNode.querySelectorAll('.cinematic-gallery-frame').forEach((item) => {
        const depth = Number(item.dataset.depth || 0);
        item.style.setProperty('--gallery-parallax', `${centeredProgress * depth}px`);
      });
    }

    function requestUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(updateParallax);
    }

    updateParallax();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [loading, data]);

  useEffect(() => {
    if (loading || !data) return undefined;

    const currentGallery = normalizeGalleryImages(data.event?.galleryImages);
    setActiveGalleryColorIndex(0);
    if (currentGallery.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveGalleryColorIndex((current) => (current + 1) % currentGallery.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [loading, data]);

  useEffect(() => {
    if (loading || !data) return undefined;

    const currentGallery = normalizeGalleryImages(data.event?.galleryImages);
    const currentHeroPhotos = normalizeHeroPhotoStripImages(data.event?.heroPhotoStripImages, currentGallery);
    setActiveHeroPhotoColorIndex(0);
    if (currentHeroPhotos.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveHeroPhotoColorIndex((current) => (current + 1) % currentHeroPhotos.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [loading, data]);

  useEffect(() => {
    if (loading || !data) return undefined;

    const savedRsvp = data.invitation?.rsvp;
    const savedAttendance = savedRsvp?.attendance === 'declined' ? 'declined' : 'attending';
    const savedPartySize = clampPartySize(savedRsvp?.partySize || 1);

    setRsvpForm({
      attendance: savedAttendance,
      partySize: savedAttendance === 'declined' ? 0 : savedPartySize
    });
    setRsvpConfirmed(Boolean(savedRsvp?.confirmedAt || data.invitation?.rsvpConfirmedAt));
  }, [loading, data]);

  useEffect(() => {
    if (loading || !data) return undefined;

    const musicUrl = getInvitationText(data.event, 'musicUrl', '');
    if (!musicUrl) return undefined;

    const audio = audioRef.current;
    if (!audio) return undefined;

    let played = false;

    async function attemptAutoplay() {
      if (!audio.paused && played) return;

      try {
        audio.volume = 0.82;
        await audio.play();
        played = true;
        setIsMusicPlaying(true);
      } catch {
        setIsMusicPlaying(false);
      }
    }

    function playAfterFirstInteraction() {
      if (!played && audio.paused) {
        attemptAutoplay();
      }
    }

    audio.volume = 0.82;
    attemptAutoplay();
    window.addEventListener('pointerdown', playAfterFirstInteraction, { once: true });
    window.addEventListener('keydown', playAfterFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', playAfterFirstInteraction);
      window.removeEventListener('keydown', playAfterFirstInteraction);
    };
  }, [loading, data]);

  function downloadQr() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const passLabel = passIdLabel || 'Pass ID';
    const qrDownloadCanvas = document.createElement('canvas');
    const context = qrDownloadCanvas.getContext('2d');
    if (!context) return;

    qrDownloadCanvas.width = 720;
    qrDownloadCanvas.height = 880;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, qrDownloadCanvas.width, qrDownloadCanvas.height);

    context.strokeStyle = '#e5e0d8';
    context.lineWidth = 2;
    context.strokeRect(36, 36, qrDownloadCanvas.width - 72, qrDownloadCanvas.height - 72);

    context.drawImage(canvas, 150, 86, 420, 420);

    context.fillStyle = '#8a8277';
    context.font = '700 24px Arial, sans-serif';
    context.textAlign = 'center';
    drawSpacedCanvasText(context, passLabel.toUpperCase(), qrDownloadCanvas.width / 2, 610, 5);

    context.fillStyle = '#050505';
    context.font = '700 34px Arial, sans-serif';
    wrapCanvasText(context, passId, qrDownloadCanvas.width / 2, 670, 560, 42);

    const url = qrDownloadCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `invitation-${invitationId}.png`;
    link.click();
  }

  async function playMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setIsMusicPlaying(true);
    } catch {
      toast.error('Tap sekali lagi untuk memutar musik');
    }
  }

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMusicPlaying) {
      audio.pause();
      setIsMusicPlaying(false);
      return;
    }

    await playMusic();
  }

  function updateRsvpAttendance(attendance) {
    setRsvpForm((current) => ({
      attendance,
      partySize: attendance === 'declined' ? 0 : clampPartySize(current.partySize || 1)
    }));
    setRsvpConfirmed(false);
  }

  function updateRsvpPartySize(nextValue) {
    const partySize = clampPartySize(nextValue);
    setRsvpForm((current) => ({
      ...current,
      attendance: 'attending',
      partySize
    }));
    setRsvpConfirmed(false);
  }

  async function confirmRsvp() {
    if (!data) return;

    setRsvpSubmitting(true);
    try {
      const result = await submitInvitationRsvp(invitationId, {
        attendance: rsvpForm.attendance,
        partySize: rsvpForm.attendance === 'declined' ? 0 : rsvpForm.partySize
      });

      setData((current) => ({
        ...current,
        invitation: result.invitation || {
          ...current.invitation,
          rsvp: result.rsvp
        },
        guest: result.guest || current.guest
      }));
      setRsvpConfirmed(true);
      toast.success('RSVP berhasil dikonfirmasi. QR pass sudah terbuka.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan RSVP');
    } finally {
      setRsvpSubmitting(false);
    }
  }

  if (loading) {
    return <div className="card text-center">Preparing your invitation...</div>;
  }

  if (!data) {
    return <div className="card text-center">Invitation unavailable.</div>;
  }

  const { guest, event, invitation } = data;
  const passId = invitation?.qrCodeData || invitation?.id || invitationId;
  const dateFallbackLabel = getDateFallbackLabel(event);
  const locationFallbackLabel = getLocationFallbackLabel(event);
  const guestNameFallback = getInvitationText(event, 'guestNameFallback', 'Nama Tamu');
  const formattedDate = formatInvitationDate(event?.date, dateFallbackLabel);
  const countdown = getCountdown(event?.date, {
    days: getInvitationText(event, 'daysLabel', 'Days'),
    hours: getInvitationText(event, 'hoursLabel', 'Hours'),
    minutes: getInvitationText(event, 'minutesLabel', 'Mins'),
    seconds: getInvitationText(event, 'secondsLabel', 'Secs')
  }, now);
  const heroImage = event?.coverImage || 'https://images.unsplash.com/photo-1519741497674-611481863552';
  const heroImagePosition = getHeroImagePosition(event?.heroImagePosition);
  const coupleNames = getCoupleNames(event);
  const coupleParentLines = getCoupleParentLines(event, coupleNames);
  const gallery = normalizeGalleryImages(event?.galleryImages);
  const heroPhotoStripImages = normalizeHeroPhotoStripImages(event?.heroPhotoStripImages, gallery);
  const heroEyebrow = getHeroEyebrow(event);
  const storyTitle = getInvitationText(event, 'storyTitle', '');
  const storyBody = getInvitationText(event, 'storyBody', '');
  const storyParagraphs = getStoryParagraphs(storyBody);
  const countdownIntroLabel = getInvitationText(event, 'countdownIntroLabel', 'Menuju Hari Bahagia');
  const scheduleTitle = getInvitationText(event, 'scheduleTitle', getScheduleTitle(event?.date, dateFallbackLabel));
  const scheduleItems = getScheduleItems(event);
  const loveStoryTitle = getInvitationText(event, 'loveStoryTitle', 'Our Journey');
  const loveStoryScenes = getLoveStoryScenes(event, gallery);
  const activeLoveStorySafeIndex = Math.min(activeLoveStoryIndex, Math.max(loveStoryScenes.length - 1, 0));
  const activeLoveStoryScene = loveStoryScenes[activeLoveStorySafeIndex] || loveStoryScenes[0];
  const recipientLabel = getInvitationText(event, 'recipientLabel', 'Kepada Yth.');
  const galleryTitle = getInvitationText(event, 'galleryTitle', 'Our Moments');
  const momentsTitle = galleryTitle || 'Our Moments';
  const passEyebrow = getInvitationText(event, 'passEyebrow', 'Guest pass');
  const passTitle = getInvitationText(event, 'passTitle', 'Please present this QR at reception.');
  const categoryLabel = getInvitationText(event, 'categoryLabel', 'Category');
  const tableLabel = getInvitationText(event, 'tableLabel', 'Table');
  const passIdLabel = getInvitationText(event, 'passIdLabel', 'Pass ID');
  const downloadQrLabel = getInvitationText(event, 'downloadQrLabel', 'Download QR');
  const giftTitle = getInvitationText(event, 'giftTitle', 'Wedding Gift');
  const giftDescription = getInvitationText(event, 'giftDescription', '');
  const giftQrisImage = getInvitationText(event, 'giftQrisImage', '');
  const giftQrisLabel = getInvitationText(event, 'giftQrisLabel', 'QRIS Wedding Gift');
  const giftBankAccounts = normalizeGiftBankAccounts(event?.giftBankAccounts);
  const musicTitle = getInvitationText(event, 'musicTitle', 'Wedding Film Score');
  const musicUrl = getInvitationText(event, 'musicUrl', '');
  const footerCopyright = getInvitationText(event, 'footerCopyright', '\u00a9 2026 The Wedding Collective');
  const guestDisplayName = guest?.name || guestNameFallback;
  const rsvpSummary = rsvpForm.attendance === 'declined'
    ? 'Berhalangan hadir'
    : `Hadir ${rsvpForm.partySize} orang`;

  return (
    <section className="overflow-hidden">
      <div className="cinematic-edge-frame" aria-hidden="true">
        <div className="cinematic-edge-rail cinematic-edge-rail-left">
          <span className="cinematic-edge-sweep" />
        </div>
        <div className="cinematic-edge-rail cinematic-edge-rail-right">
          <span className="cinematic-edge-sweep" />
        </div>
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
          <span key={corner} className={`cinematic-edge-corner cinematic-edge-corner-${corner}`}>
            <span className="cinematic-edge-culinary-line" />
            <span className="cinematic-edge-ledger-line" />
            <span className="cinematic-edge-accent" />
          </span>
        ))}
      </div>

      <div className="cinematic-hero relative min-h-[100svh] overflow-hidden border-b border-ink/15">
        <img
          src={heroImage}
          alt=""
          className={`cinematic-hero-image absolute inset-0 h-full w-full object-cover grayscale ${heroImagePosition.className}`}
        />
        <div className="cinematic-hero-glass absolute inset-0" />
        <div className="cinematic-vignette absolute inset-0" />

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-start px-5 pb-28 pt-[22vh] text-center sm:pt-[24vh] lg:pt-[29vh]">
          {heroEyebrow && <p className="cinematic-stagger cinematic-delay-1 cinematic-hero-eyebrow">{heroEyebrow}</p>}
          {heroPhotoStripImages.length > 0 && (
            <div className="cinematic-stagger cinematic-delay-2 cinematic-hero-photo-strip mt-8 grid w-full max-w-[25rem] grid-cols-3 gap-1.5 sm:max-w-2xl sm:gap-3 lg:max-w-4xl">
              {heroPhotoStripImages.map((src, index) => {
                const isColorActive = index === activeHeroPhotoColorIndex % heroPhotoStripImages.length;

                return (
                  <div key={`${src}-${index}`} className="cinematic-hero-photo-card aspect-[2/3] overflow-hidden rounded-md border border-ink/10 bg-white/40 p-1.5 shadow-glow backdrop-blur-sm sm:p-2">
                    <img
                      src={src}
                      alt=""
                      className={`h-full w-full rounded-[3px] object-cover grayscale ${isColorActive ? 'is-color-active' : ''}`}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                );
              })}
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
          <p className="cinematic-stagger cinematic-delay-5 mt-2 text-sm text-ink/55">{event?.location || locationFallbackLabel}</p>
          {event?.description && (
            <p className="cinematic-stagger cinematic-delay-5 mt-6 max-w-xl text-sm leading-7 text-ink/65">{event.description}</p>
          )}

          <div className="cinematic-stagger cinematic-delay-6 mt-12 w-full max-w-[440px]">
            {countdownIntroLabel && (
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/45">
                {countdownIntroLabel}
              </p>
            )}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {countdown.map((item, index) => (
              <div key={index} className="cinematic-countdown-card rounded-md border border-ink/10 bg-white/55 px-2 py-3 shadow-glow backdrop-blur-sm">
                <p key={item.value} className="countdown-tick font-display text-2xl tabular-nums leading-none sm:text-3xl">
                  {item.value}
                </p>
                {item.label && (
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/50 sm:text-[10px]">
                    {item.label}
                  </p>
                )}
              </div>
            ))}
            </div>
          </div>

          <div className="cinematic-stagger cinematic-delay-7 mt-12">
            {recipientLabel && (
              <p className="text-[10px] uppercase tracking-[0.24em] text-ink/45">{recipientLabel}</p>
            )}
            <p className="mt-3 border-b border-ink/15 px-10 pb-3 font-display text-3xl">{guest?.name || guestNameFallback}</p>
          </div>
        </div>
      </div>

      {(scheduleTitle || scheduleItems.length > 0) && (
        <section className="border-b border-ink/10 bg-white px-5 py-20">
          <div className="reveal reveal-blur mx-auto max-w-5xl text-center">
            <p className="eyebrow">Rangkaian Acara</p>
            {scheduleTitle && (
              <h2 className="mt-4 font-display text-4xl uppercase leading-tight sm:text-5xl">
                {scheduleTitle}
              </h2>
            )}
            <div className="mx-auto mt-6 h-px max-w-3xl bg-ink/25" />
            {scheduleItems.length > 0 && (
              <div className="mt-8 grid gap-8 md:grid-cols-2 md:divide-x md:divide-ink/20">
                {scheduleItems.map((item) => (
                  <EventScheduleCard key={item.title} item={item} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {loveStoryScenes.length > 0 && (
        <section className="love-story-cinema border-b border-ink/10 bg-linen px-5 py-14 sm:py-20">
          <div className="reveal reveal-blur mx-auto max-w-4xl text-center">
            <p className="eyebrow">Love Story</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{loveStoryTitle || 'Our Journey'}</h2>
            <div className="mx-auto mt-5 h-px w-12 bg-ink/20" />
          </div>
          <div className="reveal love-story-index mx-auto mt-10 max-w-6xl sm:mt-14">
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
            {activeLoveStoryScene && (
              <LoveStoryIndexPreview scene={activeLoveStoryScene} index={activeLoveStorySafeIndex} />
            )}
          </div>
        </section>
      )}

      {(storyTitle || storyParagraphs.length > 0 || gallery.length > 0) && (
        <section className="border-b border-ink/10 bg-white px-5 py-20">
          <div className="reveal reveal-blur mx-auto max-w-4xl text-center">
            <p className="eyebrow">The Story</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{momentsTitle}</h2>
            <div className="mx-auto mt-5 h-px w-12 bg-ink/20" />
            {storyTitle && (
              <p className="mx-auto mt-8 max-w-2xl font-display text-2xl leading-tight text-ink/90 sm:text-3xl">
                {storyTitle}
              </p>
            )}
            {storyParagraphs.length > 0 && (
              <div className="mx-auto mt-7 max-w-3xl space-y-4 text-sm leading-7 text-ink/62 sm:text-base sm:leading-8">
                {storyParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            )}
          </div>

          {gallery.length > 0 && (
            <div ref={galleryRef} className="mx-auto mt-14 grid max-w-4xl grid-cols-3 gap-3 sm:gap-5">
              {gallery.map((src, index) => {
                const parallaxDepth = getGalleryParallaxDepth(index);
                const stackStyle = getGalleryStackStyle(index);

                return (
                  <div
                    key={`${src}-${index}`}
                    className="reveal cinematic-gallery-frame aspect-square"
                    data-depth={parallaxDepth}
                    style={{
                      '--gallery-delay': `${Math.min(index * 110, 660)}ms`,
                      '--gallery-parallax': '0px',
                      ...stackStyle
                    }}
                  >
                    <img
                      src={src}
                      alt=""
                      className={`cinematic-gallery-image h-full w-full rounded-md border border-ink/10 object-cover grayscale ${
                        index === activeGalleryColorIndex % gallery.length ? 'is-color-active' : ''
                      }`}
                      loading={index > 2 ? 'lazy' : 'eager'}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {(giftQrisImage || giftBankAccounts.length > 0) && (
        <section className="border-b border-ink/10 bg-linen px-5 py-16 sm:py-20">
          <div className="reveal mx-auto max-w-3xl text-center">
            <p className="eyebrow">Gift</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{giftTitle || 'Wedding Gift'}</h2>
            {giftDescription && <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-ink/62">{giftDescription}</p>}
            <button className="button-primary mx-auto mt-8" onClick={() => setShowGiftOptions(true)} type="button">
              <Gift size={18} />
              {giftTitle || 'Wedding Gift'}
            </button>
          </div>
        </section>
      )}

      {showGiftOptions && (
        <GiftOptionsModal
          giftTitle={giftTitle}
          giftDescription={giftDescription}
          giftQrisImage={giftQrisImage}
          giftQrisLabel={giftQrisLabel}
          giftBankAccounts={giftBankAccounts}
          onClose={() => setShowGiftOptions(false)}
        />
      )}

      <section className="border-b border-ink/10 bg-white px-5 py-16 sm:py-20">
        <div className="reveal mx-auto max-w-5xl">
          <div className="rsvp-panel">
            <div className="rsvp-panel-copy">
              <p className="eyebrow">RSVP Kehadiran</p>
              <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Konfirmasi Undangan</h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-ink/62">
                Mohon konfirmasi kehadiran agar QR pass pribadi dapat dibuka untuk proses penerimaan tamu.
              </p>
              {rsvpConfirmed && (
                <div className="rsvp-confirmed-badge">
                  <CheckCircle2 size={16} />
                  <span>{rsvpSummary}</span>
                </div>
              )}
            </div>

            <div className="rsvp-form-shell">
              <div className="rsvp-custom-field">
                <span>Nama</span>
                <strong>{guestDisplayName}</strong>
              </div>

              <div className="rsvp-field-group">
                <p className="rsvp-field-label">Kehadiran</p>
                <div className="rsvp-radio-grid" role="radiogroup" aria-label="Konfirmasi kehadiran">
                  <RsvpChoiceButton
                    active={rsvpForm.attendance === 'attending'}
                    label="Hadir"
                    description="Saya akan datang"
                    onClick={() => updateRsvpAttendance('attending')}
                  />
                  <RsvpChoiceButton
                    active={rsvpForm.attendance === 'declined'}
                    label="Berhalangan"
                    description="Belum bisa hadir"
                    onClick={() => updateRsvpAttendance('declined')}
                  />
                </div>
              </div>

              <div className={`rsvp-field-group ${rsvpForm.attendance === 'declined' ? 'is-muted' : ''}`}>
                <p className="rsvp-field-label">Jumlah orang</p>
                <div className="rsvp-stepper" aria-label="Jumlah orang">
                  <button
                    type="button"
                    onClick={() => updateRsvpPartySize(rsvpForm.partySize - 1)}
                    disabled={rsvpForm.attendance === 'declined' || rsvpForm.partySize <= 1}
                    aria-label="Kurangi jumlah orang"
                  >
                    <Minus size={16} />
                  </button>
                  <span>{rsvpForm.attendance === 'declined' ? 0 : rsvpForm.partySize}</span>
                  <button
                    type="button"
                    onClick={() => updateRsvpPartySize(rsvpForm.partySize + 1)}
                    disabled={rsvpForm.attendance === 'declined' || rsvpForm.partySize >= 20}
                    aria-label="Tambah jumlah orang"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <button className="button-primary rsvp-submit-button" onClick={confirmRsvp} disabled={rsvpSubmitting} type="button">
                <CheckCircle2 size={18} />
                {rsvpSubmitting ? 'Menyimpan...' : 'Konfirmasi RSVP'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="border-y border-ink/15 bg-white">
        <div className="reveal mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="cinematic-pass-panel rounded-lg border border-ink/15 bg-linen p-6 sm:p-8">
            {passEyebrow && <p className="eyebrow">{passEyebrow}</p>}
            {passTitle && <h2 className="mt-4 font-display text-4xl">{passTitle}</h2>}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <InfoPill icon={UserRound} label={guest?.name || guestNameFallback} />
              <InfoPill icon={CalendarDays} label={formattedDate} />
              <InfoPill icon={MapPin} label={event?.location || locationFallbackLabel} />
              <InfoPill icon={Ticket} label={formatDetailLabel(categoryLabel, guest?.category || 'Regular')} />
              <InfoPill icon={Ticket} label={formatDetailLabel(tableLabel, invitation?.tableNumber || '-')} />
            </div>
          </div>

          <div className="cinematic-qr-card rounded-lg border border-ink/15 bg-linen p-8 text-center">
            {rsvpConfirmed ? (
              <>
                <div ref={qrRef} className="mx-auto grid aspect-square max-w-[260px] place-items-center bg-white p-5">
                  <QRCodeCanvas value={invitation?.qrCodeData || invitationId} size={220} includeMargin />
                </div>
                {passIdLabel && <p className="mt-6 text-xs uppercase tracking-[0.24em] text-ink/50">{passIdLabel}</p>}
                <p className="mt-2 break-all text-sm">{passId}</p>
                <button className="button-primary mt-8 w-full" onClick={downloadQr}>
                  <Download size={18} />
                  {downloadQrLabel}
                </button>
              </>
            ) : (
              <div className="qr-locked-state">
                <div className="qr-locked-mark">
                  <Ticket size={34} />
                </div>
                <p className="eyebrow mt-6">QR terkunci</p>
                <h3 className="mt-3 font-display text-3xl leading-tight">Konfirmasi RSVP terlebih dahulu</h3>
                <p className="mt-4 text-sm leading-7 text-ink/58">
                  Setelah tombol konfirmasi ditekan, QR pass pribadi akan tampil di bagian ini.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {musicUrl && (
        <MusicControl
          audioRef={audioRef}
          isPlaying={isMusicPlaying}
          musicTitle={musicTitle}
          musicUrl={musicUrl}
          onToggle={toggleMusic}
          onPause={() => setIsMusicPlaying(false)}
          onPlay={() => setIsMusicPlaying(true)}
        />
      )}

      <ManagedCreditFooter copyright={footerCopyright} />
    </section>
  );
}

function GiftOptionsModal({ giftTitle, giftDescription, giftQrisImage, giftQrisLabel, giftBankAccounts, onClose }) {
  async function copyAccountNumber(accountNumber) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      toast.success('Nomor rekening disalin');
    } catch {
      toast.error('Gagal menyalin nomor rekening');
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-white/70 bg-linen p-5 shadow-glow sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-5">
          <div>
            <p className="eyebrow">Gift Options</p>
            <h2 className="mt-3 font-display text-4xl leading-tight">{giftTitle || 'Wedding Gift'}</h2>
            {giftDescription && <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/62">{giftDescription}</p>}
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/15 bg-white text-ink transition hover:bg-ink hover:text-white"
            onClick={onClose}
            type="button"
            aria-label="Close gift options"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[340px_1fr]">
          {giftQrisImage && (
            <div className="rounded-lg border border-ink/15 bg-white p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/45">{giftQrisLabel || 'QRIS Wedding Gift'}</p>
              <img src={giftQrisImage} alt={giftQrisLabel || 'QRIS Wedding Gift'} className="mx-auto mt-4 aspect-square w-full max-w-[280px] object-contain" loading="lazy" />
            </div>
          )}

          {giftBankAccounts.length > 0 && (
            <div className="grid gap-3">
              {giftBankAccounts.map((account, index) => (
                <div key={`${account.bankName}-${index}`} className="rounded-lg border border-ink/15 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-ink text-white">
                      <Landmark size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/45">{account.bankName || 'Rekening'}</p>
                      <p className="mt-2 break-all font-display text-3xl leading-none">{account.accountNumber}</p>
                      {account.accountName && <p className="mt-2 text-sm font-semibold text-ink/60">a.n. {account.accountName}</p>}
                      {account.accountNumber && (
                        <button className="button-secondary mt-4" onClick={() => copyAccountNumber(account.accountNumber)} type="button">
                          <Copy size={15} />
                          Salin rekening
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RsvpChoiceButton({ active, label, description, onClick }) {
  return (
    <button
      type="button"
      className={`rsvp-choice ${active ? 'is-active' : ''}`}
      role="radio"
      aria-checked={active}
      onClick={onClick}
    >
      <span className="rsvp-choice-mark" aria-hidden="true">
        <span />
      </span>
      <span>
        <strong>{label}</strong>
        <em>{description}</em>
      </span>
    </button>
  );
}

function getInvitationText(event, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(event || {}, key)) return fallback;
  return event?.[key] ?? '';
}

function getHeroImagePosition(value) {
  const positions = {
    top: { className: 'object-top' },
    center: { className: 'object-center' },
    bottom: { className: 'object-bottom' }
  };

  return positions[value] || positions.center;
}

function CoupleName({ names }) {
  if (names.length < 2) return names[0] || 'Alya & Bima';

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

function getCoupleNames(event) {
  const partners = [event?.partnerOneName, event?.partnerTwoName]
    .map((name) => String(name || '').trim())
    .filter(Boolean);

  return partners.length ? partners : [event?.title || 'Alya & Bima'];
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

  return [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=600&q=80'
  ];
}

function normalizeHeroPhotoStripImages(images, fallbackImages = []) {
  const heroImages = Array.isArray(images)
    ? images.map((src) => String(src || '').trim()).filter(Boolean)
    : [];

  return (heroImages.length ? heroImages : fallbackImages).slice(0, 3);
}

function normalizeGiftBankAccounts(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 6).map((account) => ({
    bankName: String(account?.bankName || '').trim(),
    accountNumber: String(account?.accountNumber || '').trim(),
    accountName: String(account?.accountName || '').trim()
  })).filter((account) => account.bankName || account.accountNumber || account.accountName);
}

function getStoryParagraphs(value) {
  return String(value || '')
    .split(/\n{2,}|\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getGalleryParallaxDepth(index) {
  const depths = [-18, 12, -10, 16, -14, 10];
  return depths[index % depths.length];
}

function getGalleryStackStyle(index) {
  const column = index % 3;
  const row = Math.floor(index / 3) % 3;
  const xOffsets = ['68%', '0%', '-68%'];
  const yOffsets = ['66%', '0%', '-66%'];
  const rotations = ['-7deg', '4deg', '8deg', '-4deg', '0deg', '5deg', '-8deg', '3deg', '7deg'];

  return {
    '--gallery-stack-x': xOffsets[column],
    '--gallery-stack-y': yOffsets[row],
    '--gallery-stack-rotate': rotations[index % rotations.length],
    '--gallery-stack-z': 20 - (index % 9)
  };
}

function MusicControl({ audioRef, isPlaying, musicTitle, musicUrl, onToggle, onPause, onPlay }) {
  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-[calc(100vw-2.5rem)]">
      <audio ref={audioRef} src={musicUrl} loop preload="auto" autoPlay onPause={onPause} onPlay={onPlay} />
      <button
        className="group flex max-w-[260px] items-center gap-3 rounded-full border border-ink/15 bg-white/90 px-3 py-2 text-left shadow-glow backdrop-blur-md transition hover:border-ink"
        onClick={onToggle}
        type="button"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white">
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-ink/45">
            <Volume2 size={12} />
            Music
          </span>
          <span className="block truncate text-xs font-semibold text-ink/75">{musicTitle || 'Wedding Film Score'}</span>
        </span>
      </button>
    </div>
  );
}

function formatDetailLabel(label, value) {
  return label ? `${label}: ${value}` : value;
}

function clampPartySize(value) {
  return Math.min(20, Math.max(1, Number.parseInt(value, 10) || 1));
}

function EventScheduleCard({ item }) {
  return (
    <div className="px-0 text-center md:px-8">
      {item.title && <h3 className="font-display text-3xl uppercase tracking-wide">{item.title}</h3>}
      <div className="mx-auto mt-3 h-px w-14 bg-ink/20" />
      <div className="mt-5 space-y-2 text-sm leading-6 text-ink/68">
        {item.date && <p>{item.date}</p>}
        {item.time && <p>{item.time}</p>}
        {item.venue && <p className="font-semibold text-ink/78">Alamat : {item.venue}</p>}
        {item.address && <p className="mx-auto max-w-md">{item.address}</p>}
      </div>
    </div>
  );
}

function LoveStoryIndexPreview({ scene, index }) {
  return (
    <article className="love-story-index-preview">
      <figure className="love-story-index-image">
        {scene.image ? (
          <img src={scene.image} alt="" loading={index > 1 ? 'lazy' : 'eager'} />
        ) : (
          <div className="grid h-full place-items-center bg-white text-ink/35">
            <span className="h-px w-16 bg-ink/20" />
          </div>
        )}
      </figure>
      <div className="love-story-index-copy">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-ink/35">
          {String(index + 1).padStart(2, '0')}
        </p>
        {scene.label && <p className="eyebrow mt-4">{scene.label}</p>}
        {scene.title && <h3 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{scene.title}</h3>}
        {scene.body && (
          <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/62 sm:text-base sm:leading-8">
            {scene.body}
          </p>
        )}
      </div>
    </article>
  );
}

function InfoPill({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-ink/15 bg-white p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink text-white">
        <Icon size={18} />
      </span>
      <span className="text-sm font-semibold leading-5 text-ink/75">{label}</span>
    </div>
  );
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '').split(/(\s|-)/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine}${word}` : word;
    if (context.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine.trim());
      currentLine = word.trim();
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) lines.push(currentLine.trim());

  const visibleLines = lines.slice(0, 3);
  visibleLines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function drawSpacedCanvasText(context, text, x, y, spacing) {
  const chars = String(text || '').split('');
  const totalWidth = chars.reduce((sum, char) => sum + context.measureText(char).width, 0)
    + Math.max(chars.length - 1, 0) * spacing;
  let cursor = x - totalWidth / 2;

  chars.forEach((char) => {
    context.fillText(char, cursor + context.measureText(char).width / 2, y);
    cursor += context.measureText(char).width + spacing;
  });
}

function getHeroEyebrow(event) {
  const value = getInvitationText(event, 'heroEyebrow', defaultHeroEyebrow);
  return value === legacyHeroEyebrow ? defaultHeroEyebrow : value;
}

function getDateFallbackLabel(event) {
  const value = getInvitationText(event, 'dateFallbackLabel', '');
  if (value && value !== legacyDateFallbackLabel) return value;
  return formatInvitationDate(event?.date, defaultDateFallbackLabel);
}

function getLocationFallbackLabel(event) {
  const value = getInvitationText(event, 'locationFallbackLabel', '');
  if (value && value !== legacyLocationFallbackLabel) return value;
  return event?.location || defaultLocationFallbackLabel;
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
  const items = [
    {
      title: getInvitationText(event, 'ceremonyTitle', ''),
      date: getInvitationText(event, 'ceremonyDate', ''),
      time: getInvitationText(event, 'ceremonyTime', ''),
      venue: getInvitationText(event, 'ceremonyVenue', ''),
      address: getInvitationText(event, 'ceremonyAddress', '')
    },
    {
      title: getInvitationText(event, 'receptionTitle', ''),
      date: getInvitationText(event, 'receptionDate', ''),
      time: getInvitationText(event, 'receptionTime', ''),
      venue: getInvitationText(event, 'receptionVenue', ''),
      address: getInvitationText(event, 'receptionAddress', '')
    }
  ];

  return items.filter((item) => Object.values(item).some(Boolean));
}

function getLoveStoryScenes(event, gallery = []) {
  const scenes = Array.isArray(event?.loveStoryScenes) ? event.loveStoryScenes : defaultLoveStoryScenes;

  return scenes
    .slice(0, 3)
    .map((scene, index) => {
      const label = String(scene?.label || '').trim();
      const title = String(scene?.title || '').trim();
      const body = String(scene?.body || '').trim();
      const image = String(scene?.image || '').trim();
      const hasContent = Boolean(label || title || body || image);

      if (!hasContent) return null;

      return {
        label,
        title,
        body,
        image: image || gallery[index % Math.max(gallery.length, 1)] || ''
      };
    })
    .filter(Boolean);
}

function getCountdown(date, labels, now) {
  if (!date) {
    return [
      { label: labels.days, value: '00' },
      { label: labels.hours, value: '00' },
      { label: labels.minutes, value: '00' },
      { label: labels.seconds, value: '00' }
    ];
  }

  const diff = Math.max(0, new Date(date).getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return [
    { label: labels.days, value: String(days).padStart(2, '0') },
    { label: labels.hours, value: String(hours).padStart(2, '0') },
    { label: labels.minutes, value: String(minutes).padStart(2, '0') },
    { label: labels.seconds, value: String(seconds).padStart(2, '0') }
  ];
}
