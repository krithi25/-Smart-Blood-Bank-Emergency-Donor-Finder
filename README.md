# -Smart-Blood-Bank-Emergency-Donor-Finder
# Blood Donation System - Backend (SQLite + Express)

This backend provides a small REST API backed by SQLite for the Blood Donation System demo.

Quick start (Windows PowerShell):

```powershell
npm install
npm run dev   # or npm start
```

The server listens on port 4000 by default and allows CORS from the frontend (http://localhost:5173).

- Endpoints (examples):
- GET /api/donor
- POST /api/donor
- GET /api/banks
- POST /api/banks
- POST /api/donate  (creates donation and test record)
- POST /api/tests/:test_id  (update test result/status)
- POST /api/patients
- POST /api/requests
- POST /api/staffs

Database file: `BACKEND/backend.sqlite` (created automatically).
Schema: `BACKEND/schema.sql`.
