// Simple backfill script to update existing sessions with ISO codes
// Run with: node server/backfill-iso-simple.js

const { HybridStorage } = require('./hybrid-storage');
const countries = require('i18n-iso-countries');
const en = require('i18n-iso-countries/langs/en.json');
countries.registerLocale(en);

// Country aliases - same as in hybrid-storage.ts
const COUNTRY_ALIASES = new Map([
  ["usa", "United States"], ["u.s.a.", "United States"], ["us", "United States"],
  ["uk", "United Kingdom"], ["u.k.", "United Kingdom"],
  ["south korea", "Korea, Republic of"], ["north korea", "Korea, Democratic People's Republic of"],
  ["russia", "Russian Federation"], ["vietnam", "Viet Nam"], ["iran", "Iran, Islamic Republic of"],
  ["czech republic", "Czechia"], ["macedonia", "North Macedonia"]
]);

const resolveCountryCodes = (countryName) => {
  if (!countryName) return { iso2: null, iso3: null };
  const normalized = COUNTRY_ALIASES.get(countryName.toLowerCase()) || countryName;
  
  let iso2 = countries.getAlpha2Code(normalized, "en");
  if (!iso2) {
    // Try loose match
    const candidates = countries.getNames("en");
    const target = normalized.toLowerCase();
    for (const [code2, label] of Object.entries(candidates)) {
      if (label.toLowerCase() === target) { 
        iso2 = code2; 
        break; 
      }
    }
  }
  if (!iso2) {
    if (countryName && countryName !== "Unknown") {
      console.warn("[geo] Unresolved country:", countryName);
    }
    return { iso2: null, iso3: null };
  }
  const iso3 = countries.alpha2ToAlpha3(iso2) || null;
  return { iso2, iso3 };
};

async function runBackfill() {
  console.log('🔄 Starting ISO code backfill...');
  
  const storage = new HybridStorage();
  
  try {
    // Get all sessions that need ISO code updates
    const sessionsNeedingUpdate = await storage.db
      .select()
      .from(storage.analyticsSessions)
      .where(storage.or(
        storage.isNull(storage.analyticsSessions.countryIso2),
        storage.isNull(storage.analyticsSessions.countryIso3)
      ));

    console.log(`📊 Found ${sessionsNeedingUpdate.length} sessions needing ISO codes`);
    
    let updated = 0;
    let resolved = 0;
    let unresolved = 0;
    
    for (const session of sessionsNeedingUpdate) {
      const { iso2, iso3 } = resolveCountryCodes(session.country);
      
      if (iso2 && iso3) {
        await storage.db
          .update(storage.analyticsSessions)
          .set({
            countryIso2: iso2,
            countryIso3: iso3
          })
          .where(storage.eq(storage.analyticsSessions.id, session.id));
        
        resolved++;
        if (resolved % 100 === 0) {
          console.log(`✅ Progress: ${resolved} resolved`);
        }
      } else {
        unresolved++;
      }
      
      updated++;
    }
    
    console.log('\n🎉 Backfill complete!');
    console.log(`📊 Sessions processed: ${updated}`);
    console.log(`✅ Countries resolved: ${resolved}`);
    console.log(`❌ Countries unresolved: ${unresolved}`);
    console.log(`📈 Success rate: ${((resolved / updated) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Backfill error:', error);
    process.exit(1);
  }
}

runBackfill().then(() => {
  console.log('✅ Backfill completed successfully');
  process.exit(0);
});