const fs = require('fs');
const path = require('path');

class DebugLogger {
  constructor() {
    this.logFile = path.join(__dirname, 'crop-debug.log');
    this.log('=== CROP DEBUG SESSION STARTED ===');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${message}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logEntry);
      console.log(`[DEBUG LOG] ${message}`);
    } catch (error) {
      console.error('Failed to write to debug log:', error);
    }
  }

  clear() {
    try {
      fs.writeFileSync(this.logFile, '');
      this.log('=== LOG CLEARED ===');
    } catch (error) {
      console.error('Failed to clear debug log:', error);
    }
  }

  read() {
    try {
      return fs.readFileSync(this.logFile, 'utf8');
    } catch (error) {
      return 'Error reading log file: ' + error.message;
    }
  }
}

module.exports = new DebugLogger();