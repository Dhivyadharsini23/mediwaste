# MediWaste API reference

Base URL: `http://localhost:5000/api`

Most endpoints (except health, register and login) require:
`Authorization: Bearer <JWT>`

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | API health |
| POST | `/auth/register` | Public | Register pharmacy/hospital/NGO |
| POST | `/auth/login` | Public | Login |
| GET | `/auth/me` | Logged-in | Current profile |
| GET | `/dashboard` | Logged-in | Dashboard counts |
| POST | `/medicines` | Pharmacy/hospital/admin | Add batch |
| GET | `/medicines` | Logged-in | Own inventory (admin sees all) |
| PATCH | `/medicines/:id` | Owner/admin | Update batch |
| GET | `/medicines/listings` | NGO/hospital/admin | View review listings |
| POST | `/requests` | NGO/hospital | Request a listed batch |
| GET | `/requests/mine` | Logged-in | Requests involving organization |
| PATCH | `/requests/:id/decision` | Supplier/admin | Approve or reject |
| GET | `/alerts` | Logged-in | Organization alerts |
| PATCH | `/alerts/:id/read` | Owner/admin | Mark alert read |
| POST | `/alerts/run-check` | Admin | Run expiry scan |

## Register example
```json
{
  "name": "Demo Pharmacy User",
  "email": "pharmacy@example.com",
  "password": "DemoPassword123!",
  "role": "pharmacy",
  "organizationName": "Demo Pharmacy"
}
```

## Add medicine example
```json
{
  "name": "Demo vitamin tablets",
  "genericName": "Demo ingredient",
  "batchNumber": "DEMO-BATCH-001",
  "quantity": 50,
  "unit": "packs",
  "expiryDate": "2027-10-30",
  "storageNotes": "Fictional training record",
  "redistributionReviewEligible": false
}
```
