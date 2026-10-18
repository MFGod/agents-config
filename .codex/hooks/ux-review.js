#!/usr/bin/env node
// PostToolUse: UX review checklist after editing UI files.
// Triggers on .tsx|.jsx|.vue|.svelte|.html|.css|.scss|.sass|.less
// Outputs questions Claude must address before declaring work done.

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let parsed;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString()); } catch { process.exit(0); }

  if (!parsed || (parsed.tool_name !== 'Edit' && parsed.tool_name !== 'Write')) process.exit(0);

  const filePath = parsed.tool_input?.file_path || '';
  if (!/\.(tsx|jsx|vue|svelte|html|css|scss|sass|less)$/i.test(filePath)) process.exit(0);

  const file = filePath.split('/').pop();

  const output = [
    `[ux-review] ${file} — обязательная проверка:`,
    '• UX стал лучше или хуже? (конкретно, не "чище")',
    '• Визуальная иерархия не нарушена?',
    '• Читаемость не упала (контраст, размер, длина строк)?',
    '• Визуальный шум не вырос?',
    '• Похоже на шаблонный AI-лендинг? Если да — переработай.',
    '• Сделала бы это команда Stripe/Linear/Vercel? Если нет — почему?',
  ].join('\n');

  process.stdout.write(output);
  process.exit(0);
});
