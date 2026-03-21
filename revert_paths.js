const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\finaw\\.gemini\\antigravity\\scratch\\landing_page_sederhana\\tradedex';

// 1. Revert HTML files
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // replace href="/tradex/css/..." with href="css/..."
        content = content.replace(/href=["']\/tradex\/css\/([^"']+)["']/g, 'href="css/$1"');
        
        // replace src="/tradex/js/..." with src="js/..."
        content = content.replace(/src=["']\/tradex\/js\/([^"']+)["']/g, 'src="js/$1"');

        fs.writeFileSync(filePath, content, 'utf8');
    }
});

// 2. Revert JS files
const jsDir = path.join(dir, 'js');
if (fs.existsSync(jsDir)) {
    fs.readdirSync(jsDir).forEach(file => {
        if (file.endsWith('.js')) {
            const filePath = path.join(jsDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // replace window.location.href = '/tradex/login.html' with 'login.html'
            content = content.replace(/(window\.location\.href\s*=\s*['"])\/tradex\/([^'"]*)["']/g, "$1$2'");
            
            fs.writeFileSync(filePath, content, 'utf8');
        }
    });
}

console.log('Revert absolute paths complete!');
