import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean);
const forbidden = files.filter(
  (p) =>
    /(^|\/)(\.env($|\.(?!example$))|node_modules|\.local|\.next|dist)(\/|$)/.test(p) ||
    /\.(pem|key|p12|pfx)$/.test(p),
);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /AKIA[A-Z0-9]{16}/,
  /sk-proj-[A-Za-z0-9_-]{30,}/,
];
for (const path of files) {
  if (/\.(png|jpg|jpeg|webp|ico)$/.test(path)) continue;
  const body = readFileSync(path, 'utf8');
  if (patterns.some((p) => p.test(body))) forbidden.push(path);
}
if (forbidden.length) {
  console.error('Archivos potencialmente sensibles:', [...new Set(forbidden)]);
  process.exit(1);
}
console.log(
  `Revisados ${files.length} archivos: sin archivos privados ni patrones de secretos reconocidos. Las credenciales demo y CI son públicas e intencionales.`,
);
