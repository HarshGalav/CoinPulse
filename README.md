# CoinPulse - Real-Time Crypto Tracker

A comprehensive Next.js web application for tracking cryptocurrency prices in real-time, setting price alerts, and managing your crypto portfolio with advanced charting and analysis tools.

## Features

- 🚀 **Real-time Crypto Data**: Powered by CoinGecko API
- 🔔 **Price Alerts**: Set one-time or recurring price alerts
- 📧 **Email Notifications**: Get notified via email when alerts trigger
- 📊 **Interactive Charts**: View price trends with Recharts
- 🔍 **Search Functionality**: Find any cryptocurrency quickly
- 🌙 **Dark/Light Mode**: Toggle between themes
- 💱 **Multi-Currency Support**: USD, EUR, INR, GBP, JPY
- 🔐 **Google Authentication**: Secure login with NextAuth.js
- 📱 **Responsive Design**: Works on all devices
- 🔥 **Firebase Integration**: Store alerts and notifications

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: Firebase Firestore
- **Charts**: Recharts
- **Email**: Resend API
- **Notifications**: react-hot-toast
- **API**: CoinGecko API

## Setup Instructions

### 1. Clone the Repository

\`\`\`bash
git clone <your-repo-url>
cd coinpulse
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Environment Variables

Create a \`.env.local\` file in the root directory with the following variables:

\`\`\`env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin (Server-side)
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

# Resend API
RESEND_API_KEY=your-resend-api-key

# CoinGecko API (optional - has rate limits without key)
COINGECKO_API_KEY=your-coingecko-api-key
\`\`\`

### 4. Setup Services

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs: \`http://localhost:3000/api/auth/callback/google\`

#### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Create a service account and download the private key
5. Enable Authentication with Google provider

#### Resend Setup
1. Sign up at [Resend](https://resend.com/)
2. Get your API key
3. Verify your domain (for production)

#### CoinGecko API (Optional)
1. Sign up at [CoinGecko](https://www.coingecko.com/en/api)
2. Get your free API key for higher rate limits

### 5. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Setup Alert Checking (Production)

For production, set up a cron job or scheduled function to check alerts:

\`\`\`bash
# Add to your crontab to check alerts every 5 minutes
*/5 * * * * curl -X POST https://your-domain.com/api/alerts/check
\`\`\`

Or use Vercel Cron Jobs:

\`\`\`json
{
  "crons": [
    {
      "path": "/api/alerts/check",
      "schedule": "*/5 * * * *"
    }
  ]
}
\`\`\`

## Usage

1. **Browse Cryptocurrencies**: View top cryptocurrencies with real-time prices
2. **Search**: Use the search bar to find specific coins
3. **Set Alerts**: Click "Set Alert" on any coin to create price alerts
4. **View Charts**: Click "View Details" to see price charts
5. **Manage Currency**: Change your preferred currency from the header
6. **Theme Toggle**: Switch between dark and light modes

## Project Structure

\`\`\`
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── alerts/
│   │   ├── crypto/
│   │   └── notifications/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── AlertDialog.tsx
│   ├── CoinCard.tsx
│   ├── CoinSearch.tsx
│   └── PriceChart.tsx
├── lib/
│   ├── coingecko.ts
│   ├── firebase.ts
│   ├── firebase-admin.ts
│   └── utils.ts
└── ...
\`\`\`

## API Endpoints

- \`GET /api/crypto/coins\` - Get cryptocurrency list
- \`GET /api/crypto/search\` - Search cryptocurrencies
- \`GET /api/alerts\` - Get user alerts
- \`POST /api/alerts\` - Create new alert
- \`DELETE /api/alerts\` - Delete alert
- \`POST /api/alerts/check\` - Check and trigger alerts
- \`GET /api/notifications\` - Get notification history

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, email support@yourapp.com or create an issue on GitHub.