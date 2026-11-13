const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  genericName: { type: String, trim: true, maxlength: 120 },
  batchNumber: { type: String, required: true, trim: true, maxlength: 80 },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, default: "packs", maxlength: 30 },
  expiryDate: { type: Date, required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  storageNotes: { type: String, maxlength: 500 },
  recalled: { type: Boolean, default: false },
  damaged: { type: Boolean, default: false },
  redistributionReviewEligible: { type: Boolean, default: false },
  status: { type: String, enum: ["available", "under_review", "expired", "depleted"], default: "available" }
}, { timestamps: true });

medicineSchema.index({ expiryDate: 1, organization: 1 });
medicineSchema.index({ organization: 1, batchNumber: 1 }, { unique: true });

module.exports = mongoose.model("Medicine", medicineSchema);
