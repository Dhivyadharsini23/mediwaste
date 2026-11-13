function getExpiryState(expiryDate, warningDays = Number(process.env.EXPIRY_WARNING_DAYS || 30)) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const daysRemaining = Math.ceil((expiryDay - today) / 86400000);

  if (daysRemaining < 0) return { state: "expired", daysRemaining };
  if (daysRemaining <= warningDays) return { state: "expiring_soon", daysRemaining };
  return { state: "available", daysRemaining };
}

module.exports = { getExpiryState };
