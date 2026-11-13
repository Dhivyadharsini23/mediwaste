const router = require("express").Router();
const Medicine = require("../models/Medicine");
const { protect, allowRoles } = require("../middleware/auth");
const { getExpiryState } = require("../utils/expiry");

router.use(protect);

router.post("/", allowRoles("pharmacy", "hospital", "admin"), async (req, res) => {
  try {
    const { name, genericName, batchNumber, quantity, unit, expiryDate, storageNotes, redistributionReviewEligible } = req.body;
    if (!name || !batchNumber || quantity === undefined || !expiryDate) return res.status(400).json({ message: "Name, batch number, quantity and expiry date are required." });
    if (Number(quantity) < 0 || !Number.isFinite(Number(quantity))) return res.status(400).json({ message: "Quantity must be zero or greater." });
    const medicine = await Medicine.create({
      name, genericName, batchNumber, quantity: Number(quantity), unit, expiryDate,
      organization: req.user._id, storageNotes,
      redistributionReviewEligible: Boolean(redistributionReviewEligible)
    });
    res.status(201).json({ medicine });
  } catch (err) {
    res.status(400).json({ message: "Could not add medicine. Check that the batch number is unique for your organization." });
  }
});

router.get("/", async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { organization: req.user._id };
  const items = await Medicine.find(filter).sort({ expiryDate: 1 }).populate("organization", "organizationName name");
  res.json({ medicines: items.map(m => ({ ...m.toObject(), expiry: getExpiryState(m.expiryDate) })) });
});

router.get("/listings", allowRoles("ngo", "hospital", "admin"), async (req, res) => {
  const items = await Medicine.find({
    organization: { $ne: req.user._id },
    quantity: { $gt: 0 },
    expiryDate: { $gt: new Date() },
    recalled: false, damaged: false,
    redistributionReviewEligible: true,
    status: { $nin: ["expired", "depleted"] }
  }).populate("organization", "organizationName name").sort({ expiryDate: 1 });
  res.json({ listings: items.map(m => ({ ...m.toObject(), expiry: getExpiryState(m.expiryDate) })) });
});

router.patch("/:id", allowRoles("pharmacy", "hospital", "admin"), async (req, res) => {
  const filter = req.user.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, organization: req.user._id };
  const allowed = ["name", "genericName", "quantity", "unit", "expiryDate", "storageNotes", "recalled", "damaged", "redistributionReviewEligible"];
  const update = {};
  for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
  const medicine = await Medicine.findOneAndUpdate(filter, update, { new: true, runValidators: true });
  if (!medicine) return res.status(404).json({ message: "Medicine not found or not owned by your organization." });
  res.json({ medicine });
});

module.exports = router;
