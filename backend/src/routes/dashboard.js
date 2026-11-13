const router = require("express").Router();
const Medicine = require("../models/Medicine");
const Request = require("../models/RedistributionRequest");
const Alert = require("../models/Alert");
const { protect } = require("../middleware/auth");
const { getExpiryState } = require("../utils/expiry");

router.get("/", protect, async (req, res) => {
  const scope = req.user.role === "admin" ? {} : { organization: req.user._id };
  const medicines = await Medicine.find(scope);
  const counts = { totalBatches: medicines.length, totalUnits: medicines.reduce((n, m) => n + m.quantity, 0), expiringSoon: 0, expired: 0, available: 0 };
  medicines.forEach(m => { const s = getExpiryState(m.expiryDate).state; if (s === "expiring_soon") counts.expiringSoon++; else if (s === "expired") counts.expired++; else counts.available++; });
  const requestFilter = req.user.role === "admin" ? {} : { $or: [{ requester: req.user._id }, { supplier: req.user._id }] };
  counts.openRequests = await Request.countDocuments({ ...requestFilter, status: "pending" });
  counts.unreadAlerts = await Alert.countDocuments({ ...(req.user.role === "admin" ? {} : { organization: req.user._id }), read: false });
  res.json({ counts, recentMedicines: medicines.sort((a,b) => a.expiryDate - b.expiryDate).slice(0, 5) });
});

module.exports = router;
