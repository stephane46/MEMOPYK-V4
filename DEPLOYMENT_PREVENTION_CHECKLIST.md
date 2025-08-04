# MEMOPYK Deployment Prevention Checklist
## How to Avoid Deployment Regression Issues

### Pre-Deployment Verification
1. **Verify Current Code State**
   - Check that development environment shows expected behavior
   - Confirm admin and public site are synchronized in development
   - Test critical functionality (image sync, shared mode logic)

2. **Code Version Verification**
   - Ensure all files are saved
   - Check git status shows latest commits
   - Verify no uncommitted critical changes

3. **Force Clean Build Markers** (ALWAYS RECOMMENDED)
   - Create deployment marker files with timestamp for every deployment
   - Include version numbers and force clean build flags
   - Document specific fixes being deployed
   - **Why:** Prevents Replit from packaging cached/inconsistent code snapshots

### Deployment Process
1. **Incremental Testing**
   - Test in development first
   - Verify database consistency
   - Check API responses match expectations

2. **Deployment Verification**
   - Monitor deployment logs for build completion
   - Test production immediately after deployment
   - Compare admin vs public behavior
   - Verify critical image synchronization

### Post-Deployment Verification
1. **Immediate Testing**
   - Test admin panel changes
   - Verify public site reflects admin changes
   - Check image URLs and shared mode logic

2. **Issue Detection**
   - If synchronization breaks, immediately document
   - Compare development vs production behavior
   - Create force clean deployment markers

### Root Cause Prevention
1. **Replit Platform Issues**
   - Build cache problems: Use force clean build markers
   - Git reference issues: Verify commits before deployment
   - File sync delays: Wait 30 seconds between saves and deployment

2. **Code Consistency**
   - Ensure all components use same shared mode logic
   - Maintain consistent field name transformations
   - Keep admin and public components synchronized

### Emergency Recovery
1. **If Deployment Breaks Working Features**
   - Document exact behavior difference
   - Identify which components are out of sync
   - Create force clean deployment with current code
   - Test thoroughly before claiming success

### Lesson Learned
**Never claim deployment success without production verification**
- Development working ≠ Production working
- Deployment can break existing functionality
- Always test production immediately after deployment