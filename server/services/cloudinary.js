import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnycjwpoj',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export function uploadBase64Image(imageBase64, invitationId, options = {}) {
  return uploadBase64Asset(imageBase64, invitationId, {
    folder: options.folder || process.env.CLOUDINARY_FOLDER || 'digital-invitations/checkins',
    publicIdPrefix: options.publicIdPrefix || invitationId,
    resourceType: 'image'
  });
}

export function uploadInvitationAsset(imageBase64, label = 'asset') {
  const safeLabel = String(label || 'asset')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';

  return uploadBase64Image(imageBase64, safeLabel, {
    folder: process.env.CLOUDINARY_ASSET_FOLDER || 'digital-invitations/settings',
    publicIdPrefix: safeLabel
  });
}

export function uploadInvitationAudio(audioBase64, label = 'music') {
  const safeLabel = createSafePublicId(label || 'music');

  return uploadBase64Asset(audioBase64, safeLabel, {
    folder: process.env.CLOUDINARY_AUDIO_FOLDER || 'digital-invitations/music',
    publicIdPrefix: safeLabel,
    resourceType: 'auto'
  });
}

function uploadBase64Asset(base64Asset, label, options = {}) {
  const buffer = parseBase64Asset(base64Asset);
  const folder = options.folder || 'digital-invitations/assets';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'SF-Wedding';
  const publicIdPrefix = options.publicIdPrefix || createSafePublicId(label);
  const resourceType = options.resourceType || 'auto';

  if (uploadPreset && !process.env.CLOUDINARY_API_SECRET) {
    return uploadUnsignedAsset({ base64Asset, publicIdPrefix, folder, uploadPreset, resourceType });
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${publicIdPrefix}-${Date.now()}`,
        resource_type: resourceType
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

function uploadUnsignedAsset({ base64Asset, publicIdPrefix, folder, uploadPreset, resourceType }) {
  return cloudinary.uploader.unsigned_upload(
    base64Asset,
    uploadPreset,
    {
      folder,
      public_id: `${publicIdPrefix}-${Date.now()}`,
      resource_type: resourceType
    }
  );
}

function parseBase64Asset(base64Asset) {
  const base64 = base64Asset.includes(',')
    ? base64Asset.split(',').at(-1)
    : base64Asset;

  if (!base64) {
    throw Object.assign(new Error('Invalid base64 asset payload'), { status: 400 });
  }

  return Buffer.from(base64, 'base64');
}

function createSafePublicId(value) {
  return String(value || 'asset')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}
