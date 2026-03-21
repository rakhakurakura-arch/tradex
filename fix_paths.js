const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\finaw\\.gemini\\antigravity\\scratch\\landing_page_sederhana\\tradedex';

// 1. Update HTML files
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // replace css
        // <link rel="stylesheet" href="css/style.css"> or <link rel="stylesheet" href="./css/style.css">
        // into /tradex/css/style.css
        
        content = content.replace(/(href=["'])(\.\/)?(css\/[^"']+)["']/g, '$1/tradex/$3"');
        content = content.replace(/(href=["'])\/?[tc]?[ar]?[ad]?[ed]?[xe]?\/?css\/([^"']+)["']/g, '$1/tradex/css/$2"'); // just in case it was already /css/ or /tradex/css/ (idempotent, kind of)
        
        // Let's do a simple regex so we don't double add /tradex/
        // Matches href="css/...", href="./css/...", href="/css/..."
        const cssRegex = /href=["'](?:(?:\.)?\/)?(?:tradex\/)?(css\/[^"']+)["']/g;
        content = content.replace(cssRegex, 'href="/tradex/$1"');
        
        // Matches src="js/...", src="./js/...", src="/js/..."
        const jsRegex = /src=["'](?:(?:\.)?\/)?(?:tradex\/)?(js\/[^"']+)["']/g;
        content = content.replace(jsRegex, 'src="/tradex/$1"');

        fs.writeFileSync(filePath, content, 'utf8');
    }
});

// 2. Update JS files (e.g. core.js, indonesis.js, screener.js)
const jsDir = path.join(dir, 'js');
if (fs.existsSync(jsDir)) {
    fs.readdirSync(jsDir).forEach(file => {
        if (file.endsWith('.js')) {
            const filePath = path.join(jsDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // replace window.location.href = '...' 
            // e.g. window.location.href = 'login.html', './login.html', '/login.html', '/tradex/login.html'
            // We want it to be /tradex/...
            const locationRegex = /(window\.location\.href\s*=\s*['"])(?:(?:\.)?\/)?(?:tradex\/)?([^/][^'"]*\.html)['"]/g;
            content = content.replace(locationRegex, '$1/tradex/$2"');
            
            fs.writeFileSync(filePath, content, 'utf8');
        }
    });
}

console.log('Update absolute paths complete!');
