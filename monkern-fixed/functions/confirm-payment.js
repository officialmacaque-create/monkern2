const Stripe = require("stripe");
const { resp, grantForSession } = require("./_shared");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return resp(400, { error: "Bad request" }); }

  const sid = String(body.session_id || "");
  if (sid.indexOf("cs_") !== 0) return resp(400, { error: "Bad session" });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sid);
    const result = await grantForSession(session);
    return resp(200, result);
  } catch (e) {
    console.error(e);
    return resp(500, { ok: false, error: "Could not confirm payment." });
  }
};
