# Joshua Froelich - Official Merch & Music Website

A professional e-commerce website for Christian Rock musician Joshua Froelich, featuring merchandise sales, music releases, and an admin panel for order management.

![Christian Rock Music](assets/images/hero-image.jpg)

## 🎸 Features

### Customer-Facing
- **Merchandise Store**: T-shirts with size selection (S-4XL), CDs, and digital downloads
- **Shopping Cart**: Persistent cart with localStorage, floating cart button, and drawer UI
- **Checkout System**: Integrated checkout with shipping options and order confirmation
- **Music Releases**: EP showcase and track listings
- **Tour Dates**: Concert schedule with ticket purchasing
- **Responsive Design**: Mobile-friendly interface with Bootstrap 5

### Admin Panel
- **Order Management**: View, filter, and search all orders
- **Order Details**: Update order status, add tracking numbers, and internal notes
- **Shipping Integration**: Support for USPS, FedEx, UPS, and DHL
- **Invoice Generation**: Print professional invoices
- **Data Export**: Export orders to CSV
- **Backup & Restore**: Full order data backup/restoration
- **Tax Settings**: Configure tax rates by country
- **Secure Access**: Nginx Basic Auth (server-side)

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/joshua-froelich.git
   cd joshua-froelich
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_IDS, ADMIN_USER, ADMIN_PASS
   ```

3. **Start the server**
   ```bash
   npm start
   # Or: node server.js
   # Visit: http://localhost:3000
   ```

4. **Access Admin Panel**
   - Go to `/admin` or `/admin-login.html` (login page), then click "Open Admin"
   - Or go directly to `/admin.html` — your browser will prompt for username/password
   - Requires `ADMIN_USER` and `ADMIN_PASS` in `.env`

## 📬 Contact Form (Telegram Integration)

The contact form sends inquiries to Telegram instead of Formspree. All Telegram requests run server-side; the bot token and chat IDs are never exposed to the client.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram Bot API token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_IDS` | Comma-separated list of chat IDs to receive notifications (e.g. `583092767,256521999`) |
| `ADMIN_USER` | Username for admin Basic Auth (required for `/admin.html`) |
| `ADMIN_PASS` | Password for admin Basic Auth |

### Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the token.
2. Get your chat ID (e.g. by messaging [@userinfobot](https://t.me/userinfobot) or using the Telegram API).
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and set:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_IDS=583092767,256521999
   ```

### Testing Locally

1. Ensure `.env` is configured with valid credentials.
2. Start the server: `npm start` or `node server.js`
3. Open http://localhost:3000/contact.html
4. Submit the form — you should receive a message in Telegram.
5. Check the browser console for any errors if it fails.

### Security

- The bot token and chat IDs are stored in environment variables only.
- The client receives only `{ ok: true }` or `{ ok: false }` — no Telegram API response is exposed.
- Rate limit: 5 requests per 10 minutes per IP.
- Honeypot field helps reduce spam.

## 📁 Project Structure

```
joshua-froelich/
├── server.js               # Node.js server (static files + /api/contact)
├── package.json            # Node dependencies
├── .env.example             # Environment template for Telegram
├── index.html              # Homepage
├── about.html              # About page
├── music.html              # Music releases
├── merch.html              # Merchandise store
├── contact.html            # Contact form
├── checkout.html           # Checkout page
├── admin.html              # Admin panel (protected by Nginx Basic Auth)
├── admin-login.html        # Optional friendly entry page (unprotected)
├── assets/
│   ├── css/
│   │   ├── main.css        # Custom styles
│   │   └── cart.css        # Cart & checkout styles
│   ├── js/
│   │   ├── main.js         # Core functionality
│   │   ├── cart.js         # Shopping cart
│   │   ├── checkout.js     # Checkout logic
│   │   ├── admin.js        # Admin panel
│   │   ├── tour.js         # Tour dates
│   │   ├── slider.js       # Image sliders
│   │   └── track.js        # Music player
│   ├── images/             # Images and graphics
│   └── fonts/              # Custom fonts
├── vendor/                 # Third-party libraries (Bootstrap, etc.)
├── Original Recordings/        # Source audio files
└── README.md                   # This file
```

## 🛒 Cart & Checkout System

### localStorage Keys
- `cr_cart` - Shopping cart items
- `cr_orders` - Order history
- `cr_tax_settings` - Tax configuration

### Cart Item Structure
```javascript
{
  id: "tee",
  name: "Reigning Over Darkness — Tee",
  price: 24.00,
  quantity: 1,
  size: "L"  // For apparel items
}
```

## 🔐 Protecting admin.html with Nginx Basic Auth

The admin panel is protected by **Nginx Basic Auth** on the server. No passwords or hashes are stored in the frontend code.

### 1. Create the password file (on your VPS)

```bash
# Install htpasswd tool
sudo apt update && sudo apt install -y apache2-utils

# Create auth directory
sudo mkdir -p /etc/nginx/auth

# Create password file (creates user "admin"; you will be prompted for password)
sudo htpasswd -c /etc/nginx/auth/cyrusreigns_admin.htpasswd admin
```

### 2. Add the location blocks to your Nginx site config

Add these blocks inside your `server { }` block for cyrusreigns.com (e.g. `/etc/nginx/sites-available/cyrusreigns`):

```nginx
# Admin login page: explicitly unprotected (friendly entry point)
location = /admin-login.html {
    auth_basic off;
}

# Admin panel: protected
location = /admin.html {
    auth_basic "CyrusReigns Admin";
    auth_basic_user_file /etc/nginx/auth/cyrusreigns_admin.htpasswd;
    add_header Cache-Control "no-store";
}

# Admin JS: protected (defense in depth; prevents loading admin logic without auth)
location = /assets/js/admin.js {
    auth_basic "CyrusReigns Admin";
    auth_basic_user_file /etc/nginx/auth/cyrusreigns_admin.htpasswd;
    add_header Cache-Control "no-store";
}
```

A sample config is in `nginx-admin-auth.conf.example`.

### 3. Validate and reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Change password or add users

```bash
# Change password for existing user "admin"
sudo htpasswd /etc/nginx/auth/cyrusreigns_admin.htpasswd admin

# Add another user (omit -c to avoid overwriting)
sudo htpasswd /etc/nginx/auth/cyrusreigns_admin.htpasswd another_user
```

### Defense in depth (frontend)

The admin page hides the dashboard by default. On load, it sends a `HEAD` request to `/admin.html`. If the response is 401 (not authenticated), it shows a locked message with no sensitive data. If 200 (authenticated via Nginx Basic Auth), it shows the dashboard. No passwords or hashes in JS.

### Optional: Friendly login page

`admin-login.html` is an unprotected page that explains the auth flow and links to `/admin.html`. Users can visit it first; clicking "Open Admin" will trigger the browser's Basic Auth prompt. This is **not** security—it is only a user-friendly entry point.

## 🔐 Security Notes

### Admin Panel
- Protected by Nginx Basic Auth (server-side)
- No passwords, hashes, or secrets in frontend code or git

### Production Recommendations
1. **Use HTTPS** (required for Basic Auth over the internet)
2. **Add CORS protection** if using APIs
3. **Implement rate limiting** on sensitive endpoints
4. **Use environment variables** for any backend secrets (e.g. Telegram bot token)

## 🎨 Customization

### Update Product Catalog
Edit the `PRODUCTS` object in [`assets/js/cart.js`](assets/js/cart.js):
```javascript
var PRODUCTS = {
  cd: { name: 'First EP — CD', price: 12.00, image: 'assets/images/merch/02-cd.jpg' },
  tee: { name: 'Your Product', price: 24.00, image: 'path/to/image.jpg' }
};
```

### Modify T-Shirt Sizes
Update `TEE_SIZES` array in [`assets/js/cart.js`](assets/js/cart.js):
```javascript
var TEE_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
```

### Change Tax Rates
Access admin panel → Settings tab → Update tax percentages

## 🧪 Testing

### Manual Testing Checklist
- [ ] Add items to cart
- [ ] Modify quantities and sizes in cart
- [ ] Remove items from cart
- [ ] Complete checkout process
- [ ] Verify order appears in admin panel
- [ ] Update order status
- [ ] Generate invoice
- [ ] Export orders to CSV
- [ ] Test on mobile devices
- [ ] Test in different browsers

## 📦 Deployment

### Docker (VPS / Cloud Server)

1. **On your VPS**, clone the repo and create `.env`:
   ```bash
   git clone https://github.com/yourusername/joshua-froelich.git
   cd joshua-froelich
   cp .env.example .env
   # Edit .env with TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_IDS
   ```

2. **Build and run**:
   ```bash
   docker compose up -d --build
   ```
   The site will be available on port 3001 (mapped from container port 3000).

3. **With custom domain / HTTPS** (recommended for production):
   - Use a reverse proxy (nginx, Caddy, Traefik) in front of the container
   - Or add Certbot/Let's Encrypt for SSL

4. **Stop the container**:
   ```bash
   docker compose down
   ```

### GitHub Pages (Static Hosting)
```bash
# Push to GitHub
git push origin main

# Enable GitHub Pages in repository settings
# Select branch: main
# Select folder: / (root)
```
**Note:** The contact form requires the Node.js backend (`/api/contact`). GitHub Pages serves static files only, so the contact form will not work there. Use Docker or a Node-capable host for full functionality.

### Traditional Web Hosting
1. Upload all root files to your web server
2. Ensure `index.html` is in the root directory
3. Configure `.htaccess` if using Apache
4. Enable HTTPS (required for admin authentication)

## 🛠️ Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Custom styling with animations
- **JavaScript (ES5)** - Vanilla JS, no framework dependencies
- **Bootstrap 5** - UI framework
- **Font Awesome** - Icons
- **localStorage** - Client-side data persistence

## Technology

- HTML5
- CSS3
- Vanilla JavaScript (ES5)
- Bootstrap 5
- Font Awesome
- localStorage
- Web Crypto API

## 📄 License

Copyright © 2024 Joshua Froelich / Cyrus Reigns Records. All rights reserved.

**Important**: This repository contains copyrighted music, artwork, and branding. Please contact for licensing inquiries.

## 🤝 Contributing

This is a personal artist website. For bug reports or feature suggestions, please open an issue.

## 📞 Contact

- **Website**: [joshuafroelich.com](#)
- **Email**: [contact@joshuafroelich.com](#)
- **Social Media**: [Facebook](https://web.facebook.com/joshuafroelich), [Instagram](https://www.instagram.com/joshuafroelich/), [YouTube](https://www.youtube.com/channel/UCepBkCq38CtJiBGfgO_tq3g)

## 🎵 About Cyrus Reigns

Cyrus Reigns is a Christian Rock project bringing powerful music with a faith-based message. The project combines heavy rock aesthetics with spiritual themes, creating a unique sound that resonates with believers and rock fans alike.

---

**Made with ❤️ for the glory of God**
