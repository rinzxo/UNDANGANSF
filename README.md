# Digital Invitation System

Full-stack digital invitation app with a decoupled React frontend and Node.js Express backend.

## Structure

- `backend`: Express API, Firebase Admin SDK, Cloudinary upload, copyable invitation links, Firestore seed script.
- `frontend`: Vite React app, Tailwind CSS, QR scanning, webcam check-in capture, guest invitation page.

## Setup

### MVP Demo Mode

The project is ready to run as a local MVP demo without Firebase, Cloudinary, or SMTP credentials.

```bash
npm run demo
```

Demo mode uses in-memory sample data and resets whenever the backend restarts. Useful demo links:

- Public landing: `http://localhost:5173/`
- Sample invitation: `http://localhost:5173/invitation/demo-vip-alya`
- Admin dashboard: `http://localhost:5173/admin`
- Receptionist scanner: `http://localhost:5173/admin/scanner`

Recommended MVP demo flow:

1. Open `http://localhost:5173/admin` and show the initial guest statuses.
2. Open `http://localhost:5173/invitation/demo-vip-alya` to show the guest QR pass.
3. Open `http://localhost:5173/admin/scanner`.
4. Use the `Demo scan Alya` button, or enter `demo-vip-alya` and click `Check In`.
5. Return to `http://localhost:5173/admin` and click `Refresh`; Alya changes to `Checked-in` and the checked-in count increases.

To verify the API directly:

```powershell
Invoke-RestMethod http://localhost:8080/health
Invoke-RestMethod http://localhost:8080/api/stats
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/scan-checkin -ContentType 'application/json' -Body '{"invitationId":"demo-vip-alya","imageBase64":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=","type":"manual"}'
```

### Production Setup

1. Install dependencies:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

2. Copy environment examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

PowerShell equivalent:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

3. For real integrations, set `DEMO_MODE=false`, then fill Firebase, Cloudinary, and domain values in the `.env` files.

Firebase notes for this project:

- Enable Cloud Firestore in the Firebase console for project `sf-wedding-app`.
- Make sure the Cloud Firestore API is enabled in Google Cloud for the same project.
- Put the Firebase service account JSON in `backend/src/services`, or configure `FIREBASE_SERVICE_ACCOUNT_BASE64`, `GOOGLE_APPLICATION_CREDENTIALS`, or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.
- Restart the backend after changing Firebase settings.
- Guest links are generated as `/invitation/nama-tamu`, for example `http://localhost:5173/invitation/laksmana-ibrahim-rino`.
- The app does not send email automatically; after adding a guest, copy the invitation link from the admin guest list.

4. Seed Firestore:

```bash
npm run seed
```

5. Run development servers:

```bash
npm run dev
```

The backend defaults to `http://localhost:8080` and the frontend defaults to `http://localhost:5173`.

## Frontend Routes

- `/`: Public landing page for guests.
- `/invitation/:invitationId`: Public invitation page with event details and guest QR code.
- `/admin`: Admin dashboard with stats and guest operations.
- `/admin/guests`: Admin guest directory.
- `/admin/scanner`: Receptionist scanner and photo check-in.
- `/admin/settings`: Event settings overview.
- `/scanner`: Legacy redirect to `/admin/scanner`.
