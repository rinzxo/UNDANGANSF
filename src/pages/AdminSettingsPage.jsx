import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, CalendarDays, Download, Gift, Image, Landmark, MapPin, Music, RefreshCcw, Save, Ticket, Type, Upload, X } from 'lucide-react';
import { fetchEventSettings, updateEventSettings, uploadEventAudio, uploadEventImage } from '../api/client.js';

const defaultGalleryImages = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=600&q=80'
];

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

const defaultForm = {
  title: '',
  partnerOneName: '',
  partnerTwoName: '',
  partnerOneParentLine: '',
  partnerTwoParentLine: '',
  date: '',
  location: '',
  coverImage: '',
  heroImagePosition: 'center',
  heroPhotoStripImages: [],
  description: '',
  heroEyebrow: defaultHeroEyebrow,
  storyTitle: '',
  storyBody: 'What begins as a quiet promise becomes a day held by family, friendship, and every small detail that made the journey unforgettable.',
  countdownIntroLabel: 'Menuju Hari Bahagia',
  dateFallbackLabel: defaultDateFallbackLabel,
  locationFallbackLabel: defaultLocationFallbackLabel,
  scheduleTitle: 'Selasa / 02.06.2026',
  ceremonyTitle: 'Akad',
  ceremonyDate: 'Selasa, 02 Juni 2026',
  ceremonyTime: 'Pukul : 13.00',
  ceremonyVenue: 'KUA Kec. Tanah Abang',
  ceremonyAddress: 'Jl. Mutiara No.2A 17, RT.17/RW.5, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10220',
  receptionTitle: 'Resepsi',
  receptionDate: 'Selasa, 02 Juni 2026',
  receptionTime: 'Pukul : 16.00 - 20.00',
  receptionVenue: 'Oemah Lesmana Resto & Venue',
  receptionAddress: 'Jl. Karang Tengah Raya No.37, RT/RW:06/RW.3, Lb. Bulus, Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12440',
  loveStoryTitle: 'Our Journey',
  loveStoryScenes: defaultLoveStoryScenes,
  recipientLabel: 'Kepada Yth.',
  guestNameFallback: 'Nama Tamu',
  daysLabel: 'Days',
  hoursLabel: 'Hours',
  minutesLabel: 'Mins',
  secondsLabel: 'Secs',
  galleryTitle: 'Our Moments',
  galleryImages: defaultGalleryImages,
  passEyebrow: 'Guest pass',
  passTitle: 'Please present this QR at reception.',
  categoryLabel: 'Category',
  tableLabel: 'Table',
  passIdLabel: 'Pass ID',
  downloadQrLabel: 'Download QR',
  giftTitle: 'Wedding Gift',
  giftDescription: 'Doa restu Anda adalah hadiah terindah. Jika berkenan, tanda kasih dapat dikirim melalui QRIS atau rekening berikut.',
  giftQrisImage: '',
  giftQrisLabel: 'QRIS Wedding Gift',
  giftBankAccounts: [],
  musicTitle: 'Wedding Film Score',
  musicUrl: '',
  footerCopyright: '\u00a9 2026 The Wedding Collective'
};

const imageCropProfiles = {
  cover: {
    title: 'Crop hero image',
    description: 'Frame hero image memakai rasio 16:9 agar background tetap rapi saat tampil di undangan.',
    aspect: 16 / 9,
    frameLabel: '16:9',
    outputWidth: 1600,
    outputHeight: 900,
    uploadingKey: 'cover'
  },
  heroStrip: {
    title: 'Crop hero photo strip',
    description: 'Frame 3 foto hero memakai rasio 2:3 supaya tampil penuh dan dominan sebelum nama pasangan.',
    aspect: 2 / 3,
    frameLabel: '2:3',
    outputWidth: 900,
    outputHeight: 1350,
    uploadingKey: 'heroStrip'
  },
  gallery: {
    title: 'Crop gallery image',
    description: 'Our Moments memakai frame square agar grid 3 kolom tetap konsisten.',
    aspect: 1,
    frameLabel: '1:1',
    outputWidth: 1000,
    outputHeight: 1000,
    uploadingKey: 'gallery'
  },
  loveStory: {
    title: 'Crop love story image',
    description: 'Frame Our Journey memakai rasio 16:10, sama seperti preview Minimal Film Index di undangan.',
    aspect: 16 / 10,
    frameLabel: '16:10',
    outputWidth: 1600,
    outputHeight: 1000,
    uploadingKey: 'loveStory'
  },
  giftQris: {
    title: 'Crop QRIS gift',
    description: 'QRIS memakai frame square supaya kode tetap mudah dipindai.',
    aspect: 1,
    frameLabel: '1:1',
    outputWidth: 1200,
    outputHeight: 1200,
    uploadingKey: 'giftQris'
  }
};

