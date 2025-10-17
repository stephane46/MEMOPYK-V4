import * as XLSX from 'xlsx';
import { hybridStorage } from '../server/hybrid-storage';
import fs from 'fs';
import path from 'path';

const EXCEL_FILE = path.join(process.cwd(), 'partner-submissions.xlsx');

async function migratePartners() {
  console.log('🚀 Starting partner migration to Supabase...\n');

  if (!fs.existsSync(EXCEL_FILE)) {
    console.error('❌ Excel file not found:', EXCEL_FILE);
    process.exit(1);
  }

  try {
    // Read Excel file
    const workbook = XLSX.readFile(EXCEL_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${data.length} partners in Excel file\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Migrate each partner
    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      
      try {
        // Convert Excel row to Supabase format
        const partnerData = {
          timestamp: row['Timestamp'] || new Date().toISOString(),
          partner_type: row['Partner Type'] || 'digitization',
          partner_name: row['Partner Name'] || '',
          email: row['Email'] || '',
          email_public: row['Email_Public'] === 'TRUE' || row['Email_Public'] === true,
          phone: row['Phone'] || '',
          phone_public: row['Phone_Public'] === 'TRUE' || row['Phone_Public'] === true,
          website: row['Website'] || '',
          address: row['Address'] || '',
          address_line2: row['Complément d\'adresse'] || '',
          city: row['City'] || '',
          postal_code: row['Postal Code'] || '',
          country: row['Country'] || '',
          photo_formats: row['Photo Formats'] || '',
          other_photo: row['Other Photo'] || '',
          film_formats: row['Film Formats'] || '',
          other_film: row['Other Film'] || '',
          video_cassettes: row['Video Cassettes'] || '',
          other_video: row['Other Video'] || '',
          delivery: row['Delivery'] || '',
          other_delivery: row['Other Delivery'] || '',
          public_description: row['Public Description'] || '',
          consent: row['Consent'] === 'TRUE' || row['Consent'] === true || true,
          status: row['Status'] || 'Pending',
          is_active: row['Is_Active'] === 'TRUE' || row['Is_Active'] === true,
          show_on_map: row['Show_On_Map'] === 'TRUE' || row['Show_On_Map'] === true,
          lat: row['lat'] ? parseFloat(row['lat']) : null,
          lng: row['lng'] ? parseFloat(row['lng']) : null,
          slug: row['slug'] || ''
        };

        // Create partner in Supabase via hybrid storage
        const result = await hybridStorage.createPartner(partnerData);
        
        if (result) {
          successCount++;
          console.log(`✅ [${i + 1}/${data.length}] Migrated: ${partnerData.partner_name}`);
        } else {
          errorCount++;
          errors.push(`Row ${i + 1}: Failed to create partner ${partnerData.partner_name}`);
          console.error(`❌ [${i + 1}/${data.length}] Failed: ${partnerData.partner_name}`);
        }
      } catch (error: any) {
        errorCount++;
        errors.push(`Row ${i + 1}: ${error.message}`);
        console.error(`❌ [${i + 1}/${data.length}] Error: ${error.message}`);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${data.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(err => console.log(`   - ${err}`));
    }

    console.log('\n✨ Migration completed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migratePartners();
