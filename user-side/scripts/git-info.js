const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Get git info
  const message = execSync('git log -1 --pretty=format:"%s"').toString().trim();
  const hash = execSync('git log -1 --pretty=format:"%h"').toString().trim();
  const date = execSync('git log -1 --pretty=format:"%ar"').toString().trim();
  const author = execSync('git log -1 --pretty=format:"%an"').toString().trim();
  const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

  const gitInfo = {
    message,
    hash,
    date,
    author,
    branch,
    timestamp: new Date().toISOString()
  };

  // Write to public folder
  const outputPath = path.join(__dirname, '../public/git-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(gitInfo, null, 2));
  
  console.log('✓ Git info saved:', gitInfo.message);
} catch (error) {
  console.warn('⚠ Could not get git info:', error.message);
  
  // Write fallback
  const fallback = {
    message: 'No git info available',
    hash: '',
    date: '',
    author: '',
    branch: '',
    timestamp: new Date().toISOString()
  };
  
  const outputPath = path.join(__dirname, '../public/git-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(fallback, null, 2));
}
