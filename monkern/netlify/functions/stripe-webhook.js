const Stripe = require("stripe");
const { grantForSession } = require("./_shared");

exports.handler = async function (event) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = event.headers["stripe-signature"];
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;

  let ev;
  try {
    ev = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return { statusCode: 400, body: "Bad signature" };
  }

  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    try {
      await grantForSession(ev.data.object);
    } catch (e) {
      console.error(e);
      return { statusCode: 500, body: "Grant failed" };
    }
  }
  return { statusCode: 200, body: "ok" };
};
