const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\finaw\\.gemini\\antigravity\\scratch\\landing_page_sederhana\\tradedex\\js';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.js')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // fix: 'some.html" -> 'some.html'
        // fix: "some.html" -> "some.html"
        // Basically, window.location.href = '/tradex/login.html";
        content = content.replace(/(window\.location\.href\s*=\s*')([^'"]*)["']/g, "$1$2'");
        content = content.replace(/(window\.location\.href\s*=\s*")([^'"]*)["']/g, '$1$2"');
        
        fs.writeFileSync(filePath, content, 'utf8');
    }
});
console.log('Fixed quotes!');
