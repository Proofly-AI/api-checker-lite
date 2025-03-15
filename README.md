# Proofly Checker

A web application for analyzing images for deepfakes using the Proofly API.

## Deployment on Vercel

### Prerequisites

1. A Vercel account
2. Access to the Proofly API
3. Node.js 18.x or later

Demo: https://proofly-checker.vercel.app

### Environment Variables

Set up the following environment variable in your Vercel project:

```bash
API_BASE_URL=https://api.proofly.ai/api
```

### Deployment Steps

1. Fork or clone this repository
2. Import your repository to Vercel
3. Configure environment variables in Vercel project settings
4. Deploy with default settings:
   - Framework Preset: Next.js
   - Build Command: `next build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### API Routes

The application includes the following API routes:

- `/api/proofly/upload` - File upload endpoint
- `/api/proofly/upload-url` - URL upload endpoint
- `/api/proofly/session/[uuid]` - Session information
- `/api/proofly/status` - System status
- `/api/proofly/generate-pdf/[uuid]` - PDF report generation

### Features

- Image upload via file or URL
- Deepfake detection analysis
- PDF report generation
- Real-time analysis status
- Individual face analysis
- Model confidence visualization

### Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Axios for API requests
- PDF generation with jsPDF

## About the Project

Proofly Checker is a web application for analyzing images for deepfakes using the Proofly API service. The application allows users to upload images, perform analysis and receive detailed authenticity verification results.

## Key Features

- Upload and analyze images for deepfakes
- Real-time processing status tracking
- Display detailed analysis results:
  - Image authenticity verdict
  - Authenticity/deepfake probability for each face
  - Comparison of results across different analysis models
- Ability to download the original image

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **UI Components**: shadcn/ui
- **API Integration**: Axios
- **API Proxy**: Next.js API Routes

## Installation and Running

### Requirements

- Node.js 18+ and npm

### Install

```bash
# Clone repository
git clone https://github.com/prooflyai/proofly-checker-lite.git
cd proofly-checker-new

# Install dependencies
npm install
```

### Development Launch

```bash
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## License

MIT
