#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function setupHeroTextsTable() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🔧 Setting up hero_texts data in Supabase database...');

  try {
    // First, check if the hero_texts table exists by trying to select from it
    const { data: existingData, error: checkError } = await supabase
      .from('hero_texts')
      .select('*')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      console.log('❌ hero_texts table does not exist in Supabase');
      console.log('💡 Please create the table in your Supabase dashboard with this SQL:');
      console.log(`
        CREATE TABLE hero_texts (
          id BIGSERIAL PRIMARY KEY,
          title_fr TEXT NOT NULL,
          title_en TEXT NOT NULL,
          subtitle_fr TEXT DEFAULT '',
          subtitle_en TEXT DEFAULT '',
          font_size INTEGER DEFAULT 48,
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      return;
    }

    console.log('✅ hero_texts table exists');

    // Insert the production data
    const productionData = [
      {
        id: 1,
        title_fr: "Transformez vos souvenirs en films cinématographiques",
        title_en: "Transform your memories into cinematic films",
        subtitle_fr: "Créez des vidéos professionnelles à partir de vos photos et vidéos",
        subtitle_en: "Create professional videos from your photos and videos",
        is_active: false,
        font_size: 48,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z"
      },
      {
        id: 2,
        title_fr: "Nous transformons vos photos et vidéos personnelles en films souvenirs inoubliables",
        title_en: "We transform your personal photos and videos into unforgettable memory films",
        subtitle_fr: "Vos souvenirs méritent mieux que d'être simplement stockés, ils méritent une histoire",
        subtitle_en: "Your memories deserve better than just being stored, they deserve a story",
        is_active: true,
        font_size: 48,
        created_at: "2025-08-01T13:00:00.000Z",
        updated_at: "2025-08-01T13:00:00.000Z"
      }
    ];

    console.log('📝 Inserting production hero text data...');

    const { data, error: insertError } = await supabase
      .from('hero_texts')
      .upsert(productionData, { onConflict: 'id' });

    if (insertError) {
      console.error('❌ Error inserting data:', insertError);
      return;
    }

    console.log('✅ Production hero text data inserted successfully');
    console.log('🎯 Hero text synchronization now complete!');
    console.log('📋 Both production and Preview environments will use the same Supabase database');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupHeroTextsTable();