// Backfill utility to populate ISO codes for existing analytics sessions
// Usage: node server/backfill-iso-codes.js

const { db } = require('./db');
const { analyticsSessions } = require('../shared/schema');
const { eq, isNull, or } = require('drizzle-orm');

// Import ISO countries library
const countries = require('i18n-iso-countries');
const en = require('i18n-iso-countries/langs/en.json');
countries.registerLocale(en);

// Country aliases for better matching
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

async function backfillIsoCodes() {
  console.log('🔄 Starting ISO code backfill for existing analytics sessions...');
  
  try {
    // Find sessions without ISO codes
    const sessionsWithoutIso = await db
      .select()
      .from(analyticsSessions)
      .where(
        or(
          isNull(analyticsSessions.countryIso2),
          isNull(analyticsSessions.countryIso3)
        )
      );

    console.log(`📊 Found ${sessionsWithoutIso.length} sessions without ISO codes`);

    let processed = 0;
    let resolved = 0;
    let unresolved = 0;

    for (const session of sessionsWithoutIso) {
      const { iso2, iso3 } = resolveCountryCodes(session.country);
      
      if (iso2 && iso3) {
        // Update the session with ISO codes
        await db
          .update(analyticsSessions)
          .set({
            countryIso2: iso2,
            countryIso3: iso3
          })
          .where(eq(analyticsSessions.id, session.id));
        
        resolved++;
        console.log(`✅ Resolved: ${session.country} → ${iso2}/${iso3} (${session.sessionId})`);
      } else {
        unresolved++;
        console.warn(`❌ Unresolved: ${session.country} (${session.sessionId})`);
      }
      
      processed++;
      
      // Progress indicator
      if (processed % 100 === 0) {
        console.log(`📈 Progress: ${processed}/${sessionsWithoutIso.length} sessions processed`);
      }
    }

    console.log('\n🎉 Backfill complete!');
    console.log(`📊 Total sessions processed: ${processed}`);
    console.log(`✅ Countries resolved: ${resolved}`);
    console.log(`❌ Countries unresolved: ${unresolved}`);
    console.log(`📈 Success rate: ${((resolved / processed) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run backfill
backfillIsoCodes()
  .then(() => {
    console.log('✅ Backfill process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill process failed:', error);
    process.exit(1);
  });