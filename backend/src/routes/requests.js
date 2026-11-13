const router = require("express").Router();
const Medicine = require("../models/Medicine");
const Request = require("../models/RedistributionRequest");
const { protect, allowRoles } = require("../middleware/auth");

router.use(protect);

router.post("/", allowRoles("ngo", "hospital"), async (req, res) => {
  const { medicineId, requestedQuantity, message } = req.body;
  const medicine = await Medicine.findById(medicineId);
  if (!medicine || String(medicine.organization) === String(req.user._id)) return res.status(404).json({ message: "Listing not found." });
  if (!medicine.redistributionReviewEligible || medicine.recalled || medicine.damaged || medicine.expiryDate <= new Date() || medicine.quantity < Number(requestedQuantity) || medicine.status === "expired" || medicine.status === "depleted") {
    return res.status(400).json({ message: "This batch is not currently requestable. It requires manual safety and eligibility review." });
  }
  if (!Number.isInteger(Number(requestedQuantity)) || Number(requestedQuantity) < 1) return res.status(400).json({ message: "Enter a valid whole-number quantity." });
  const request = await Request.create({
    medicine: medicine._id, requester: req.user._id, supplier: medicine.organization,
    requestedQuantity: Number(requestedQuantity), message
  });
  res.status(201).json({ request });
});

router.get("/mine", async (req, res) => {
  const filter = req.user.role === "admin"
    ? {}
    : { $or: [{ requester: req.user._id }, { supplier: req.user._id }] };
  const requests = await Request.find(filter).populate("medicine").populate("requester", "name organizationName email").populate("supplier", "name organizationName email").sort({ createdAt: -1 });
  res.json({ requests });
});

router.patch("/:id/decision", allowRoles("pharmacy", "hospital", "admin"), async (req, res) => {
  const { decision, decisionNote } = req.body;
  if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ message: "Decision must be approved or rejected." });
  const filter = req.user.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, supplier: req.user._id };
  const request = await Request.findOne(filter).populate("medicine");
  if (!request) return res.status(404).json({ message: "Request not found or you are not its supplier." });
  if (request.status !== "pending") return res.status(409).json({ message: "This request has already been processed." });
  if (decision === "approved") {
    const medicine = await Medicine.findOne({ _id: request.medicine._id, quantity: { $gte: request.requestedQuantity }, expiryDate: { $gt: new Date() }, recalled: false, damaged: false, redistributionReviewEligible: true });
    if (!medicine) return res.status(409).json({ message: "The batch is no longer eligible or does not have enough quantity. Recheck it manually." });
    medicine.quantity -= request.requestedQuantity;
    if (medicine.quantity === 0) medicine.status = "depleted";
    await medicine.save();
  }
  request.status = decision;
  request.decisionNote = decisionNote || "";
  request.decidedAt = new Date();
  await request.save();
  res.json({ request });
});

module.exports = router;
