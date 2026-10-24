# Monkern Store

- `public/index.html` is the website. Replace `YOUR_TITLE_ID` in it with your PlayFab Title ID.
- `netlify/functions/` holds the server code for Stripe checkout and granting Monks.

Netlify environment variables needed (Site configuration > Environment variables):
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PLAYFAB_TITLE_ID, PLAYFAB_SECRET_KEY, SITE_URL

Never put secret keys in any file in this repo.
bt
