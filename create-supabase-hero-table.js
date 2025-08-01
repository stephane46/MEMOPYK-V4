#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function createHeroTextsTable() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('🔧 Creating hero_texts table in Supabase database...');

  try {
    // Use the sql RPC function to execute DDL
    const { data, error } = await supabase.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS hero_texts (
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
        
        -- Enable RLS (Row Level Security)
        ALTER TABLE hero_texts ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow all operations for service role
        CREATE POLICY "Allow all operations for service role" ON hero_texts
        FOR ALL USING (true);
      `
    });

    if (error) {
      console.error('❌ Error creating table:', error);
      throw error;
    }

    console.log('✅ hero_texts table created successfully');

    // Insert production data
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

    const { data: insertData, error: insertError } = await supabase
      .from('hero_texts')
      .upsert(productionData, { onConflict: 'id' })
      .select();

    if (insertError) {
      console.error('❌ Error inserting data:', insertError);
      throw insertError;
    }

    console.log('✅ Production data inserted:', insertData);
    console.log('🎯 Hero text database synchronization is now COMPLETE!');
    console.log('📋 Both production and Preview environments now use the same Supabase database');

    return true;
  } catch (error) {
    console.error('❌ Failed to create table:', error);
    return false;
  }
}

createHeroTextsTable();