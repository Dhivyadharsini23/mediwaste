require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

(async () => {
  try {
    if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error("Set MONGODB_URI and JWT_SECRET in backend/.env first.");
    await mongoose.connect(process.env.MONGODB_URI);
    const email = String(process.env.ADMIN_EMAIL || "").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "";
    if (!email || password.length < 12) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in .env.");
    const passwordHash = await bcrypt.hash(password, 12);
    await User.updateOne({ email }, { $set: { name: process.env.ADMIN_NAME || "MediWaste Admin", email, passwordHash, role: "admin", verified: true } }, { upsert: true });
    console.log(`Admin account ready: ${email}`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
