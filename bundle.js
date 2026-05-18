const fs = require('fs');
const path = require('path');

// CONFIGURATION
const START_DIR = '.';
const OUTPUT_FILE = 'email-app-resend.txt';
const EXCLUDED_FILES = ['.DS_Store', 'pnpm-lock.yaml', 'package-lock.json', "__init__.py", OUTPUT_FILE];
const EXCLUDED_FOLDERS = ['node_modules', '.next', '.git', 'dist', 'build', '.vercel', "pytest_cache", "venv", ".vscode", "__pycache__"];
const ALLOWED_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx', ".py", ".md", ".schema", ".css"];

function getFilesRecursive(dir, fileList = []) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    console.error(`⚠️ Cannot read directory ${dir}: ${err.message}`);
    return fileList;
  }

  files.forEach((file) => {
    const filePath = path.join(dir, file);

    try {
      const stats = fs.lstatSync(filePath);

      if (stats.isDirectory()) {
        // Skip hidden folders and explicitly excluded ones
        if (file.startsWith('.') && file !== '.') {
          // Only skip if it's in our ignore list (like .next or .git)
          if (EXCLUDED_FOLDERS.includes(file)) return;
        }

        if (EXCLUDED_FOLDERS.includes(file)) return;

        // RECURSION HAPPENS HERE
        getFilesRecursive(filePath, fileList);
      } else if (stats.isFile()) {
        const ext = path.extname(file);
        if (ALLOWED_EXTENSIONS.includes(ext) && !EXCLUDED_FILES.includes(file)) {
          fileList.push(filePath);
        }
      }
    } catch (err) {
      console.log(`⏩ Skipping inaccessible path: ${filePath}`);
    }
  });

  return fileList;
}

function runBundle() {
  console.log(`🔍 Scanning: ${START_DIR}...`);

  if (!fs.existsSync(START_DIR)) {
    console.error(`❌ Error: Folder "${START_DIR}" not found.`);
    return;
  }

  // Clear existing list and start fresh
  const allFiles = getFilesRecursive(START_DIR);

  if (allFiles.length === 0) {
    console.log("Empty result. Check your ALLOWED_EXTENSIONS or EXCLUDED_FOLDERS.");
    return;
  }

  const stream = fs.createWriteStream(OUTPUT_FILE);
  stream.write(`BUNDLED API CONTEXT - ${new Date().toLocaleString()}\n`);
  stream.write(`TOTAL FILES: ${allFiles.length}\n`);

  allFiles.forEach((filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);

      stream.write(`\n\n${'#'.repeat(60)}\n`);
      stream.write(`### FILE: ${relativePath}\n`);
      stream.write(`${'#'.repeat(60)}\n\n`);

      const lang = path.extname(filePath).replace('.', '') || 'text';
      stream.write(`\`\`\`${lang}\n`);
      stream.write(content);
      stream.write(`\n\`\`\`\n`);

      console.log(`📦 Added: ${relativePath}`);
    } catch (e) {
      console.log(`❌ Failed to read: ${filePath}`);
    }
  });

  stream.end();
  console.log(`\n✅ Done! ${allFiles.length} files saved to ${OUTPUT_FILE}`);
}

runBundle();