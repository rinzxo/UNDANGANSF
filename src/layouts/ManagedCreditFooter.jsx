import { useState } from 'react';

const rinzLogos = [
  { src: '/brand/DSK.png', className: 'max-h-14 max-w-[150px]' },
  { src: '/brand/RG-MIX-BLACK.png', className: 'max-h-10 max-w-[130px]' }
];

export default function ManagedCreditFooter({ copyright }) {
  return (
    <footer className="bg-linen px-5 py-10 text-center">
      {copyright && (
        <p className="text-[11px] uppercase tracking-[0.24em] text-ink/40">
          {copyright}
        </p>
      )}

      <div className="mt-5 flex items-center justify-center gap-4">
        {rinzLogos.map((logo, index) => (
          <RinzLogo key={logo.src} logo={logo} index={index} />
        ))}
      </div>

      <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-ink/45">
        Dibuat dan Dikelola oleh{' '}
        <a
          className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition hover:text-ink/65"
          href="https://rinzgroup.web.id"
          target="_blank"
          rel="noreferrer"
        >
          Rinz Group
        </a>
      </p>
    </footer>
  );
}

function RinzLogo({ logo, index }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <img
      className={`${logo.className} object-contain opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0`}
      src={logo.src}
      alt={`Rinz Group logo slot ${index + 1}`}
      loading="lazy"
      onError={() => setHidden(true)}
    />
  );
}
