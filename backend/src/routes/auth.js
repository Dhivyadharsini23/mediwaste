const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

function makeToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, organizationName } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: "Name, email, password and role are required." });
    if (!["pharmacy", "hospital", "ngo"].includes(role)) return res.status(400).json({ message: "Choose pharmacy, hospital or NGO. Admin accounts are created separately." });
    if (password.length < 10) return res.status(400).json({ message: "Password must be at least 10 characters." });
    const normalizedEmail = String(email).toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "Email is already registered." });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: normalizedEmail, passwordHash, role, organizationName });
    const safe = user.toObject(); delete safe.passwordHash;
    res.status(201).json({ token: makeToken(user), user: safe });
  } catch (err) {
    res.status(500).json({ message: "Registration failed.", detail: err.code === 11000 ? "Email already exists." : undefined });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || "").toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({ message: "Incorrect email or password." });
  const safe = user.toObject(); delete safe.passwordHash;
  res.json({ token: makeToken(user), user: safe });
});

router.get("/me", protect, (req, res) => res.json({ user: req.user }));

module.exports = router;
