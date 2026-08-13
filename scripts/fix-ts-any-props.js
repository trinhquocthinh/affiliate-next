const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/app/api');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/e\.code/g, '(e as any).code');
  content = content.replace(/e\.message/g, '(e as any).message');
  content = content.replace(/error\.code/g, '(error as any).code');
  content = content.replace(/error\.message/g, '(error as any).message');
  // Avoid duplicate casting if already casted
  content = content.replace(/\(e as any\)\.\(e as any\)/g, '(e as any)'); 
  content = content.replace(/\(error as any\)\.\(error as any\)/g, '(error as any)');
  // Fix cases where it's `error instanceof Error && error.message`, we shouldn't touch these, but `(error as any).message` is valid TS anyway. Wait, it's better to avoid replacing if it has `instanceof Error`.
  // Let's revert `(error as any).message` in those lines.
  content = content.replace(/error instanceof Error && \(error as any\)\.message/g, 'error instanceof Error && error.message');
  content = content.replace(/error instanceof Error \? \(error as any\)\.message/g, 'error instanceof Error ? error.message');
  content = content.replace(/e instanceof Error \? \(e as any\)\.message/g, 'e instanceof Error ? e.message');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
