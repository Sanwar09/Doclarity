# Doclarity - Legal Document Demystifier 📄✨

An AI-powered web application that transforms complex legal documents into clear, accessible guidance. Upload contracts, leases, or terms of service and get instant plain-English analysis powered by Google's Gemini AI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)

Try it out: [Prototype Link](https://doclarity.sgp.dom.my.id)

## 🌟 Features

### Core Functionality
- **📊 At-a-Glance Summary** - Get key risks, important dates, and financial terms summarized instantly
- **🔍 Interactive Clause Explorer** - Drill into specific clauses with plain-English explanations
- **💬 AI-Powered Q&A Chat** - Ask questions about your document and get contextual answers
- **📑 PDF Report Generation** - Download professional analysis reports
- **🔒 Privacy-First Design** - Secure document processing with optional auto-deletion

### Supported Documents
- Rental/Lease Agreements
- Employment Contracts
- Terms of Service
- Loan Documents
- Service Agreements
- And more...

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google AI Studio API key ([Get one here](https://aistudio.google.com/))
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Shaun420/doclarity.git
cd doclarity
```

2. **Install dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **Set up environment variables**

Create `.env` files in both `server` and `client` directories:

**server/.env**
```env
PORT=5000
GEMINI_API_KEY=your_google_ai_studio_api_key
GEMINI_MODEL_ID=gemini-2.0-flash
ANALYZE_DEBUG=false
```

**client/.env**
```env
VITE_API_URL=http://localhost:5000
```

4. **Start the application**

In separate terminals:

```bash
# Terminal 1 - Start backend
cd server
npm run dev

# Terminal 2 - Start frontend
cd client
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:5173`

## 📁 Project Structure

```
legal-doc-demystifier/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   └── App.jsx          # Main app component
│   └── package.json
│
├── server/                    # Express backend
│   ├── routes/               # API routes
│   ├── services/             # Business logic
│   ├── uploads/              # Temporary file storage
│   └── server.js            # Express server
│
└── README.md
```

## 🔧 Configuration

### API Rate Limits
The free tier of Google AI Studio has the following limits:
- 15 requests per day
- 32,000 input tokens per minute
- 1,000 output tokens per request

For production use, consider:
1. Adding billing to your Google Cloud account
2. Implementing caching to reduce API calls
3. Using `gemini-1.5-flash` for better rate limits

### Security Considerations
- Documents are processed in memory and can be auto-deleted
- No permanent storage of sensitive information
- All API communications are encrypted
- Consider implementing authentication for production

## 🛠️ Development

### Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, Multer
- **AI**: Google Gemini API (Generative AI)
- **Document Processing**: pdfjs-dist, Mammoth
- **PDF Generation**: jsPDF

### Key Commands

```bash
# Development
npm run dev          # Start dev server
npm run build       # Build for production
npm run preview     # Preview production build

# Testing
npm test            # Run tests
npm run lint        # Run linter

# Deployment
npm run deploy      # Deploy to production
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload a document |
| `/api/analyze` | POST | Analyze uploaded document |
| `/api/chat` | POST | Chat about document |

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd client
npm run build
vercel --prod
```

### Backend (Render)
1. Push to GitHub
2. Connect repo to Render
3. Set environment variables
4. Deploy

### Environment Variables for Production
```env
NODE_ENV=production
GEMINI_API_KEY=your_api_key
CORS_ORIGIN=https://your-frontend-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚖️ Disclaimer

This tool provides general information and is not a substitute for professional legal advice. Always consult with a qualified attorney for legal matters.

## 🙏 Acknowledgments

- Google Gemini AI for powering the analysis
- The open-source community for amazing tools and libraries
- All contributors who help improve this project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/legal-doc-demystifier/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/legal-doc-demystifier/discussions)
- **Email**: support@legaldocdemystifier.com

---

Built with ❤️ to make legal documents accessible to everyone
