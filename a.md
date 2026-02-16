# Alpha Groups - Architecture Review & Implementation Launch

## Current Status
✅ Research Phase: COMPLETE
✅ Architecture Phase: COMPLETE (architecture.md generated)
🚀 Ready to: Review architecture → Spawn implementation team

---

## Step 1: Review Architecture Document

Please read the architecture.md file that the Architect created and share the key points:
- System architecture overview
- Component breakdown
- Database schema decisions
- API endpoint specifications
- Technology stack confirmations
- Security considerations
- Deployment strategy

After I review it, I'll either approve it or provide feedback for adjustments.

---

## Step 2: Once Architecture is Approved

After reviewing architecture.md, if everything looks good, I'll confirm approval. Then immediately spawn all 4 implementation teammates in parallel:

### Teammate 3: Backend & Blockchain Developer (Sonnet)
````bash
/teammate spawn "You are the Backend & Blockchain Developer for Alpha Groups. Your responsibilities:

CONTEXT: Review architecture.md for the complete system design and technical decisions.

PRIMARY TASKS:

1. Review architecture.md for backend specifications and API contracts
2. Implement Solana wallet verification system:
   - Use @solana/web3.js for wallet validation
   - Implement message signing verification with tweetnacl
   - Validate signatures match wallet addresses
3. Build FairScale API integration:
   - Fetch FairScores from FairScale API (range: 0-1000)
   - Handle API errors and rate limiting
   - Cache scores appropriately
4. Create Express.js REST API with TypeScript:
   - POST /api/verify - Initiate verification flow
   - POST /api/verify/confirm - Confirm signature and fetch FairScore
   - GET /api/members/:groupId - Get group members
   - GET /api/groups - List all groups
   - PATCH /api/groups/:id - Update group settings
   - DELETE /api/members/:id - Remove member
5. Implement webhook handling for Telegram events:
   - Member join requests
   - Member removals
   - Bot commands routing
6. Build auto-kick cron job logic:
   - Check member FairScores periodically
   - Kick members below tier threshold if auto-kick enabled
   - Log all actions
7. Set up proper error handling, logging, and validation
8. Write API documentation for Frontend team

TECHNICAL REQUIREMENTS:
- Node.js with TypeScript
- Express.js for REST API
- @solana/web3.js for Solana integration
- tweetnacl for signature verification
- Proper environment variable handling
- Rate limiting and security middleware
- Error handling middleware
- Request validation with Zod or similar

REFERENCES:
- System design: architecture.md
- Technical specs: ALPHA-GROUPS-SPEC.md
- Database schema: Coordinate with Teammate 6

COORDINATION:
- Work with Teammate 4 (Telegram Bot) for webhook integration and bot commands
- Work with Teammate 5 (Frontend) for API contracts and data schemas
- Work with Teammate 6 (DevOps) for deployment and environment setup

Start by reviewing architecture.md and creating the Express.js server structure with proper TypeScript configuration." --model sonnet
````

### Teammate 4: Telegram Bot Specialist (Sonnet)
````bash
/teammate spawn "You are the Telegram Bot Specialist for Alpha Groups. Your responsibilities:

CONTEXT: Review architecture.md for the complete system design and bot flow specifications.

PRIMARY TASKS:

1. Review architecture.md for Telegram bot specifications and user flows
2. Implement Telegram bot using node-telegram-bot-api:
   - Initialize bot with proper configuration
   - Set up webhook or polling based on architecture decision
   - Handle bot lifecycle and error recovery
3. Build command handlers:
   - /verify - Start verification process (send web app link with unique token)
   - /status - Show user's current FairScore and tier
   - /help - Display help message with available commands
   - /admin - Admin commands (set thresholds, toggle auto-kick, view stats)
4. Create inline keyboard interfaces:
   - Verification flow buttons
   - Admin control panels
   - Confirmation dialogs
5. Implement group management features:
   - Handle member join requests
   - Track member additions/removals
   - Monitor group events
   - Handle bot being added to groups
