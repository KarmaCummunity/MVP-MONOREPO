# KC Monorepo Documentation

Welcome to the KC (Karma Community) project documentation.

## 📚 Quick Navigation

### Getting Started
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Set up local development in 5 minutes
- **[Railway Deployment](RAILWAY_DEPLOYMENT.md)** - Deploy to production with Railway

### Core Guides
- **[Security Guide](SECURITY_GUIDE.md)** - Security best practices and guidelines
- **[Firebase Sync](FIREBASE_SYNC.md)** - Sync Firebase users to PostgreSQL
- **[Testing Plan](TESTING_PLAN.md)** - Testing strategies and plans

### Project Documentation
- **[Project Book (English)](project-book/01-system-requirements-en.md)** - System requirements
- **[Project Book (Hebrew)](project-book/01-system-requirements.md)** - דרישות מערכת

## 🚀 Quick Start

### For Developers

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kc-monorepo
   ```

2. **Follow the setup guide**
   - See [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md)

3. **Start coding!**

### For DevOps

1. **Review security guidelines**
   - See [SECURITY_GUIDE.md](SECURITY_GUIDE.md)

2. **Set up deployment**
   - See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)

## 📖 Documentation Structure

```
docs/
├── README.md                    # This file
├── DEVELOPMENT_SETUP.md         # Local development setup
├── RAILWAY_DEPLOYMENT.md        # Production deployment
├── SECURITY_GUIDE.md            # Security best practices
├── FIREBASE_SYNC.md             # Firebase synchronization
├── TESTING_PLAN.md              # Testing strategies
└── project-book/                # Project requirements
    ├── 01-system-requirements-en.md
    └── 01-system-requirements.md
```

## 🏗️ Project Structure

```
kc-monorepo/
├── apps/
│   ├── api/                     # NestJS backend
│   │   ├── src/
│   │   ├── migrations/
│   │   └── docs/
│   ├── mobile/                  # Expo mobile app
│   │   ├── screens/
│   │   ├── components/
│   │   └── docs/
│   └── dev-bot/                 # Development bot
├── docs/                        # Documentation (you are here)
├── docker-compose.yml           # Local services
└── package.json                 # Monorepo configuration
```

## 🛠️ Technology Stack

### Backend (API)
- **Framework**: NestJS
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: Firebase Auth + JWT

### Frontend (Mobile)
- **Framework**: React Native (Expo)
- **UI**: React Native Paper
- **State**: React Context
- **Navigation**: React Navigation

### Infrastructure
- **Hosting**: Railway
- **CI/CD**: GitHub Actions
- **Monitoring**: Railway Logs

## 🔒 Security

Security is a top priority. Key points:

- **Never commit secrets** - Use environment variables
- **Rotate credentials** - Quarterly for production
- **Use strong passwords** - Minimum 16 characters
- **Enable rate limiting** - Protect against abuse
- **Review access logs** - Monitor for anomalies

See [SECURITY_GUIDE.md](SECURITY_GUIDE.md) for details.

## 🧪 Testing

### Run Tests Locally

```bash
# API tests
cd apps/api
npm test

# Mobile tests
cd apps/mobile
npm test

# All tests
npm test
```

### Test Coverage

```bash
npm run test:cov
```

See [TESTING_PLAN.md](TESTING_PLAN.md) for strategies.

## 🚢 Deployment

### Environments

- **Production**: `https://karma-community-kc.com`
- **Development**: `https://dev.karma-community-kc.com`

### Deployment Process

1. Push to `main` branch (production) or `develop` (development)
2. GitHub Actions run tests
3. Railway auto-deploys if tests pass
4. Monitor logs for errors

See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for full guide.

## 📊 Monitoring

### Health Checks

- **API Health**: `https://api.karma-community-kc.com/health`
- **Redis Health**: `https://api.karma-community-kc.com/health/redis`
- **Database Health**: Check Railway logs

### Logs

- **Railway Dashboard**: Real-time logs
- **Application Logs**: Structured logging with context
- **Error Tracking**: Monitor 5xx errors

## 🤝 Contributing

### Before You Commit

- [ ] Tests pass: `npm test`
- [ ] Code formatted: `npm run format`
- [ ] Linting passes: `npm run lint`
- [ ] No secrets in code
- [ ] Documentation updated if needed

### Commit Message Format

```
type(scope): description

[optional body]
[optional footer]
```

Examples:
- `feat(api): add user profile endpoint`
- `fix(mobile): resolve login crash on Android`
- `docs: update deployment guide`

## 📞 Getting Help

### Common Issues

1. **Database connection failed**
   - Check Docker is running
   - Verify `.env` credentials
   - See [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md#common-issues)

2. **Deployment failed**
   - Check Railway logs
   - Verify environment variables
   - See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md#troubleshooting)

3. **Firebase sync issues**
   - Check service account key
   - Verify permissions
   - See [FIREBASE_SYNC.md](FIREBASE_SYNC.md#troubleshooting)

### Support Channels

1. Check documentation in `docs/`
2. Search GitHub issues
3. Create new issue with details
4. Contact team lead

## 📝 Changelog

Major changes are documented in:
- `apps/api/CHANGELOG.md` - API changes
- Git commit history - Detailed changes

## 📜 License

[Add license information here]

## 🙏 Acknowledgments

Built with:
- NestJS
- React Native
- Expo
- Railway
- Firebase

---

**Last Updated**: February 2026
**Version**: 2.0.0
**Status**: Active Development
