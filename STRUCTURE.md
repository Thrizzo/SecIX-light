# SecIX Light - Standalone Repository

This folder contains the Light-specific files for SecIX Light Edition.

## What's Here

These files are **different** from the Full edition:

| File | Purpose |
|------|---------|
| `src/app/SupabaseApp.tsx` | Simplified router (no Full-only routes) |
| `src/components/DashboardLayout.tsx` | Navigation with Light modules only |
| `src/pages/Settings.tsx` | Settings without Full-only tabs |
| `package.json` | Minimal dependencies |
| `docker-compose.yml` | Light edition deployment |

## Creating the Standalone Repo

To create a complete SecIX Light standalone repository:

1. **Copy this folder** as your new repo root
2. **Copy shared files** from the main SecIX repo:
   - `src/components/ui/*` - All UI components
   - `src/components/dashboard/*` - Dashboard widgets
   - `src/components/journey/*` - Security Journey
   - `src/components/risk/*` - Risk management
   - `src/components/controls/*` - Control library
   - `src/components/assets/*` - Asset management
   - `src/components/assistant/*` - AI Assistant
   - `src/components/settings/*` (except excluded tabs)
   - `src/components/home/*` - Homepage components
   - `src/components/ProtectedRoute.tsx`
   - `src/components/NavLink.tsx`
   - `src/hooks/*` - Light edition hooks only
   - `src/contexts/*` - Auth and Journey contexts
   - `src/lib/*` - Utilities and adapters
   - `src/integrations/*` - Database client
   - `src/pages/*` (except Full-only pages)
   - `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css`
   - `public/*` - Static assets
   - `deploy/docker/*` - Docker files
   - Config files: `tailwind.config.ts`, `tsconfig*.json`, `postcss.config.js`, etc.

3. **Initialize git**:
   ```bash
   git init
   git add .
   git commit -m "Initial SecIX Light release"
   ```

4. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/your-org/secix-light.git
   git push -u origin main
   ```

## Files NOT to Include

These are Full Edition only:

**Pages:**
- `src/pages/Governance.tsx`
- `src/pages/VendorManagement.tsx`
- `src/pages/BusinessImpactAssessment.tsx`
- `src/pages/BiaWizardPage.tsx`
- `src/pages/DataProtection.tsx`
- `src/pages/Maturity.tsx`
- `src/pages/SecurityOperations.tsx`
- `src/pages/AIGovernance.tsx`
- `src/pages/DataForge.tsx`
- `src/pages/MyWorkplace.tsx`

**Components:**
- `src/components/governance/*`
- `src/components/vendors/*`
- `src/components/bia/*`
- `src/components/dataprotection/*`
- `src/components/maturity/*`
- `src/components/securityops/*`
- `src/components/ai-governance/*`
- `src/components/dataforge/*`

**Hooks:**
- `useGovernance.ts`
- `useVendors.ts`
- `useBusinessImpact.ts`
- `useBiaAuditLogs.ts`
- `useContinuityPlans.ts`
- `useConfidentialityLevels.ts`
- `useMaturity.ts`
- `useSecurityOps.ts`
- `useAIGovernance.ts`
- `useDataForge.ts`
- `useDataForgeConnections.ts`
- `usePolicies.ts`
- `useMyWorkplace.ts`
- `useRegulatoryCompliance.ts`

**Settings Components:**
- `SSOSettings.tsx`
- `FragobertKnowledgeBase.tsx`
- `DataExportSettings.tsx`
- `CentralLoggingSettings.tsx`
