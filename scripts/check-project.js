const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const requiredPaths = [
    'src/server.js',
    'public/index.html',
    'public/login.html',
    'public/register.html',
    'public/achievements.html',
    'database/schema.sql',
    '.env.example'
];

for (const relativePath of requiredPaths) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`缺少项目文件：${relativePath}`);
    }
}

const serverSource = fs.readFileSync(path.join(root, 'src/server.js'), 'utf8');
const forbiddenPatterns = [
    /password:\s*['"]123456['"]/,
    /generativelanguage\.googleapis\.com/,
    /YOUR_GEMINI_API_KEY/,
    /\/player\/(?:items|progress)/
];

for (const pattern of forbiddenPatterns) {
    if (pattern.test(serverSource)) {
        throw new Error(`检测到不应提交的凭据或失效接口：${pattern}`);
    }
}

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const absolutePath = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
    });
}

const publicDirectory = path.join(root, 'public');
const publicCodeFiles = walk(publicDirectory).filter((file) => /\.(?:html|js)$/i.test(file));
for (const codeFile of publicCodeFiles) {
    const source = fs.readFileSync(codeFile, 'utf8');
    for (const pattern of forbiddenPatterns) {
        if (pattern.test(source)) {
            throw new Error(
                `检测到不应提交的凭据或失效接口：${path.relative(root, codeFile)} -> ${pattern}`
            );
        }
    }
}
const pageFiles = walk(publicDirectory).filter((file) => /\.(html|css)$/i.test(file));
const missingAssets = [];
const referencePatterns = [
    /(?:src|href)\s*=\s*["']([^"']+)["']/gi,
    /url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi
];

for (const pageFile of pageFiles) {
    const source = fs.readFileSync(pageFile, 'utf8');

    for (const pattern of referencePatterns) {
        pattern.lastIndex = 0;
        for (const match of source.matchAll(pattern)) {
            let reference = match[1].trim();
            if (!reference || /^(?:https?:|data:|javascript:|mailto:|#)/i.test(reference)) continue;
            if (reference.includes('${')) continue;
            if (reference.startsWith('/api/')) continue;

            reference = reference.split(/[?#]/, 1)[0];
            try {
                reference = decodeURIComponent(reference);
            } catch {
                // 浏览器也无法解码时，保留原字符串继续检查。
            }

            if (reference.startsWith('/') && !path.extname(reference)) continue;
            if (/\.(?:png|jpe?g|gif|webp|mp3|m4a|mp4|avi)$/i.test(reference)) continue;
            const target = reference.startsWith('/')
                ? path.join(publicDirectory, reference.slice(1))
                : path.resolve(path.dirname(pageFile), reference);

            if (!fs.existsSync(target)) {
                missingAssets.push(`${path.relative(root, pageFile)} -> ${reference}`);
            }
        }
    }
}

if (missingAssets.length > 0) {
    console.error('发现缺失的本地页面资源：');
    for (const item of [...new Set(missingAssets)].sort()) console.error(`- ${item}`);
    process.exitCode = 1;
} else {
    console.log(`项目结构检查通过（${requiredPaths.length} 个必要文件，${pageFiles.length} 个页面/样式文件；核心代码版不检查媒体资源）。`);
}
