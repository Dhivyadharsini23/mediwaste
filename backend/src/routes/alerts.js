const router = require("express").Router();
const Medicine = require("../models/Medicine");
const Alert = require("../models/Alert");
const { protect, allowRoles } = require("../middleware/auth");
const { getExpiryState } = require("../utils/expiry");

async function runExpiryCheck() {
  const medicines = await Medicine.find({ quantity: { $gt: 0 }, status: { $ne: "depleted" } });
  let created = 0;
  for (const medicine of medicines) {
    const { state, daysRemaining } = getExpiryState(medicine.expiryDate);
    if (state === "available") continue;
    const type = state === "expired" ? "expired" : "expiring_soon";
    const dedupeKey = `${medicine._id}:${type}:${new Date().toISOString().slice(0,10)}`;
    const message = type === "expired"
      ? `${medicine.name} (batch ${medicine.batchNumber}) is expired. Do not distribute or use it.`
      : `${medicine.name} (batch ${medicine.batchNumber}) expires in ${daysRemaining} day(s). Review the batch.`;
    const result = await Alert.updateOne(
      { dedupeKey },
      { $setOnInsert: { organization: medicine.organization, medicine: medicine._id, type, message, expiresOn: medicine.expiryDate, dedupeKey } },
      { upsert: true }
    );
    if (result.upsertedCount) created++;
    if (state === "expired" && medicine.status !== "expired") {
      medicine.status = "expired";
      medicine.redistributionReviewEligible = false;
      await medicine.save();
    } else if (state === "expiring_soon" && medicine.status === "available") {
      medicine.status = "under_review";
      await medicine.save();
    }
  }
  return { scanned: medicines.length, alertsCreated: created };
}

router.get("/", protect, async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { organization: req.user._id };
  const alerts = await Alert.find(filter).populate("medicine", "name batchNumber expiryDate").sort({ createdAt: -1 }).limit(100);
  res.json({ alerts });
});

router.patch("/:id/read", protect, async (req, res) => {
  const filter = req.user.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, organization: req.user._id };
  const alert = await Alert.findOneAndUpdate(filter, { read: true }, { new: true });
  if (!alert) return res.status(404).json({ message: "Alert not found." });
  res.json({ alert });
});

router.post("/run-check", protect, allowRoles("admin"), async (req, res) => {
  const result = await runExpiryCheck();
  res.json({ message: "Expiry scan completed.", ...result });
});

module.exports = { router, runExpiryCheck };
