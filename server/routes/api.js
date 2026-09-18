import { Router } from 'express';
import { dataStore } from '../services/dataStore.js';
import { uploadInvitationAsset, uploadInvitationAudio } from '../services/cloudinary.js';
import { authenticateGoogleUser, createAuthToken, requireAuth, requireRole, roles } from '../services/auth.js';

export const apiRouter = Router();

const canManageGuests = requireRole([roles.admin, roles.superAdmin]);
const canUseReception = requireRole([roles.receptionist, roles.admin, roles.superAdmin]);
const canManageSettings = requireRole([roles.superAdmin]);
const canManageAccess = requireRole([roles.superAdmin]);

apiRouter.post('/auth/login', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const user = await authenticateGoogleUser(idToken);

    if (!user) {
      res.status(401).json({ error: 'Akun Google ini belum memiliki akses admin' });
      return;
    }

    res.json({
      user,
      token: createAuthToken(user)
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

apiRouter.post('/auth/request-role', requireAuth, async (req, res, next) => {
  try {
    const request = await dataStore.createRoleRequest({
      user: req.user,
      requestedRole: req.body?.requestedRole,
      message: req.body?.message
    });

    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/auth/role-requests', requireAuth, canManageAccess, async (req, res, next) => {
  try {
    const requests = await dataStore.listRoleRequests();
    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/auth/role-requests/:requestId', requireAuth, canManageAccess, async (req, res, next) => {
  try {
    const request = await dataStore.updateRoleRequest(req.params.requestId, {
      status: req.body?.status,
      role: req.body?.role,
      reviewer: req.user
    });

    res.json({ request });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/register', requireAuth, canManageGuests, async (req, res, next) => {
  try {
    const { name, email = '', phone = '', category = 'Regular', tableNumber = null } = req.body;

    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const result = await dataStore.registerGuest({
      name,
      email,
      phone,
      category,
      tableNumber
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/send-email', requireAuth, canManageGuests, async (req, res, next) => {
  try {
    const result = await dataStore.sendInvitations(req.body.invitationId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/scan-checkin', requireAuth, canUseReception, async (req, res, next) => {
  try {
    const { invitationId, imageBase64, type = 'auto' } = req.body;

    if (!invitationId || !imageBase64) {
      res.status(400).json({ error: 'invitationId and imageBase64 are required' });
      return;
    }

    const result = await dataStore.scanCheckIn({ invitationId, imageBase64, type });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/stats', requireAuth, canUseReception, async (_req, res, next) => {
  try {
    res.json(await dataStore.getStats());
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/guests', requireAuth, canUseReception, async (_req, res, next) => {
  try {
    res.json({ guests: await dataStore.getGuests() });
  } catch (err) {
    next(err);
  }
});

apiRouter.delete('/guests/:guestId', requireAuth, canManageGuests, async (req, res, next) => {
  try {
    res.json(await dataStore.deleteGuest(req.params.guestId));
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/event-settings', async (_req, res, next) => {
  try {
    res.json({ event: await dataStore.getEventSettings() });
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/event-settings', requireAuth, canManageSettings, async (req, res, next) => {
  try {
    res.json({ event: await dataStore.updateEventSettings(req.body) });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/event-settings/upload-image', requireAuth, canManageSettings, async (req, res, next) => {
  try {
    const { imageBase64, label = 'invitation-image' } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 is required' });
      return;
    }

    const upload = await uploadInvitationAsset(imageBase64, label);
    res.status(201).json({
      image: {
        url: upload.secure_url || upload.url,
        publicId: upload.public_id,
        width: upload.width,
        height: upload.height,
        format: upload.format
      }
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/event-settings/upload-audio', requireAuth, canManageSettings, async (req, res, next) => {
  try {
    const { audioBase64, label = 'invitation-music' } = req.body;

    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 is required' });
      return;
    }

    const upload = await uploadInvitationAudio(audioBase64, label);
    res.status(201).json({
      audio: {
        url: upload.secure_url || upload.url,
        publicId: upload.public_id,
        duration: upload.duration,
        format: upload.format,
        resourceType: upload.resource_type
      }
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/invitations/:invitationId', async (req, res, next) => {
  try {
    res.json(await dataStore.getInvitation(req.params.invitationId));
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/invitations/:invitationId/rsvp', async (req, res, next) => {
  try {
    const result = await dataStore.updateInvitationRsvp(req.params.invitationId, {
      attendance: req.body?.attendance,
      partySize: req.body?.partySize
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});