6. Build admin commands:
   - Set tier thresholds per group
   - Toggle auto-kick on/off
   - View group statistics
   - Manual member verification
   - Force re-verification
7. Handle Telegram webhooks and events properly with error handling
8. Implement rate limiting to avoid Telegram API limits

TECHNICAL REQUIREMENTS:
- node-telegram-bot-api with TypeScript
- Webhook handling for production
- Proper message formatting (Markdown/HTML)
- Inline keyboard builders
- Session management for multi-step commands
- Error recovery and retry logic
- Telegram API best practices

REFERENCES:
- System design: architecture.md
- Bot implementation examples: ALPHA-GROUPS-SPEC.md
- Database schema: Coordinate with Teammate 6

COORDINATION:
- Work with Teammate 3 (Backend) for API integration and verification flow
- Work with Teammate 6 (DevOps) for webhook configuration and deployment

Start by reviewing architecture.md and setting up the bot structure with command routing." --model sonnet
````

### Teammate 5: Frontend & UI Developer (Sonnet)
````bash
/teammate spawn "You are the Frontend & UI Developer for Alpha Groups. Your responsibilities:

CONTEXT: Review architecture.md for the complete system design and frontend specifications.

IMPORTANT - DESIGN SYSTEM: A design system has been generated in the design-system/ directory. You MUST review design-system/MASTER.md and any page-specific files in design-system/pages/ BEFORE building any components. Follow all design guidelines, color palettes, typography, and anti-patterns specified in the design system.

PRIMARY TASKS:

1. Review architecture.md for frontend architecture and component structure
2. **Read and internalize the design system** (design-system/MASTER.md) for UI/UX guidelines
3. Build Next.js 14 verification webpage with App Router:
   - Landing page explaining Alpha Groups and verification process
   - Wallet connection interface with Solana Wallet Adapter
   - Message signing flow with clear instructions
   - Success/error states with user-friendly feedback
   - Redirect back to Telegram after verification
4. Build comprehensive Admin Dashboard with crypto-native UI:
   - **Member Management Table**: Display telegram_id, wallet_address, fairscore, tier with sorting/filtering/search
   - **Tier Distribution Charts**: Visual breakdown of Bronze (300+), Silver (500+), Gold (700+) members
   - **Group Management Panel**: Create/configure groups, set custom tier thresholds, toggle auto-kick
   - **Real-time Status Indicators**: Member count, pending verifications, recent activity
   - **Analytics Views**: Member growth over time, FairScore distribution, tier migration patterns
   - **Bulk Actions**: Mass re-verification, export member lists
5. Implement Solana Wallet Adapter integration:
   - Support multiple wallet types (Phantom, Solflare, etc.)
   - Proper error handling for wallet connection issues
   - Message signing with clear user prompts
6. Create reusable component library following design system:
   - TierBadge component (Bronze/Silver/Gold with visual indicators)
   - FairScoreDisplay component with progress bar
   - MemberCard component for list/grid views
   - ConnectWalletButton with loading and error states
   - AdminControls with confirmation modals
   - StatCard for dashboard metrics
7. Implement authentication for admin dashboard (if specified in architecture)

DESIGN SYSTEM COMPLIANCE (from ui-ux-pro-max):

- **Visual Style**: Glassmorphism for cards, modern crypto/blockchain aesthetic
- **Color Palette**: Apply crypto-appropriate colors from design system (avoid bright neons)
- **Typography**: Follow font pairings specified in design system
- **Dark Mode**: Implement as PRIMARY theme (light mode optional)
- **Icons**: Use Heroicons or Lucide ONLY - NO emoji icons
- **Animations**: Smooth transitions (150-300ms) with hover states on all interactive elements
- **Accessibility**: 4.5:1 text contrast minimum, visible focus states, keyboard navigation
- **Cursors**: Add cursor-pointer to all clickable elements
- **Motion**: Respect prefers-reduced-motion
- **Responsive**: Breakpoints at 375px, 768px, 1024px, 1440px

