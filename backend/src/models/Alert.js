const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
  type: { type: String, enum: ["expiring_soon", "expired"], required: true },
  message: { type: String, required: true },
  expiresOn: Date,
  read: { type: Boolean, default: false },
  dedupeKey: { type: String, unique: true }
}, { timestamps: true });

module.exports = mongoose.model("Alert", alertSchema);
