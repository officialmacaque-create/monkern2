const Stripe = require("stripe");
const { PACKS, resp, verifyToken } = require("./_shared");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return resp(400, { error: "Bad request" }); }

  const pack = PACKS[body.pack];
  if (!pack) return resp(400, { error: "Unknown pack" });

  const playfabId = await verifyToken(body.token);
  if (!playfabId) return resp(401, { error: "Please log in again with a new game code." });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const site = process.env.SITE_URL.replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: { currency: "usd", unit_amount: pack.cents, product_data: { name: pack.name } }
      }],
      billing_address_collection: "required",
      metadata: { playfabId: playfabId, monks: String(pack.monks) },
      success_url: site + "/?paid=1&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: site + "/?canceled=1"
    });
    return resp(200, { url: session.url });
  } catch (e) {
    console.error(e);
    return resp(500, { error: "Could not start checkout." });
  }
};
