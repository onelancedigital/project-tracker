# GitHub Project Tracker

A SvelteKit application for tracking GitHub milestones and issues with secure magic link authentication.

## Features

- **Secure Authentication**: Magic link sent via email
- **Kanban Board**: Visual columns (To Do, In Progress, Done)
- **List View**: Detailed issue display
- **Milestones**: Progress tracking with progress bars
- **Comments**: Display issue comments
- **Restricted Access**: Email whitelist for authorized users

## Prerequisites

- Node.js 18 or higher
- A GitHub account with repository access
- A Resend account (free tier available) for sending emails

## Installation

1. Clone the repository:

```bash
git clone https://github.com/onelancedigital/project-tracker.git
cd project-tracker
```

2. Install dependencies:

```bash
npm install
```

## Configuration

### 1. Environment Variables

Create a `.env` file at the root of the project:

```env
# GitHub Configuration
GITHUB_PAT=ghp_yourPersonalAccessToken
GITHUB_REPO=owner/repository-name

# Resend Configuration (for email sending)
RESEND_API_KEY=re_yourAPIKey
RESEND_FROM_EMAIL=onboarding@resend.dev

# JWT Secret (generate a strong random key)
JWT_SECRET=your-super-secure-jwt-secret

# Allowed Emails (comma-separated list)
ALLOWED_EMAILS=user1@example.com,user2@example.com

# Application URL
APP_URL=http://localhost:5173
```

### 2. GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `repo` (Full control of private repositories)
4. Copy the generated token and paste it in the `GITHUB_PAT` environment variable

### 3. Resend Email Service

1. Create a free account at [resend.com](https://resend.com)
2. Navigate to [API Keys](https://resend.com/api-keys)
3. Create a new API key
4. Copy the key and paste it in the `RESEND_API_KEY` environment variable
5. For testing, use `onboarding@resend.dev` as the `RESEND_FROM_EMAIL` value

### 4. Allowed Emails

Add authorized email addresses to the `ALLOWED_EMAILS` environment variable, separated by commas:

```env
ALLOWED_EMAILS=client@example.com,admin@example.com,team@example.com
```

Only users with these email addresses will be able to authenticate and access the application.

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at [http://localhost:5173](http://localhost:5173)

### Production Build

```bash
npm run build
npm run preview
```

## Deployment

### Using Docker

A Dockerfile is provided for containerized deployment:

```bash
# Build the Docker image
docker build -t project-tracker .

# Run the container
docker run -p 3000:3000 --env-file .env project-tracker
```

### Environment Variables for Production

Make sure to set all required environment variables in your production environment. Never commit the `.env` file to version control.

## Project Structure

```
project-tracker/
├── src/
│   ├── hooks.server.ts           # Authentication middleware
│   ├── lib/
│   │   └── server/
│   │       ├── auth.ts            # JWT authentication logic
│   │       ├── config.ts          # Environment configuration
│   │       └── email.ts           # Email sending via Resend
│   └── routes/
│       ├── +page.svelte           # Main dashboard
│       ├── api/
│       │   ├── auth/              # Authentication endpoints
│       │   └── github/            # GitHub API proxies
│       └── auth/
│           └── login/             # Login page
├── .env                           # Environment variables (not in git)
├── package.json
└── README.md
```

## How It Works

1. **Authentication Flow**:
   - User enters their email on the login page
   - If the email is in the allowed list, a magic link is sent
   - User clicks the link and gets authenticated with a JWT token
   - Token is stored in a secure HTTP-only cookie

2. **GitHub Integration**:
   - The app fetches issues and milestones from your GitHub repository
   - Issues are displayed in a Kanban board or list view
   - Progress is tracked based on issue states and milestones

3. **Security**:
   - Only whitelisted emails can access the application
   - All GitHub API calls go through the server to keep the PAT secure
   - JWT tokens have an expiration time

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please file an issue on GitHub.

Vibecoded with ❤️ by onelance digital.