# MediWaste – Smart Medicine Expiry & Redistribution Platform

A student-project MVP built with React, Node.js/Express, MongoDB Atlas and an AWS deployment starter.

## Included features
- Organization/user registration and login (JWT; pharmacy, hospital, NGO and admin roles)
- Medicine inventory with batch number, quantity, expiry date and storage notes
- Expiry status calculation (expired / expiring soon / available)
- Eligible medicine listing and redistribution requests
- Pharmacy approval/rejection of requests
- Dashboard counts
- Daily expiry-check endpoint and optional AWS EventBridge + SNS Lambda starter

## Important safety boundary
This is an inventory and coordination demonstrator, not a medicine-safety or regulatory decision system. Never list or redistribute expired, recalled, damaged, temperature-excursion, opened, prescription-restricted or otherwise ineligible medicines. Real redistribution requires pharmacist review, applicable legal/regulatory approval, verified storage/chain-of-custody records, and organization-level authorization. The sample uses a conservative configurable eligibility flag and does not determine legal eligibility.

## Requirements
- Node.js 20 or later (18.18+ may work)
- npm
- MongoDB Atlas account OR local MongoDB
- Git (optional)
- AWS account only for cloud deployment

## 1. Configure MongoDB
1. Create a free development cluster at https://www.mongodb.com/atlas.
2. Create a database user and password.
3. In Atlas Network Access, allow your development IP address. Do not use `0.0.0.0/0` for production.
4. Copy the Node.js connection string.
5. Replace `<password>` and add database name `MediWasteDB`.

Example:
`mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/MediWasteDB?retryWrites=true&w=majority`

## 2. Run the backend
Open a terminal in `MediWaste/backend`:

```bash
npm install
```

Copy `.env.example` to `.env`, then set:
- `MONGODB_URI`
- `JWT_SECRET` (use a long random value)
- `PORT=5000`
- `EXPIRY_WARNING_DAYS=30`

Create the initial admin account:

```bash
npm run seed:admin
```

Edit `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env` before running it.

Start the API:

```bash
npm run dev
```

API runs at `http://localhost:5000`. Test `http://localhost:5000/api/health`.

## 3. Run the frontend
Open a second terminal in `MediWaste/frontend`:

```bash
npm install
```

Copy `.env.example` to `.env` (default API URL is already correct), then:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

Register accounts as Pharmacy, Hospital or NGO. Admin is created only by the seed script; public registration cannot create an admin.

## 4. Try the main workflow
1. Log in as a Pharmacy account.
2. Add a medicine batch with quantity, expiry date and batch number.
3. For a safe demo, mark `Redistribution review eligible` only for a fictitious, non-prescription demo item and only if you understand this is a simulated workflow. Do not use real medicines or real patient data.
4. Register/login as an NGO account in another browser/incognito session.
5. Browse eligible listings and submit a request.
6. Log back in as the pharmacy and approve/reject the request.
7. Open Dashboard to see inventory and expiry counts.

The app deliberately blocks requests for expired or flagged-ineligible batches. A real deployment must add stronger review, audit and compliance processes.

## 5. Run the expiry check manually
```bash
curl -X POST http://localhost:5000/api/alerts/run-check \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```
The API marks matching medicine records as needing review and creates in-app alerts. In local mode, no email/SMS is sent.

## 6. Deploy on AWS (starter path)
The included `infrastructure/template.yaml` is an AWS SAM starter for:
- API Gateway + Lambda hosting the Express API
- EventBridge scheduled expiry check
- Lambda environment variables for MongoDB and JWT
- Optional SNS topic for alert notifications

Before deploying:
1. Install AWS CLI and AWS SAM CLI.
2. Configure an IAM deployment identity with least-privilege permissions.
3. Store secrets in AWS Secrets Manager for a production deployment; do not commit `.env`.
4. Ensure Lambda can reach MongoDB Atlas. For a student demo, a carefully restricted Atlas IP/network configuration may be used; production should use private connectivity or controlled egress.
5. Review and adapt IAM, CORS, secrets, network access and data-protection requirements.

Build/deploy:
```bash
cd infrastructure
sam build
sam deploy --guided
```
The SAM template is a starter and may need account/region-specific review. Supply `MongoUri`, `JwtSecret`, and `FrontendOrigin` when prompted. `FrontendOrigin` should be your deployed CloudFront URL.

After deployment, set the frontend `.env` `VITE_API_URL` to the API URL, build the frontend, and upload `frontend/dist` to a private S3 bucket served through CloudFront (Origin Access Control). Configure HTTPS and a restrictive bucket policy. Do not make the bucket public.

### AWS services used
- S3 + CloudFront: static React website hosting and delivery
- API Gateway: HTTPS API endpoint
- Lambda: backend API and scheduled expiry processing
- EventBridge: daily scheduled expiry scan
- SNS: optional notification topic
- CloudWatch: Lambda/API logs, metrics and alarms
- Secrets Manager (recommended): database URI and JWT secret
- Cognito (optional future enhancement): managed user authentication; this MVP uses JWT authentication in the API

## Project structure
```text
MediWaste/
  backend/
    src/models/
    src/routes/
    src/middleware/
    src/utils/
    server.js
    lambda.js
  frontend/
    src/
  infrastructure/
    template.yaml
```

## Troubleshooting
- `MONGODB_URI is missing`: copy `.env.example` to `.env` and set the URI.
- MongoDB connection timeout: check Atlas IP allowlist, username/password URL encoding and cluster status.
- `Invalid token`: log out and sign in again; JWT secret must remain unchanged.
- Frontend cannot reach API: confirm backend is running and `VITE_API_URL` is correct.
- CORS error: set `FRONTEND_ORIGIN` in backend `.env` to the Vite URL.
- Port in use: change `PORT` and update `VITE_API_URL`.

## Academic project limitations
This is a working MVP foundation, not a production-ready healthcare platform. Before real-world use, add organization verification, pharmacist approval, role/ownership checks, immutable audit trails, recall checks, batch-level storage/temperature records, secure document handling, encryption/key management, backups, retention policies, rate limiting, vulnerability testing and compliance review.
