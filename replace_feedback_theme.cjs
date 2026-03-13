const fs = require('fs');
const path = './components/ChallengeFeedback.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace stone with slate
content = content.replace(/stone-/g, 'slate-');

// Replace green with yellow
content = content.replace(/green-/g, 'yellow-');

// Fix specific yellow shades if needed
content = content.replace(/rgba\(34,197,94,0\.2\)/g, 'rgba(234,179,8,0.2)'); // green-500 rgb to yellow-500 rgb

fs.writeFileSync(path, content);
console.log('Done replacing theme in ChallengeFeedback.tsx');
