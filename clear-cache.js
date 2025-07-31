// Emergency cache clearing script
const fs = require('fs');
const path = require('path');

const cacheDir = path.join(__dirname, 'server', 'cache', 'images');

if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir);
    console.log(`Found ${files.length} cached images`);
    
    files.forEach(file => {
        if (file.includes('TestImage')) {
            const filePath = path.join(cacheDir, file);
            fs.unlinkSync(filePath);
            console.log(`Deleted: ${file}`);
        }
    });
    
    console.log('Cache clearing complete');
} else {
    console.log('Cache directory not found');
}