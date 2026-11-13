const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requestedQuantity: { type: Number, required: true, min: 1 },
  message: { type: String, maxlength: 500 },
  status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending" },
  decisionNote: { type: String, maxlength: 500 },
  decidedAt: Date
}, { timestamps: true });

module.exports = mongoose.model("RedistributionRequest", requestSchema);