const defaultCropSettings = {
  zoom: 1,
  x: 0,
  y: 0
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState(defaultForm);
  const formRef = useRef(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cropRequest, setCropRequest] = useState(null);
  const [cropSettings, setCropSettings] = useState(defaultCropSettings);
  const [uploading, setUploading] = useState({
    cover: false,
    heroStrip: false,
    gallery: false,
    loveStory: false,
    giftQris: false,
    music: false
  });

  async function loadSettings() {
    setLoading(true);
    try {
      const event = await fetchEventSettings();
      setForm(eventToForm(event));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load event settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (uploading.cover || uploading.heroStrip || uploading.gallery || uploading.loveStory || uploading.giftQris || uploading.music) {
      toast.error('Tunggu upload selesai dulu');
      return;
    }

    if (!form.title.trim() && !form.partnerOneName.trim() && !form.partnerTwoName.trim()) {
      toast.error('Isi minimal judul acara atau salah satu nama pasangan');
      return;
    }

    setSaving(true);
    try {
      const updatedEvent = await updateEventSettings(formToPayload(form));
      setForm(eventToForm(updatedEvent));
      toast.success('Invitation content saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save event settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    startImageCropQueue('cover', [{ file, label: 'cover-image' }]);
  }

  async function handleGalleryUpload(event) {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;

    startImageCropQueue('gallery', files.map((file, index) => ({
      file,
      label: `gallery-${form.galleryImages.length + index + 1}`
    })));
  }

  async function handleHeroPhotoStripUpload(event) {
    const selectedFiles = [...(event.target.files || [])];
    event.target.value = '';
    if (!selectedFiles.length) return;

    const remainingSlots = Math.max(0, 3 - form.heroPhotoStripImages.length);
    if (!remainingSlots) {
      toast.error('Hero photo strip maksimal 3 foto');
      return;
    }

    const files = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      toast.error(`Hanya ${remainingSlots} foto yang ditambahkan karena maksimal 3 foto`);
    }

    startImageCropQueue('heroStrip', files.map((file, index) => ({
      file,
      label: `hero-strip-${form.heroPhotoStripImages.length + index + 1}`
    })));
  }

  function handleLoveStorySceneImageUpload(event, sceneIndex) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    startImageCropQueue('loveStory', [{
      file,
      label: `love-story-${sceneIndex + 1}`,
      sceneIndex
    }]);
  }

  function handleGiftQrisUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    startImageCropQueue('giftQris', [{ file, label: 'gift-qris' }]);
  }

  function startImageCropQueue(mode, files) {
    const invalidFile = files.find((item) => !item.file.type.startsWith('image/'));
    if (invalidFile) {
      toast.error('File harus berupa gambar');
      return;
    }

    setCropRequest({
      mode,
      files,
      index: 0,
      profile: imageCropProfiles[mode]
    });
    setCropSettings(defaultCropSettings);
  }

  async function handleCropConfirm() {
    if (!cropRequest) return;

    const currentItem = cropRequest.files[cropRequest.index];
    const uploadingKey = cropRequest.profile.uploadingKey;

    setUploadingField(setUploading, uploadingKey, true);
    try {
      let imageBase64;
      try {
        imageBase64 = await cropImageFile(currentItem.file, cropRequest.profile, cropSettings);
      } catch (cropErr) {
        console.warn('Crop failed, uploading original image instead.', cropErr);
        imageBase64 = await fileToDataUrl(currentItem.file);
      }

      const image = await uploadEventImage({
        imageBase64,
        label: currentItem.label
      });

      const nextForm = getFormWithUploadedCroppedImage(formRef.current, cropRequest.mode, image.url);
      setForm(nextForm);
      formRef.current = nextForm;

      const updatedEvent = await updateEventSettings(formToPayload(nextForm));
      const savedForm = eventToForm(updatedEvent);
      setForm(savedForm);
      formRef.current = savedForm;

      const nextIndex = cropRequest.index + 1;
      if (nextIndex < cropRequest.files.length) {
        setCropRequest((current) => ({
          ...current,
          index: nextIndex
        }));
        setCropSettings(defaultCropSettings);
      } else {
        setCropRequest(null);
        toast.success(`${cropRequest.files.length} image${cropRequest.files.length > 1 ? 's' : ''} cropped, uploaded, and saved`);
      }
    } catch (err) {
      console.error('Image upload failed', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to upload image');
    } finally {
      setUploadingField(setUploading, uploadingKey, false);
    }
  }

  function getFormWithUploadedCroppedImage(current, mode, url) {
    if (mode === 'cover') {
      return {
        ...current,
        coverImage: url
      };
    }

    if (mode === 'heroStrip') {
      return {
        ...current,
        heroPhotoStripImages: [...current.heroPhotoStripImages, url].slice(0, 3)
      };
    }

    if (mode === 'loveStory') {
      const sceneIndex = cropRequest.files[cropRequest.index]?.sceneIndex ?? 0;
      return {
        ...current,
        loveStoryScenes: current.loveStoryScenes.map((scene, index) => (
          index === sceneIndex ? { ...scene, image: url } : scene
        ))
      };
    }

    if (mode === 'giftQris') {
      return {
        ...current,
        giftQrisImage: url
      };
    }

    return {
      ...current,
      galleryImages: [...current.galleryImages, url]
    };
  }

  async function handleMusicUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingField(setUploading, 'music', true);
    try {
      const audio = await uploadAudioFile(file, 'wedding-music');
      updateField(setForm, 'musicUrl', audio.url);
      if (!form.musicTitle.trim()) {
        updateField(setForm, 'musicTitle', file.name.replace(/\.[^.]+$/, ''));
      }
      toast.success('Music uploaded to Cloudinary');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to upload music');
    } finally {
      setUploadingField(setUploading, 'music', false);
    }
  }

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-5 border-b border-ink/15 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">CMS Settings</p>
          <h1 className="mt-3 font-display text-4xl leading-none sm:text-5xl">Invitation Content</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
            Atur nama pasangan, teks, gambar, label pass, dan footer yang tampil di undangan digital tamu.
          </p>
        </div>
        <button className="button-secondary" onClick={loadSettings} disabled={loading || saving}>
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form className="rounded-lg border border-ink/15 bg-white p-5" onSubmit={handleSubmit}>
          <FormSection eyebrow="Utama" title="Nama, tanggal, dan lokasi">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nama pasangan pertama" icon={Type}>
                <input
                  className="field"
                  value={form.partnerOneName}
                  onChange={(event) => updateField(setForm, 'partnerOneName', event.target.value)}
                  placeholder="Alya"
                />
              </Field>

              <Field label="Nama pasangan kedua" icon={Type}>
                <input
                  className="field"
                  value={form.partnerTwoName}
                  onChange={(event) => updateField(setForm, 'partnerTwoName', event.target.value)}
                  placeholder="Bima"
                />
              </Field>

              <Field label="Keterangan pasangan pertama" icon={Type}>
                <textarea
                  className="field min-h-20 resize-y leading-6"
                  value={form.partnerOneParentLine}
                  onChange={(event) => updateField(setForm, 'partnerOneParentLine', event.target.value)}
                  placeholder="Putra ketiga dari Bpk. Zahari & Ibu Mintarsih"
                />
              </Field>

              <Field label="Keterangan pasangan kedua" icon={Type}>
                <textarea
                  className="field min-h-20 resize-y leading-6"
                  value={form.partnerTwoParentLine}
                  onChange={(event) => updateField(setForm, 'partnerTwoParentLine', event.target.value)}
                  placeholder="Putri ... dari Bpk. ... & Ibu ..."
                />
              </Field>

              <Field label="Event title" icon={Type}>
                <input
                  className="field"
                  value={form.title}
                  onChange={(event) => updateField(setForm, 'title', event.target.value)}
                  placeholder="The Wedding Celebration"
                />
              </Field>

              <Field label="Event date" icon={CalendarDays}>
                <input
                  className="field"
                  type="datetime-local"
                  value={form.date}
                  onChange={(event) => updateField(setForm, 'date', event.target.value)}
                />
              </Field>

              <Field label="Location" icon={MapPin}>
                <input
                  className="field"
                  value={form.location}
                  onChange={(event) => updateField(setForm, 'location', event.target.value)}
                  placeholder="Venue, City"
                />
              </Field>

              <Field label="Hero image" icon={Image}>
                <ImageUploadControl
                  id="cover-image-upload"
                  multiple={false}
                  uploading={uploading.cover}
                  onChange={handleCoverUpload}
                  label={form.coverImage ? 'Replace hero image' : 'Upload hero image'}
                />
                {form.coverImage && (
                  <div className="mt-4 overflow-hidden rounded-md border border-ink/15 bg-linen">
                    <img src={form.coverImage} alt="" className="aspect-[16/9] w-full object-cover grayscale" />
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 border-t border-ink/15 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-ink transition hover:bg-ink hover:text-white"
                      onClick={() => updateField(setForm, 'coverImage', '')}
                    >
                      <X size={14} />
                      Remove hero
                    </button>
                  </div>
                )}
              </Field>

              <Field label="Hero image position" icon={Image}>
                <select
                  className="field"
                  value={form.heroImagePosition}
                  onChange={(event) => updateField(setForm, 'heroImagePosition', event.target.value)}
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Hero photo strip" icon={Image}>
                  <ImageUploadControl
                    id="hero-photo-strip-upload"
                    multiple
                    uploading={uploading.heroStrip}
                    onChange={handleHeroPhotoStripUpload}
                    label={form.heroPhotoStripImages.length ? 'Add hero photos' : 'Upload 3 hero photos'}
                  />
                  <p className="mt-2 text-xs leading-5 text-ink/50">
                    Maksimal 3 foto. Foto ini tampil sejajar horizontal di hero sebelum nama pasangan.
                  </p>
                  {form.heroPhotoStripImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {form.heroPhotoStripImages.map((src, index) => (
                        <div key={`${src}-${index}`} className="group relative overflow-hidden rounded-md border border-ink/15 bg-linen">
                          <img src={src} alt="" className="aspect-[4/5] w-full object-cover grayscale" />
                          <button
                            type="button"
                            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md bg-white/95 text-ink shadow-glow transition hover:bg-ink hover:text-white"
                            onClick={() => removeHeroPhotoStripImage(setForm, index)}
                            aria-label="Remove hero photo"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Opening description" icon={Type}>
                  <textarea
                    className="field min-h-28 resize-y leading-6"
                    value={form.description}
                    onChange={(event) => updateField(setForm, 'description', event.target.value)}
                    placeholder="Short greeting or event description"
                  />
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection eyebrow="Teks Undangan" title="Hero, Our Moments, dan penerima">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hero eyebrow" icon={Type}>
                <input
                  className="field"
                  value={form.heroEyebrow}
                  onChange={(event) => updateField(setForm, 'heroEyebrow', event.target.value)}
                  placeholder="Together with their families"
                />
              </Field>

              <Field label="Countdown intro label" icon={CalendarDays}>
                <input
                  className="field"
                  value={form.countdownIntroLabel}
                  onChange={(event) => updateField(setForm, 'countdownIntroLabel', event.target.value)}
                  placeholder="Menuju Hari Bahagia"
                />
              </Field>

              <Field label="Recipient label" icon={Type}>
                <input
                  className="field"
                  value={form.recipientLabel}
                  onChange={(event) => updateField(setForm, 'recipientLabel', event.target.value)}
                  placeholder="Kepada Yth."
                />
              </Field>

              <Field label="Guest name fallback" icon={Type}>
                <input
                  className="field"
                  value={form.guestNameFallback}
                  onChange={(event) => updateField(setForm, 'guestNameFallback', event.target.value)}
                  placeholder="Nama Tamu"
                />
              </Field>

              <Field label="Date fallback" icon={CalendarDays}>
                <input
                  className="field"
                  value={form.dateFallbackLabel}
                  onChange={(event) => updateField(setForm, 'dateFallbackLabel', event.target.value)}
                  placeholder={formatDateLabel(form.date, defaultForm.dateFallbackLabel)}
                />
              </Field>

              <Field label="Location fallback" icon={MapPin}>
                <input
                  className="field"
                  value={form.locationFallbackLabel}
                  onChange={(event) => updateField(setForm, 'locationFallbackLabel', event.target.value)}
                  placeholder={form.location || defaultForm.locationFallbackLabel}
                />
              </Field>

              <div className="md:col-span-2">
                <div className="rounded-lg border border-ink/10 bg-linen p-4">
                  <div className="mb-4">
                    <p className="eyebrow">Akad & Resepsi</p>
                    <h3 className="mt-2 font-display text-2xl">Detail jadwal acara</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Field label="Schedule headline" icon={CalendarDays}>
                        <input
                          className="field"
                          value={form.scheduleTitle}
                          onChange={(event) => updateField(setForm, 'scheduleTitle', event.target.value)}
                          placeholder="Selasa / 02.06.2026"
                        />
                      </Field>
                    </div>

                    <EventScheduleFields
                      titlePrefix="Akad"
                      titleKey="ceremonyTitle"
                      dateKey="ceremonyDate"
                      timeKey="ceremonyTime"
                      venueKey="ceremonyVenue"
                      addressKey="ceremonyAddress"
                      form={form}
                      setForm={setForm}
                    />

                    <EventScheduleFields
                      titlePrefix="Resepsi"
                      titleKey="receptionTitle"
                      dateKey="receptionDate"
                      timeKey="receptionTime"
                      venueKey="receptionVenue"
                      addressKey="receptionAddress"
                      form={form}
                      setForm={setForm}
                    />
                  </div>
                </div>
              </div>

              <Field label="Section title" icon={Image}>
                <input
                  className="field"
                  value={form.galleryTitle}
                  onChange={(event) => updateField(setForm, 'galleryTitle', event.target.value)}
                  placeholder="Our Moments"
                />
              </Field>

              <Field label="Story heading" icon={Type}>
                <input
                  className="field"
                  value={form.storyTitle}
                  onChange={(event) => updateField(setForm, 'storyTitle', event.target.value)}
                  placeholder="A Little Story"
                />
              </Field>

              <div className="md:col-span-2">
                <div className="rounded-lg border border-ink/10 bg-linen p-4">
                  <div className="mb-4">
                    <p className="eyebrow">Love Story</p>
                    <h3 className="mt-2 font-display text-2xl">3 cinematic chapters</h3>
                  </div>
                  <div className="grid gap-4">
                    <Field label="Love story title" icon={Type}>
                      <input
                        className="field"
                        value={form.loveStoryTitle}
                        onChange={(event) => updateField(setForm, 'loveStoryTitle', event.target.value)}
                        placeholder="Our Journey"
                      />
                    </Field>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {form.loveStoryScenes.map((scene, index) => (
                        <LoveStorySceneFields
                          key={index}
                          index={index}
                          scene={scene}
                          uploading={uploading.loveStory}
                          onChange={(key, value) => updateLoveStoryScene(setForm, index, key, value)}
                          onUpload={(event) => handleLoveStorySceneImageUpload(event, index)}
                          onRemoveImage={() => updateLoveStoryScene(setForm, index, 'image', '')}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Field label="Footer copyright" icon={Type}>
                <input
                  className="field"
                  value={form.footerCopyright}
                  onChange={(event) => updateField(setForm, 'footerCopyright', event.target.value)}
                  placeholder="Kosongkan untuk menyembunyikan footer"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Story narrative" icon={Type}>
                  <textarea
                    className="field min-h-28 resize-y leading-6"
                    value={form.storyBody}
                    onChange={(event) => updateField(setForm, 'storyBody', event.target.value)}
                    placeholder="Write a short cinematic story for the couple."
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Gallery images" icon={Image}>
                  <ImageUploadControl
                    id="gallery-image-upload"
                    multiple
                    uploading={uploading.gallery}
                    onChange={handleGalleryUpload}
                    label="Upload gallery images"
                  />
                  {form.galleryImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {form.galleryImages.map((src, index) => (
                        <div key={`${src}-${index}`} className="group relative overflow-hidden rounded-md border border-ink/15 bg-linen">
                          <img src={src} alt="" className="aspect-square w-full object-cover grayscale" />
                          <div className="absolute left-2 top-2 flex gap-1">
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-md bg-white/95 text-ink shadow-glow transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => moveGalleryImage(setForm, index, -1)}
                              disabled={index === 0}
                              aria-label="Move gallery image up"
                            >
                              <ArrowUp size={15} />
                            </button>
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-md bg-white/95 text-ink shadow-glow transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => moveGalleryImage(setForm, index, 1)}
                              disabled={index === form.galleryImages.length - 1}
                              aria-label="Move gallery image down"
                            >
                              <ArrowDown size={15} />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md bg-white/95 text-ink shadow-glow transition hover:bg-ink hover:text-white"
                            onClick={() => removeGalleryImage(setForm, index)}
                            aria-label="Remove gallery image"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Music" icon={Music}>
                  <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_auto] md:items-center">
                    <input
                      className="field"
                      value={form.musicTitle}
                      onChange={(event) => updateField(setForm, 'musicTitle', event.target.value)}
                      placeholder="Wedding Film Score"
                    />
                    <AudioUploadControl
                      id="music-upload"
                      uploading={uploading.music}
                      onChange={handleMusicUpload}
                      label={form.musicUrl ? 'Replace music' : 'Upload music'}
                    />
                  </div>
                  {form.musicUrl && (
                    <div className="mt-4 rounded-md border border-ink/15 bg-linen p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <audio controls src={form.musicUrl} className="h-10 w-full sm:max-w-md" />
                        <button
                          type="button"
                          className="button-secondary shrink-0"
                          onClick={() => updateField(setForm, 'musicUrl', '')}
                        >
                          <X size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection eyebrow="Gift" title="QRIS dan rekening">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Gift title" icon={Gift}>
                <input
                  className="field"
                  value={form.giftTitle}
                  onChange={(event) => updateField(setForm, 'giftTitle', event.target.value)}
                  placeholder="Wedding Gift"
                />
              </Field>

              <Field label="QRIS label" icon={Gift}>
                <input
                  className="field"
                  value={form.giftQrisLabel}
                  onChange={(event) => updateField(setForm, 'giftQrisLabel', event.target.value)}
                  placeholder="QRIS Wedding Gift"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Gift description" icon={Type}>
                  <textarea
                    className="field min-h-24 resize-y leading-6"
                    value={form.giftDescription}
                    onChange={(event) => updateField(setForm, 'giftDescription', event.target.value)}
                    placeholder="Ucapan singkat untuk tamu yang ingin memberi tanda kasih."
                  />
                </Field>
              </div>

              <Field label="QRIS image" icon={Image}>
                <ImageUploadControl
                  id="gift-qris-upload"
                  multiple={false}
                  uploading={uploading.giftQris}
                  onChange={handleGiftQrisUpload}
                  label={form.giftQrisImage ? 'Replace QRIS' : 'Upload QRIS'}
                />
                {form.giftQrisImage && (
                  <div className="mt-4 overflow-hidden rounded-md border border-ink/15 bg-linen">
                    <img src={form.giftQrisImage} alt="" className="aspect-square w-full object-contain p-4" />
                    <button
                      type="button"
                      className="button-secondary m-3"
                      onClick={() => updateField(setForm, 'giftQrisImage', '')}
                    >
                      <X size={14} />
                      Remove QRIS
                    </button>
                  </div>
                )}
              </Field>

              <Field label="Bank accounts" icon={Landmark}>
                <div className="grid gap-3">
                  {form.giftBankAccounts.map((account, index) => (
                    <div key={index} className="rounded-md border border-ink/15 bg-linen p-3">
                      <div className="grid gap-2">
                        <input
                          className="field"
                          value={account.bankName}
                          onChange={(event) => updateGiftBankAccount(setForm, index, 'bankName', event.target.value)}
                          placeholder="BCA / Mandiri / BRI"
                        />
                        <input
                          className="field"
                          value={account.accountNumber}
                          onChange={(event) => updateGiftBankAccount(setForm, index, 'accountNumber', event.target.value)}
                          placeholder="Nomor rekening"
                        />
                        <input
                          className="field"
                          value={account.accountName}
                          onChange={(event) => updateGiftBankAccount(setForm, index, 'accountName', event.target.value)}
                          placeholder="Atas nama"
                        />
                      </div>
                      <button
                        type="button"
                        className="button-secondary mt-3"
                        onClick={() => removeGiftBankAccount(setForm, index)}
                      >
                        <X size={14} />
                        Remove rekening
                      </button>
                    </div>
                  ))}
                  <button type="button" className="button-secondary" onClick={() => addGiftBankAccount(setForm)}>
                    <Landmark size={16} />
                    Add rekening
                  </button>
                </div>
              </Field>
            </div>
          </FormSection>

          <FormSection eyebrow="Guest Pass" title="QR dan label detail tamu">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Countdown days label" icon={CalendarDays}>
                <input
                  className="field"
                  value={form.daysLabel}
                  onChange={(event) => updateField(setForm, 'daysLabel', event.target.value)}
                  placeholder="Days"
                />
              </Field>

              <Field label="Countdown hours label" icon={CalendarDays}>
                <input
                  className="field"
                  value={form.hoursLabel}
                  onChange={(event) => updateField(setForm, 'hoursLabel', event.target.value)}
                  placeholder="Hours"
                />
              </Field>

              <Field label="Countdown minutes label" icon={CalendarDays}>
                <input
                  className="field"
                  value={form.minutesLabel}
                  onChange={(event) => updateField(setForm, 'minutesLabel', event.target.value)}
                  placeholder="Mins"
                />
              </Field>

              <Field label="Countdown seconds label" icon={CalendarDays}>
                <input
                  className="field"
                  value={form.secondsLabel}
                  onChange={(event) => updateField(setForm, 'secondsLabel', event.target.value)}
                  placeholder="Secs"
                />
              </Field>

              <Field label="Pass eyebrow" icon={Ticket}>
                <input
                  className="field"
                  value={form.passEyebrow}
                  onChange={(event) => updateField(setForm, 'passEyebrow', event.target.value)}
                  placeholder="Guest pass"
                />
              </Field>

              <Field label="Pass title" icon={Ticket}>
                <input
                  className="field"
                  value={form.passTitle}
                  onChange={(event) => updateField(setForm, 'passTitle', event.target.value)}
                  placeholder="Please present this QR at reception."
                />
              </Field>

              <Field label="Category label" icon={Ticket}>
                <input
                  className="field"
                  value={form.categoryLabel}
                  onChange={(event) => updateField(setForm, 'categoryLabel', event.target.value)}
                  placeholder="Category"
                />
              </Field>

              <Field label="Table label" icon={Ticket}>
                <input
                  className="field"
                  value={form.tableLabel}
                  onChange={(event) => updateField(setForm, 'tableLabel', event.target.value)}
                  placeholder="Table"
                />
              </Field>

              <Field label="Pass ID label" icon={Ticket}>
                <input
                  className="field"
                  value={form.passIdLabel}
                  onChange={(event) => updateField(setForm, 'passIdLabel', event.target.value)}
                  placeholder="Pass ID"
                />
              </Field>

              <Field label="Download button label" icon={Download}>
                <input
                  className="field"
                  value={form.downloadQrLabel}
                  onChange={(event) => updateField(setForm, 'downloadQrLabel', event.target.value)}
                  placeholder="Download QR"
                />
              </Field>
            </div>
          </FormSection>

          <div className="mt-6 flex flex-col gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-ink/50">
              Field yang dikosongkan akan ikut kosong atau disembunyikan di halaman undangan publik.
            </p>
            <button className="button-primary" disabled={saving || loading || Boolean(cropRequest) || uploading.cover || uploading.heroStrip || uploading.gallery || uploading.loveStory || uploading.giftQris || uploading.music}>
              <Save size={16} />
              {saving ? 'Saving' : 'Save Content'}
            </button>
          </div>
        </form>

        <aside className="rounded-lg border border-ink/15 bg-white p-5">
          <p className="eyebrow">Preview</p>
          <div className="mt-4 overflow-hidden rounded-md border border-ink/15 bg-linen">
            <div className="aspect-[4/3] bg-ink/10">
              {form.coverImage ? (
                <img src={form.coverImage} alt="" className="h-full w-full object-cover grayscale" />
              ) : (
                <div className="grid h-full place-items-center text-ink/35">
                  <Image size={28} />
                </div>
              )}
            </div>
            <div className="p-4">
              {form.heroEyebrow && <p className="eyebrow">{form.heroEyebrow}</p>}
              <p className="mt-3 font-display text-3xl leading-tight">{formatCoupleName(form)}</p>
              {(form.partnerOneParentLine || form.partnerTwoParentLine) && (
                <div className="mt-4 grid gap-2 text-xs leading-5 text-ink/55">
                  {form.partnerOneParentLine && <p>{form.partnerOneParentLine}</p>}
                  {form.partnerTwoParentLine && <p>{form.partnerTwoParentLine}</p>}
                </div>
              )}
              <p className="mt-3 text-sm text-ink/60">{formatDateLabel(form.date, form.dateFallbackLabel)}</p>
              <p className="mt-1 text-sm text-ink/50">{form.location || form.locationFallbackLabel}</p>
              <p className="mt-4 text-sm leading-6 text-ink/65">
                {form.description || 'Opening description will appear here.'}
              </p>
              <div className="mt-5 rounded-md border border-ink/15 bg-white p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/45">
                  {form.recipientLabel || 'Recipient label hidden'}
                </p>
                <p className="mt-2 font-display text-xl">{form.guestNameFallback || 'Nama Tamu'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {cropRequest && (
        <ImageCropModal
          request={cropRequest}
          settings={cropSettings}
          uploading={uploading[cropRequest.profile.uploadingKey]}
          onSettingsChange={setCropSettings}
          onCancel={() => setCropRequest(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </section>
  );
}

function FormSection({ eyebrow, title, children }) {
  return (
    <section className="border-b border-ink/10 py-6 first:pt-0 last:border-b-0">
      <div className="mb-4">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl leading-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div className="block">
      <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
        <Icon size={14} />
        {label}
      </span>
      {children}
    </div>
  );
}

function EventScheduleFields({ titlePrefix, titleKey, dateKey, timeKey, venueKey, addressKey, form, setForm }) {
  return (
    <div className="space-y-4 rounded-md border border-ink/10 bg-white p-4">
      <Field label={`${titlePrefix} title`} icon={Type}>
        <input
          className="field"
          value={form[titleKey]}
          onChange={(event) => updateField(setForm, titleKey, event.target.value)}
          placeholder={titlePrefix}
        />
      </Field>
      <Field label={`${titlePrefix} date`} icon={CalendarDays}>
        <input
          className="field"
          value={form[dateKey]}
          onChange={(event) => updateField(setForm, dateKey, event.target.value)}
          placeholder="Selasa, 02 Juni 2026"
        />
      </Field>
      <Field label={`${titlePrefix} time`} icon={CalendarDays}>
        <input
          className="field"
          value={form[timeKey]}
          onChange={(event) => updateField(setForm, timeKey, event.target.value)}
          placeholder="Pukul : 13.00"
        />
      </Field>
      <Field label={`${titlePrefix} venue`} icon={MapPin}>
        <input
          className="field"
          value={form[venueKey]}
          onChange={(event) => updateField(setForm, venueKey, event.target.value)}
          placeholder="Nama venue"
        />
      </Field>
      <Field label={`${titlePrefix} address`} icon={MapPin}>
        <textarea
          className="field min-h-24 resize-y leading-6"
          value={form[addressKey]}
          onChange={(event) => updateField(setForm, addressKey, event.target.value)}
          placeholder="Alamat lengkap"
        />
      </Field>
    </div>
  );
}

function LoveStorySceneFields({ index, scene, uploading, onChange, onUpload, onRemoveImage }) {
  return (
    <div className="space-y-4 rounded-md border border-ink/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">Scene {index + 1}</p>
        {scene.image && (
          <button
            type="button"
            className="text-xs font-bold uppercase tracking-[0.14em] text-ink/55 underline-offset-4 hover:underline"
            onClick={onRemoveImage}
          >
            Remove image
          </button>
        )}
      </div>
      <Field label="Label / date" icon={CalendarDays}>
        <input
          className="field"
          value={scene.label}
          onChange={(event) => onChange('label', event.target.value)}
          placeholder="First Meet"
        />
      </Field>
      <Field label="Title" icon={Type}>
        <input
          className="field"
          value={scene.title}
          onChange={(event) => onChange('title', event.target.value)}
          placeholder="Awal Bertemu"
        />
      </Field>
      <Field label="Caption" icon={Type}>
        <textarea
          className="field min-h-24 resize-y leading-6"
          value={scene.body}
          onChange={(event) => onChange('body', event.target.value)}
          placeholder="Cerita pendek untuk scene ini."
        />
      </Field>
      <Field label="Scene image" icon={Image}>
        <ImageUploadControl
          id={`love-story-image-${index}`}
          multiple={false}
          uploading={uploading}
          onChange={onUpload}
          label={scene.image ? 'Replace scene image' : 'Upload scene image'}
        />
        {scene.image && (
          <div className="mt-4 overflow-hidden rounded-md border border-ink/15 bg-linen">
            <img src={scene.image} alt="" className="aspect-[16/10] w-full object-cover grayscale" />
          </div>
        )}
      </Field>
    </div>
  );
}

function ImageUploadControl({ id, label, multiple, uploading, onChange }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        id={id}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={onChange}
        disabled={uploading}
      />
      <label
        htmlFor={id}
        className="button-secondary cursor-pointer"
        aria-disabled={uploading}
      >
        <Upload size={16} />
        {uploading ? 'Uploading' : label}
      </label>
      <span className="text-xs leading-5 text-ink/50">
        Pilih gambar, atur crop, lalu klik Upload di modal.
      </span>
    </div>
  );
}

function ImageCropModal({ request, settings, uploading, onSettingsChange, onCancel, onConfirm }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const currentItem = request.files[request.index];
  const progressLabel = `${request.index + 1} / ${request.files.length}`;

  useEffect(() => {
    const objectUrl = URL.createObjectURL(currentItem.file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [currentItem.file]);

  function updateCropSetting(key, value) {
    onSettingsChange((current) => ({
      ...current,
      [key]: Number(value)
    }));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92svh] w-full max-w-4xl overflow-y-auto rounded-lg border border-white/30 bg-white p-5 shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-ink/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">{request.profile.frameLabel} Frame</p>
            <h2 className="mt-2 font-display text-3xl leading-tight">{request.profile.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">{request.profile.description}</p>
          </div>
          <p className="rounded-full border border-ink/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-ink/55">
            {progressLabel}
          </p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="grid place-items-center rounded-lg border border-ink/10 bg-linen p-4">
            <div
              className="relative w-full max-w-xl overflow-hidden rounded-md border border-ink/20 bg-white shadow-glow"
              style={{ aspectRatio: request.profile.aspect }}
            >
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt=""
                  className="h-full w-full object-cover grayscale"
                  style={{
                    objectPosition: `${50 + settings.x / 2}% ${50 + settings.y / 2}%`,
                    transform: `scale(${settings.zoom})`,
                    transformOrigin: `${50 + settings.x / 2}% ${50 + settings.y / 2}%`
                  }}
                />
              )}
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/50" />
            </div>
          </div>

          <div className="space-y-5 rounded-lg border border-ink/10 bg-linen p-4">
            <CropSlider
              label="Zoom"
              min="1"
              max="3"
              step="0.01"
              value={settings.zoom}
              onChange={(value) => updateCropSetting('zoom', value)}
            />
            <CropSlider
              label="Position X"
              min="-100"
              max="100"
              step="1"
              value={settings.x}
              onChange={(value) => updateCropSetting('x', value)}
            />
            <CropSlider
              label="Position Y"
              min="-100"
              max="100"
              step="1"
              value={settings.y}
              onChange={(value) => updateCropSetting('y', value)}
            />

            <div className="flex flex-col gap-2 pt-2">
              <button className="button-primary w-full" type="button" onClick={onConfirm} disabled={uploading}>
                {uploading ? 'Uploading' : 'Upload Cropped Image'}
              </button>
              <button className="button-secondary w-full" type="button" onClick={onCancel} disabled={uploading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CropSlider({ label, value, min, max, step, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
        {label}
        <span className="text-ink/35">{label === 'Zoom' ? Number(value).toFixed(2) : value}</span>
      </span>
      <input
        className="w-full accent-ink"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AudioUploadControl({ id, label, uploading, onChange }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        id={id}
        type="file"
        accept="audio/*"
        className="sr-only"
        onChange={onChange}
        disabled={uploading}
      />
      <label
        htmlFor={id}
        className="button-secondary cursor-pointer"
        aria-disabled={uploading}
      >
        <Upload size={16} />
        {uploading ? 'Uploading' : label}
      </label>
      <span className="text-xs leading-5 text-ink/50">
        Audio akan diupload ke Cloudinary.
      </span>
    </div>
  );
}

function updateField(setForm, key, value) {
  setForm((current) => {
    const next = {
      ...current,
      [key]: value
    };

    if (key === 'date' && isAutoDateFallback(current.dateFallbackLabel, current.date)) {
      next.dateFallbackLabel = formatDateLabel(value, defaultForm.dateFallbackLabel);
    }

    if (key === 'location' && isAutoLocationFallback(current.locationFallbackLabel, current.location)) {
      next.locationFallbackLabel = value || defaultForm.locationFallbackLabel;
    }

    return next;
  });
}

function setUploadingField(setUploading, key, value) {
  setUploading((current) => ({
    ...current,
    [key]: value
  }));
}

function removeGalleryImage(setForm, index) {
  setForm((current) => ({
    ...current,
    galleryImages: current.galleryImages.filter((_, imageIndex) => imageIndex !== index)
  }));
}

function removeHeroPhotoStripImage(setForm, index) {
  setForm((current) => ({
    ...current,
    heroPhotoStripImages: current.heroPhotoStripImages.filter((_, imageIndex) => imageIndex !== index)
  }));
}

function updateLoveStoryScene(setForm, index, key, value) {
  setForm((current) => ({
    ...current,
    loveStoryScenes: current.loveStoryScenes.map((scene, sceneIndex) => (
      sceneIndex === index ? { ...scene, [key]: value } : scene
    ))
  }));
}

function moveGalleryImage(setForm, index, direction) {
  setForm((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.galleryImages.length) return current;

    const galleryImages = [...current.galleryImages];
    const currentImage = galleryImages[index];
    galleryImages[index] = galleryImages[nextIndex];
    galleryImages[nextIndex] = currentImage;

    return {
      ...current,
      galleryImages
    };
  });
}

function addGiftBankAccount(setForm) {
  setForm((current) => ({
    ...current,
    giftBankAccounts: [
      ...current.giftBankAccounts,
      { bankName: '', accountNumber: '', accountName: '' }
    ].slice(0, 6)
  }));
}

function updateGiftBankAccount(setForm, index, key, value) {
  setForm((current) => ({
    ...current,
    giftBankAccounts: current.giftBankAccounts.map((account, accountIndex) => (
      accountIndex === index ? { ...account, [key]: value } : account
    ))
  }));
}

function removeGiftBankAccount(setForm, index) {
  setForm((current) => ({
    ...current,
    giftBankAccounts: current.giftBankAccounts.filter((_, accountIndex) => accountIndex !== index)
  }));
}

async function uploadImageFile(file, label) {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar');
  }

  const imageBase64 = await fileToDataUrl(file);
  return uploadEventImage({
    imageBase64,
    label
  });
}

async function uploadAudioFile(file, label) {
  if (!file.type.startsWith('audio/')) {
    throw new Error('File harus berupa audio');
  }

  const audioBase64 = await fileToDataUrl(file);
  return uploadEventAudio({
    audioBase64,
    label
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

async function cropImageFile(file, profile, settings) {
  const image = await loadImageFromFile(file);
  const sourceAspect = image.naturalWidth / image.naturalHeight;
  let baseWidth = image.naturalWidth;
  let baseHeight = image.naturalHeight;

  if (sourceAspect > profile.aspect) {
    baseHeight = image.naturalHeight;
    baseWidth = baseHeight * profile.aspect;
  } else {
    baseWidth = image.naturalWidth;
    baseHeight = baseWidth / profile.aspect;
  }

  const cropWidth = baseWidth / settings.zoom;
  const cropHeight = baseHeight / settings.zoom;
  const maxOffsetX = Math.max(0, (image.naturalWidth - cropWidth) / 2);
  const maxOffsetY = Math.max(0, (image.naturalHeight - cropHeight) / 2);
  const centerX = image.naturalWidth / 2 + (settings.x / 100) * maxOffsetX;
  const centerY = image.naturalHeight / 2 + (settings.y / 100) * maxOffsetY;
  const sourceX = clamp(centerX - cropWidth / 2, 0, image.naturalWidth - cropWidth);
  const sourceY = clamp(centerY - cropHeight / 2, 0, image.naturalHeight - cropHeight);

  const canvas = document.createElement('canvas');
  canvas.width = profile.outputWidth;
  canvas.height = profile.outputHeight;

  const context = canvas.getContext('2d');
  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    profile.outputWidth,
    profile.outputHeight
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal membaca gambar untuk crop'));
    };
    image.src = objectUrl;
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function eventToForm(event = {}) {
  const date = toDateTimeLocal(event.date);
  const location = readSetting(event, 'location', defaultForm.location);

  return {
    title: readSetting(event, 'title', defaultForm.title),
    partnerOneName: readSetting(event, 'partnerOneName', defaultForm.partnerOneName),
    partnerTwoName: readSetting(event, 'partnerTwoName', defaultForm.partnerTwoName),
    partnerOneParentLine: readSetting(event, 'partnerOneParentLine', defaultForm.partnerOneParentLine),
    partnerTwoParentLine: readSetting(event, 'partnerTwoParentLine', defaultForm.partnerTwoParentLine),
    date,
    location,
    coverImage: readSetting(event, 'coverImage', defaultForm.coverImage),
    heroImagePosition: readHeroImagePosition(event.heroImagePosition),
    heroPhotoStripImages: readHeroPhotoStripImages(event),
    description: readSetting(event, 'description', defaultForm.description),
    heroEyebrow: readHeroEyebrow(event),
    storyTitle: readSetting(event, 'storyTitle', defaultForm.storyTitle),
    storyBody: readSetting(event, 'storyBody', defaultForm.storyBody),
    countdownIntroLabel: readSetting(event, 'countdownIntroLabel', defaultForm.countdownIntroLabel),
    dateFallbackLabel: readDateFallbackLabel(event, date),
    locationFallbackLabel: readLocationFallbackLabel(event, location),
    scheduleTitle: readSetting(event, 'scheduleTitle', defaultForm.scheduleTitle),
    ceremonyTitle: readSetting(event, 'ceremonyTitle', defaultForm.ceremonyTitle),
    ceremonyDate: readSetting(event, 'ceremonyDate', defaultForm.ceremonyDate),
    ceremonyTime: readSetting(event, 'ceremonyTime', defaultForm.ceremonyTime),
    ceremonyVenue: readSetting(event, 'ceremonyVenue', defaultForm.ceremonyVenue),
    ceremonyAddress: readSetting(event, 'ceremonyAddress', defaultForm.ceremonyAddress),
    receptionTitle: readSetting(event, 'receptionTitle', defaultForm.receptionTitle),
    receptionDate: readSetting(event, 'receptionDate', defaultForm.receptionDate),
    receptionTime: readSetting(event, 'receptionTime', defaultForm.receptionTime),
    receptionVenue: readSetting(event, 'receptionVenue', defaultForm.receptionVenue),
    receptionAddress: readSetting(event, 'receptionAddress', defaultForm.receptionAddress),
    loveStoryTitle: readSetting(event, 'loveStoryTitle', defaultForm.loveStoryTitle),
    loveStoryScenes: readLoveStoryScenes(event),
    recipientLabel: readSetting(event, 'recipientLabel', defaultForm.recipientLabel),
    guestNameFallback: readSetting(event, 'guestNameFallback', defaultForm.guestNameFallback),
    daysLabel: readSetting(event, 'daysLabel', defaultForm.daysLabel),
    hoursLabel: readSetting(event, 'hoursLabel', defaultForm.hoursLabel),
    minutesLabel: readSetting(event, 'minutesLabel', defaultForm.minutesLabel),
    secondsLabel: readSetting(event, 'secondsLabel', defaultForm.secondsLabel),
    galleryTitle: readSetting(event, 'galleryTitle', defaultForm.galleryTitle),
    galleryImages: readGalleryImages(event),
    passEyebrow: readSetting(event, 'passEyebrow', defaultForm.passEyebrow),
    passTitle: readSetting(event, 'passTitle', defaultForm.passTitle),
    categoryLabel: readSetting(event, 'categoryLabel', defaultForm.categoryLabel),
    tableLabel: readSetting(event, 'tableLabel', defaultForm.tableLabel),
    passIdLabel: readSetting(event, 'passIdLabel', defaultForm.passIdLabel),
    downloadQrLabel: readSetting(event, 'downloadQrLabel', defaultForm.downloadQrLabel),
    giftTitle: readSetting(event, 'giftTitle', defaultForm.giftTitle),
    giftDescription: readSetting(event, 'giftDescription', defaultForm.giftDescription),
    giftQrisImage: readSetting(event, 'giftQrisImage', defaultForm.giftQrisImage),
    giftQrisLabel: readSetting(event, 'giftQrisLabel', defaultForm.giftQrisLabel),
    giftBankAccounts: readGiftBankAccounts(event),
    musicTitle: readSetting(event, 'musicTitle', defaultForm.musicTitle),
    musicUrl: readSetting(event, 'musicUrl', defaultForm.musicUrl),
    footerCopyright: readSetting(event, 'footerCopyright', defaultForm.footerCopyright)
  };
}

function formToPayload(form) {
  return {
    ...form,
    date: form.date ? new Date(form.date).toISOString() : '',
    heroPhotoStripImages: form.heroPhotoStripImages.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3),
    loveStoryScenes: normalizeLoveStoryScenes(form.loveStoryScenes),
    galleryImages: form.galleryImages.map((item) => String(item || '').trim()).filter(Boolean),
    giftBankAccounts: normalizeGiftBankAccounts(form.giftBankAccounts)
  };
}

function readSetting(event, key, fallback) {
  if (Object.prototype.hasOwnProperty.call(event, key)) return event[key] ?? '';
  return fallback;
}

function readHeroEyebrow(event) {
  const value = readSetting(event, 'heroEyebrow', defaultForm.heroEyebrow);
  return value === legacyHeroEyebrow ? defaultForm.heroEyebrow : value;
}

function readDateFallbackLabel(event, date) {
  const value = readSetting(event, 'dateFallbackLabel', '');
  if (value && value !== legacyDateFallbackLabel) return value;
  return formatDateLabel(date, defaultForm.dateFallbackLabel);
}

function readLocationFallbackLabel(event, location) {
  const value = readSetting(event, 'locationFallbackLabel', '');
  if (value && value !== legacyLocationFallbackLabel) return value;
  return location || defaultForm.locationFallbackLabel;
}

function isAutoDateFallback(value, date) {
  return !value
    || value === legacyDateFallbackLabel
    || value === defaultForm.dateFallbackLabel
    || value === formatDateLabel(date, defaultForm.dateFallbackLabel);
}

function isAutoLocationFallback(value, location) {
  return !value
    || value === legacyLocationFallbackLabel
    || value === defaultForm.locationFallbackLabel
    || value === location;
}

function readHeroImagePosition(value) {
  return ['top', 'center', 'bottom'].includes(value) ? value : defaultForm.heroImagePosition;
}

function readGalleryImages(event) {
  if (Object.prototype.hasOwnProperty.call(event, 'galleryImages')) {
    return Array.isArray(event.galleryImages)
      ? event.galleryImages.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
  }

  return defaultForm.galleryImages;
}

function readHeroPhotoStripImages(event) {
  if (Object.prototype.hasOwnProperty.call(event, 'heroPhotoStripImages')) {
    return Array.isArray(event.heroPhotoStripImages)
      ? event.heroPhotoStripImages.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
      : [];
  }

  return defaultForm.heroPhotoStripImages;
}

function readGiftBankAccounts(event) {
  if (Object.prototype.hasOwnProperty.call(event, 'giftBankAccounts')) {
    return normalizeGiftBankAccounts(event.giftBankAccounts);
  }

  return defaultForm.giftBankAccounts;
}

function readLoveStoryScenes(event) {
  if (Object.prototype.hasOwnProperty.call(event, 'loveStoryScenes')) {
    return normalizeLoveStoryScenes(event.loveStoryScenes, true);
  }

  return defaultForm.loveStoryScenes.map((scene) => ({ ...scene }));
}

function normalizeLoveStoryScenes(value, padToDefault = false) {
  const scenes = Array.isArray(value) ? value : [];
  const normalized = scenes.slice(0, 3).map((scene) => ({
    label: String(scene?.label || '').trim(),
    title: String(scene?.title || '').trim(),
    body: String(scene?.body || '').trim(),
    image: String(scene?.image || '').trim()
  }));

  if (!padToDefault) return normalized;

  return defaultLoveStoryScenes.map((defaultScene, index) => ({
    ...defaultScene,
    ...(normalized[index] || {})
  }));
}

function normalizeGiftBankAccounts(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 6).map((account) => ({
    bankName: String(account?.bankName || '').trim(),
    accountNumber: String(account?.accountNumber || '').trim(),
    accountName: String(account?.accountName || '').trim()
  })).filter((account) => account.bankName || account.accountNumber || account.accountName);
}

function formatCoupleName(event) {
  const partners = [event.partnerOneName, event.partnerTwoName]
    .map((name) => String(name || '').trim())
    .filter(Boolean);

  return partners.length ? partners.join(' & ') : event.title || 'Nama Pasangan';
}

function toDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatDateLabel(value, fallback) {
  if (!value) return fallback || 'Date to be announced';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