PRE-DELIVERY CHECKLIST:
□ No emoji icons (SVG only)
□ All interactive elements have cursor-pointer and hover states
□ Text contrast meets 4.5:1 minimum
□ Focus states visible for keyboard users
□ Responsive across all breakpoints tested
□ Loading states for all async operations
□ Error boundaries implemented
□ Proper TypeScript types throughout
□ API integration tested with Backend teammate

TECH STACK:
- Next.js 14 (App Router, Server Components where appropriate)
- React 18 with TypeScript
- Solana Wallet Adapter (@solana/wallet-adapter-react, @solana/wallet-adapter-react-ui)
- shadcn/ui for base components
- Tailwind CSS for styling
- Recharts or Chart.js for visualizations
- Lucide React for icons
- React Query for data fetching (optional)

REFERENCES:
- System design: architecture.md
- Technical specs: ALPHA-GROUPS-SPEC.md
- Design guidelines: design-system/MASTER.md

COORDINATION:
- Work with Teammate 3 (Backend) for API contracts and data schemas
- Work with Teammate 6 (DevOps) for deployment and environment variables

Start by reviewing architecture.md and design-system/MASTER.md, then create the Next.js project structure." --model sonnet
````

### Teammate 6: Database & DevOps Engineer (Haiku)
````bash
/teammate spawn "You are the Database & DevOps Engineer for Alpha Groups. Your responsibilities:

CONTEXT: Review architecture.md for infrastructure and deployment specifications.

PRIMARY TASKS:

1. Review architecture.md for database schema and deployment strategy
2. Set up Supabase project:
   - Create new Supabase project for Alpha Groups
   - Configure PostgreSQL database
   - Set up authentication if needed for admin access
3. Create database schema based on architecture.md:
   - groups table (id, telegram_group_id, thresholds, settings)
   - members table (id, group_id, telegram_id, wallet_address, fairscore, tier)
   - Create indexes for performance (telegram_id, wallet_address, group_id)
   - Add foreign key constraints
   - Set up created_at/updated_at triggers
4. Set up Row Level Security (RLS) policies:
   - Protect sensitive data
   - Configure access policies for admin operations
5. Configure environment variables and secrets:
   - Document all required env vars
   - Create .env.example files
   - Set up secrets in deployment platforms
   - Telegram bot token
   - Supabase credentials
   - Solana RPC endpoint
   - FairScale API key
6. Deploy backend services:
   - Choose platform (Vercel/Railway/Render based on architecture)
   - Configure Express.js backend deployment
   - Set up webhook endpoints for Telegram
   - Configure CORS and security headers
7. Deploy frontend:
   - Deploy Next.js app to Vercel
   - Configure custom domain if needed
   - Set up environment variables
8. Set up cron job for auto-kick functionality:
   - Configure scheduled tasks
   - Monitor execution logs
9. Set up monitoring and logging:
   - Error tracking (Sentry or similar)
   - Performance monitoring
   - Database query monitoring
   - Telegram webhook health checks
10. Create deployment documentation with step-by-step instructions

TECHNICAL REQUIREMENTS:
- Supabase (PostgreSQL + Auth + Storage)
- Docker for containerization (if needed)
- CI/CD pipeline setup (GitHub Actions)
- Environment management
- SSL/TLS configuration
- Backup strategy
- Monitoring and alerting

REFERENCES:
- System design: architecture.md
- Database schema: ALPHA-GROUPS-SPEC.md
- Deployment guide: ALPHA-GROUPS-SPEC.md

COORDINATION:
- Provide database credentials to all teammates
- Share API endpoint URLs once backend is deployed
- Configure Telegram webhook URL for Teammate 4
- Set up frontend deployment URL for Teammate 5
- Ensure all teammates have necessary environment variables

Start by reviewing architecture.md and setting up the Supabase project with the database schema." --model haiku
````

---

## Step 3: Monitor Progress

After spawning all teammates, check their status periodically:
````bash
/teammates status
````

Let them work in parallel. They will coordinate with each other as specified in their prompts.

---

## Ready?

I'll now read architecture.md and share the key points for your review. Once you approve, we'll spawn all 4 teammates together.