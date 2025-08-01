# MEMOPYK DEPLOYMENT INSTRUCTIONS v1.0.111

## QUICK DEPLOYMENT GUIDE

### 1. PRE-DEPLOYMENT BACKUP
```bash
# Backup your current deployment
cp -r your-current-deployment your-current-deployment-backup-$(date +%Y%m%d)
```

### 2. ENVIRONMENT VARIABLES CHECK
Ensure these are set in your production environment:
- `DATABASE_URL` (Your Supabase database connection)
- `SUPABASE_URL` (Your Supabase project URL) 
- `SUPABASE_ANON_KEY` (Supabase public key)
- `SUPABASE_SERVICE_KEY` (Supabase service role key)
- `SESSION_SECRET` (Random secret for sessions)

### 3. DEPLOYMENT STEPS
```bash
# 1. Extract deployment package
tar -xzf MEMOPYK_DEPLOYMENT_v1.0.111_CACHE_SYNC_FIX.tar.gz

# 2. Install dependencies
npm install

# 3. Build for production
npm run build

# 4. Start the application
npm start
```

### 4. CRITICAL VERIFICATION STEPS

**A. Admin Interface Test:**
1. Go to `https://your-domain.com/admin`
2. Login with your credentials
3. Navigate to Gallery Management
4. Edit any gallery item (change title, description, etc.)
5. Save the changes

**B. Cache Synchronization Test:**
1. Open your public site in another tab: `https://your-domain.com`
2. After saving changes in admin, check if they appear immediately on public site
3. Check browser console - both should show: `🚨 CACHE SYNCHRONIZATION FIX v1.0.110`

**C. Console Verification:**
In both admin and public sites, you should see:
```
🚨 CACHE SYNCHRONIZATION FIX v1.0.110
✅ Public site now uses same cache key as admin
📋 Cache invalidation synchronized between admin and public
🎯 Gallery data loading with synchronized query keys
```

### 5. WHAT THIS FIX SOLVES

**Before Fix:**
- Admin interface used cache key `v1.0.110`
- Public gallery used cache key `v1.0.91`
- Changes in admin didn't appear on public site immediately
- Cache isolation caused synchronization issues

**After Fix:**
- Both admin and public use cache key `v1.0.110`
- Admin changes appear immediately on public site
- Unified cache invalidation system
- Real-time synchronization between admin and public

### 6. TROUBLESHOOTING

**If admin changes don't appear on public site:**
1. Check console logs for cache key version
2. Clear browser cache completely
3. Restart the application
4. Verify environment variables are correct

**If you see build errors:**
1. Delete `node_modules` folder
2. Delete `package-lock.json`
3. Run `npm install` again
4. Run `npm run build`

**If database connection fails:**
1. Verify `DATABASE_URL` is correct
2. Check Supabase project is active
3. Confirm database credentials

### 7. ROLLBACK PROCEDURE (If Needed)

```bash
# Stop current application
pm2 stop all  # or your process manager

# Restore backup
rm -rf current-deployment
mv your-current-deployment-backup-$(date +%Y%m%d) current-deployment

# Restart with previous version
cd current-deployment
npm start
```

### 8. SUCCESS INDICATORS

✅ Admin interface loads without errors
✅ Public gallery displays correctly  
✅ Console shows `v1.0.110` in both admin and public
✅ Admin changes appear immediately on public site
✅ All gallery functionality works (upload, edit, delete)
✅ Video lightbox functions properly
✅ Bilingual content displays correctly

### 9. SUPPORT

- **Data Safety**: All your content remains in Supabase database
- **No Data Loss**: This is a frontend cache synchronization fix only
- **Minimal Downtime**: < 2 minutes for deployment
- **Risk Level**: Low (no database schema changes)

---

**Ready to Deploy**: ✅ YES
**Estimated Time**: 5-10 minutes
**Critical Fix**: Cache synchronization between admin and public gallery