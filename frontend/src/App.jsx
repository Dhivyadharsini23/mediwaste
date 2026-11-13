import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Bell, Boxes, Building2, CheckCircle2, ClipboardList, HeartHandshake, LogOut, Plus, RefreshCw, ShieldCheck, PackageSearch } from "lucide-react";
import api from "./api";

const moneyDate = d => d ? new Date(d).toLocaleDateString() : "—";
const errText = e => e?.response?.data?.message || "Something went wrong. Check the API connection.";

function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("mw_user")); } catch { return null; } });
  const [token, setToken] = useState(localStorage.getItem("mw_token"));
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [authMode, setAuthMode] = useState("login");

  const notify = msg => { setToast(msg); window.setTimeout(() => setToast(""), 3500); };
  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [d, m, r, a] = await Promise.all([
        api.get("/dashboard"), api.get("/medicines"), api.get("/requests/mine"), api.get("/alerts")
      ]);
      setDashboard(d.data); setMedicines(m.data.medicines); setRequests(r.data.requests); setAlerts(a.data.alerts);
      if (["ngo", "hospital", "admin"].includes(user?.role)) {
        const l = await api.get("/medicines/listings"); setListings(l.data.listings);
      } else setListings([]);
    } catch (e) { notify(errText(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (token) load(); }, [token]);

  const logout = () => {
    localStorage.removeItem("mw_token"); localStorage.removeItem("mw_user");
    setToken(null); setUser(null); setDashboard(null);
  };

  const onAuth = async e => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(path, payload);
      localStorage.setItem("mw_token", data.token); localStorage.setItem("mw_user", JSON.stringify(data.user));
      setToken(data.token); setUser(data.user); notify("Welcome to MediWaste."); 
    } catch (e) { notify(errText(e)); }
  };

  const addMedicine = async e => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const p = Object.fromEntries(fd.entries());
    p.quantity = Number(p.quantity); p.redistributionReviewEligible = fd.get("redistributionReviewEligible") === "on";
    try { await api.post("/medicines", p); e.currentTarget.reset(); notify("Medicine batch added."); load(); }
    catch (e) { notify(errText(e)); }
  };

  const requestMedicine = async item => {
    const q = Number(window.prompt(`How many ${item.unit || "units"} would you like to request?`, "1"));
    if (!Number.isInteger(q) || q < 1) return;
    try { await api.post("/requests", { medicineId: item._id, requestedQuantity: q }); notify("Request submitted to the supplier."); load(); }
    catch (e) { notify(errText(e)); }
  };

  const decide = async (id, decision) => {
    try { await api.patch(`/requests/${id}/decision`, { decision }); notify(`Request ${decision}.`); load(); }
    catch (e) { notify(errText(e)); }
  };

  const runCheck = async () => {
    try { const { data } = await api.post("/alerts/run-check"); notify(`Expiry scan complete: ${data.alertsCreated} new alert(s).`); load(); }
    catch (e) { notify(errText(e)); }
  };

  if (!token || !user) return <AuthScreen mode={authMode} setMode={setAuthMode} onSubmit={onAuth} />;

  const nav = [
    ["dashboard", "Dashboard", Activity],
    ["inventory", "Medicine inventory", Boxes],
    ...(user.role === "ngo" || user.role === "hospital" || user.role === "admin" ? [["listings", "Redistribution listings", HeartHandshake]] : []),
    ["requests", "Requests", ClipboardList],
    ["alerts", "Expiry alerts", Bell]
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><HeartHandshake size={22}/></div><div><b>MediWaste</b><small>SMART MEDICINE CYCLE</small></div></div>
      <div className="org-chip"><Building2 size={16}/><span>{user.organizationName || user.name}</span></div>
      <nav>{nav.map(([id, label, Icon]) => <button key={id} className={tab === id ? "nav-item active" : "nav-item"} onClick={() => setTab(id)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="secure-note"><ShieldCheck size={17}/><span>Authorized access only</span></div><button className="logout" onClick={logout}><LogOut size={17}/> Sign out</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">MEDICINE LIFECYCLE MANAGEMENT</div><h1>{nav.find(n => n[0] === tab)?.[1] || "Dashboard"}</h1></div><div className="top-actions"><span className="role-pill">{user.role}</span><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={17}/></button><div className="avatar">{(user.name || "U").slice(0,1).toUpperCase()}</div></div></header>
      {loading && <div className="loading-line">Refreshing data…</div>}
      {tab === "dashboard" && <Dashboard data={dashboard} medicines={medicines} requests={requests} alerts={alerts} user={user} onRunCheck={runCheck}/>}
      {tab === "inventory" && <Inventory medicines={medicines} role={user.role} onAdd={addMedicine}/>}
      {tab === "listings" && <Listings items={listings} onRequest={requestMedicine}/>}
      {tab === "requests" && <Requests items={requests} user={user} onDecide={decide}/>}
      {tab === "alerts" && <Alerts items={alerts}/>}
      <footer>© 2026 MediWaste · Student project MVP · Not a medicine-safety certification system</footer>
    </main>
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function AuthScreen({ mode, setMode, onSubmit }) {
  return <div className="auth-page"><div className="auth-art"><div className="brand light"><div className="brand-icon"><HeartHandshake size={22}/></div><div><b>MediWaste</b><small>SMART MEDICINE CYCLE</small></div></div><div className="art-copy"><span className="eyebrow">LESS WASTE. BETTER VISIBILITY.</span><h1>Make every medicine batch count.</h1><p>Track inventory, spot approaching expiry dates and coordinate responsible surplus review from one workspace.</p><div className="art-stats"><div><b>01</b><span>Track batches</span></div><div><b>02</b><span>Review expiry</span></div><div><b>03</b><span>Coordinate safely</span></div></div></div><div className="art-orb orb-one"></div><div className="art-orb orb-two"></div></div>
    <div className="auth-panel"><div className="auth-card"><div className="mobile-brand">MediWaste</div><div className="eyebrow">WELCOME TO MEDIWASTE</div><h2>{mode === "login" ? "Sign in to your workspace" : "Create an organization account"}</h2><p className="muted">{mode === "login" ? "Manage medicine inventory and expiry review." : "Register as a pharmacy, hospital or NGO."}</p>
      <form onSubmit={onSubmit} className="form-stack">
        {mode === "register" && <><label>Full name<input name="name" required placeholder="Your name"/></label><label>Organization name<input name="organizationName" required placeholder="Organization"/></label><label>Account type<select name="role" required><option value="pharmacy">Pharmacy</option><option value="hospital">Hospital</option><option value="ngo">NGO</option></select></label></>}
        <label>Email address<input name="email" type="email" required placeholder="name@organization.com"/></label>
        <label>Password<input name="password" type="password" required minLength="10" placeholder="At least 10 characters"/></label>
        <button className="primary full" type="submit">{mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <div className="switch-auth">{mode === "login" ? "New to MediWaste?" : "Already registered?"} <button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create account" : "Sign in"}</button></div>
      <div className="auth-warning"><ShieldCheck size={16}/> Admin accounts are provisioned by the project administrator.</div>
    </div></div></div>;
}

function Dashboard({ data, medicines, requests, alerts, user, onRunCheck }) {
  const c = data?.counts || {};
  const cards = [
    ["Medicine batches", c.totalBatches ?? 0, "Inventory records", Boxes],
    ["Total units", c.totalUnits ?? 0, "Across your batches", PackageSearch],
    ["Expiring soon", c.expiringSoon ?? 0, "Requires review", AlertTriangle],
    ["Expired batches", c.expired ?? 0, "Blocked from requests", ShieldCheck]
  ];
  return <div className="content">
    <div className="welcome-row"><div><h2>Hello, {user.name.split(" ")[0]}</h2><p>Here is the latest overview of your medicine inventory.</p></div>{user.role === "admin" && <button className="secondary" onClick={onRunCheck}><RefreshCw size={16}/> Run expiry scan</button>}</div>
    <div className="stat-grid">{cards.map(([title, value, note, Icon], i) => <div className="stat-card" key={title}><div className={`stat-icon stat-${i}`}><Icon size={19}/></div><div className="stat-label">{title}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>)}</div>
    <div className="two-col"><section className="panel"><div className="panel-head"><div><h3>Upcoming expiry review</h3><p>Closest expiry dates in your inventory</p></div><span className="soft-tag">BATCH VIEW</span></div><div className="table-wrap"><table><thead><tr><th>Medicine</th><th>Batch</th><th>Expiry date</th><th>Status</th></tr></thead><tbody>{medicines.slice().sort((a,b)=>new Date(a.expiryDate)-new Date(b.expiryDate)).slice(0,6).map(m=><tr key={m._id}><td><b>{m.name}</b></td><td>{m.batchNumber}</td><td>{moneyDate(m.expiryDate)}</td><td><Status medicine={m}/></td></tr>)}</tbody></table>{!medicines.length && <Empty text="No medicine batches added yet."/>}</div></section>
    <section className="panel"><div className="panel-head"><div><h3>Recent alerts</h3><p>Expiry checks and review reminders</p></div><Bell size={18} className="muted-icon"/></div>{alerts.slice(0,5).map(a=><div className="alert-row" key={a._id}><div className="alert-dot"></div><div><b>{a.medicine?.name || "Medicine batch"}</b><p>{a.message}</p><small>{moneyDate(a.createdAt)}</small></div></div>)}{!alerts.length && <Empty text="No alerts yet."/>}</section></div>
    <section className="panel request-summary"><div className="panel-head"><div><h3>Redistribution requests</h3><p>Latest activity involving your organization</p></div><span className="count-tag">{requests.filter(r=>r.status==="pending").length} pending</span></div>{requests.slice(0,4).map(r=><div className="request-row" key={r._id}><div><b>{r.medicine?.name || "Medicine"}</b><p>{r.requester?.organizationName || r.requester?.name} → {r.supplier?.organizationName || r.supplier?.name}</p></div><span className={`request-status ${r.status}`}>{r.status}</span></div>)}{!requests.length && <Empty text="No redistribution requests yet."/>}</section>
  </div>;
}

function Status({ medicine }) {
  const exp = medicine.expiry || {};
  const state = exp.state || (medicine.status === "expired" ? "expired" : medicine.status === "under_review" ? "expiring_soon" : "available");
  return <span className={`status ${state}`}>{state === "expiring_soon" ? `Review · ${exp.daysRemaining ?? "—"}d` : state.replace("_"," ")}</span>;
}

function Inventory({ medicines, role, onAdd }) {
  const canAdd = ["pharmacy","hospital","admin"].includes(role);
  return <div className="content"><div className="section-intro"><div><h2>Medicine inventory</h2><p>Track each medicine by batch, quantity and expiry date.</p></div></div>
    {canAdd && <section className="panel"><div className="panel-head"><div><h3><Plus size={17}/> Add medicine batch</h3><p>Enter accurate batch-level information.</p></div></div><form className="medicine-form" onSubmit={onAdd}>
      <label>Medicine name<input name="name" required placeholder="e.g. Demo vitamin tablets"/></label>
      <label>Generic name<input name="genericName" placeholder="Optional"/></label>
      <label>Batch number<input name="batchNumber" required placeholder="BATCH-001"/></label>
      <label>Quantity<input name="quantity" type="number" min="0" step="1" required placeholder="100"/></label>
      <label>Unit<input name="unit" defaultValue="packs"/></label>
      <label>Expiry date<input name="expiryDate" type="date" required/></label>
      <label className="wide">Storage / handling notes<textarea name="storageNotes" placeholder="Record storage conditions and relevant handling notes"/></label>
      <label className="check-label wide"><input type="checkbox" name="redistributionReviewEligible"/> Mark for authorized manual redistribution review (not an approval)</label>
      <div className="wide form-footnote">Only use fictitious demo records for testing. Eligibility requires independent pharmacist and regulatory review.</div>
      <div className="wide"><button className="primary" type="submit"><Plus size={16}/> Save batch</button></div>
    </form></section>}
    <section className="panel"><div className="panel-head"><div><h3>All batches</h3><p>{medicines.length} record(s)</p></div></div><div className="table-wrap"><table><thead><tr><th>Medicine</th><th>Batch number</th><th>Quantity</th><th>Expiry date</th><th>Status</th></tr></thead><tbody>{medicines.map(m=><tr key={m._id}><td><b>{m.name}</b><small className="cell-sub">{m.genericName || "—"}</small></td><td>{m.batchNumber}</td><td>{m.quantity} {m.unit}</td><td>{moneyDate(m.expiryDate)}</td><td><Status medicine={m}/></td></tr>)}</tbody></table>{!medicines.length && <Empty text="Your inventory is empty. Add your first medicine batch above."/>}</div></section>
  </div>;
}

function Listings({ items, onRequest }) {
  return <div className="content"><div className="section-intro"><div><h2>Redistribution listings</h2><p>Surplus batches submitted for authorized manual review.</p></div></div><div className="listing-grid">{items.map(m=><div className="listing-card" key={m._id}><div className="listing-top"><span className="soft-tag">REVIEW LISTING</span><span className="status available">Not expired</span></div><h3>{m.name}</h3><p className="muted">{m.genericName || "Generic name not supplied"}</p><div className="listing-details"><div><small>Batch number</small><b>{m.batchNumber}</b></div><div><small>Quantity shown</small><b>{m.quantity} {m.unit}</b></div><div><small>Expiry date</small><b>{moneyDate(m.expiryDate)}</b></div><div><small>Listed by</small><b>{m.organization?.organizationName || m.organization?.name}</b></div></div><p className="safety-note"><ShieldCheck size={15}/> Request does not mean medicine is approved for transfer.</p><button className="primary full" onClick={()=>onRequest(m)}>Submit request</button></div>)}{!items.length && <div className="panel"><Empty text="No listings are currently available for review." /></div>}</div></div>;
}

function Requests({ items, user, onDecide }) {
  return <div className="content"><div className="section-intro"><div><h2>Redistribution requests</h2><p>Review requests sent by or to your organization.</p></div></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Medicine</th><th>Requested by</th><th>Supplier</th><th>Quantity</th><th>Status</th><th>Action</th></tr></thead><tbody>{items.map(r=><tr key={r._id}><td><b>{r.medicine?.name || "Medicine"}</b><small className="cell-sub">{r.medicine?.batchNumber}</small></td><td>{r.requester?.organizationName || r.requester?.name}</td><td>{r.supplier?.organizationName || r.supplier?.name}</td><td>{r.requestedQuantity}</td><td><span className={`request-status ${r.status}`}>{r.status}</span></td><td>{r.status === "pending" && (user.role === "admin" || String(r.supplier?._id) === String(user._id)) ? <div className="action-pair"><button className="approve" onClick={()=>onDecide(r._id,"approved")}>Approve</button><button className="reject" onClick={()=>onDecide(r._id,"rejected")}>Reject</button></div> : "—"}</td></tr>)}</tbody></table>{!items.length && <Empty text="No requests found."/>}</div></section></div>;
}

function Alerts({ items }) {
  return <div className="content"><div className="section-intro"><div><h2>Expiry alerts</h2><p>Alerts generated from batch expiry dates.</p></div></div><section className="panel">{items.map(a=><div className="full-alert" key={a._id}><div className="alert-symbol"><AlertTriangle size={19}/></div><div><b>{a.message}</b><p>{a.medicine?.batchNumber || "Batch"} · {moneyDate(a.createdAt)}</p></div><span className={`request-status ${a.type}`}>{a.type.replace("_"," ")}</span></div>)}{!items.length && <Empty text="No expiry alerts. Admin can run a scan to check batches."/>}</section></div>;
}

function Empty({ text }) { return <div className="empty"><CheckCircle2 size={23}/><span>{text}</span></div>; }

export default App;
