const crypto = require("crypto");

const PACKS = [
  { monks: 500,   cents: 499,  name: "500 Monks" },
  { monks: 2000,  cents: 1000, name: "2000 Monks" },
  { monks: 11000, cents: 2000, name: "11000 Monks" },
  { monks: 20000, cents: 4000, name: "20000 Monks" }
];
const CURRENCY = "MK";

function resp(status, obj) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}

async function pf(endpoint, body) {
  const r = await fetch("https://" + process.env.PLAYFAB_TITLE_ID + ".playfabapi.com/Server/" + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": process.env.PLAYFAB_SECRET_KEY },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  if (d.code !== 200) throw new Error(d.errorMessage || "PlayFab error");
  return d.data;
}

async function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  try {
    const d = await pf("GetUserInternalData", { PlayFabId: parts[0], Keys: ["webToken", "webTokenExp"] });
    const t = d.Data && d.Data.webToken;
    const exp = d.Data && d.Data.webTokenExp;
    if (!t || !exp || t.Value !== parts[1] || parseInt(exp.Value, 10) < Date.now()) return null;
    return parts[0];
  } catch (e) {
    return null;
  }
}

async function grantForSession(session) {
  if (session.payment_status !== "paid") return { ok: false, error: "Payment not completed." };
  const id = session.metadata && session.metadata.playfabId;
  const monks = parseInt(session.metadata && session.metadata.monks, 10);
  if (!id || !monks) return { ok: false, error: "Invalid order." };

  const key = "s_" + crypto.createHash("sha256").update(session.id).digest("hex").slice(0, 40);

  const existing = await pf("GetUserInternalData", { PlayFabId: id, Keys: [key] });
  if (existing.Data && existing.Data[key]) return { ok: true, monks: monks, already: true };

  const nonce = crypto.randomBytes(8).toString("hex");
  await pf("UpdateUserInternalData", { PlayFabId: id, Data: { [key]: nonce } });
  await new Promise(function (r) { setTimeout(r, 400); });
  const check = await pf("GetUserInternalData", { PlayFabId: id, Keys: [key] });
  if (!check.Data || !check.Data[key] || check.Data[key].Value !== nonce) {
    return { ok: true, monks: monks, already: true };
  }

  try {
    await pf("AddUserVirtualCurrency", { PlayFabId: id, VirtualCurrency: CURRENCY, Amount: monks });
  } catch (e) {
    await pf("UpdateUserInternalData", { PlayFabId: id, Data: { [key]: null } }).catch(function () {});
    throw e;
  }
  return { ok: true, monks: monks, already: false };
}

module.exports = { PACKS, resp, verifyToken, grantForSession };
