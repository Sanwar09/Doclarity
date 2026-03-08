import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPACY_SCRIPT = path.join(__dirname, 'spacy_ner.py');

export async function extractEntitiesWithSpacy(text) {
  const input = String(text || '').trim();
  if (!input) {
    return { dates: [], organizations: [], monetary_values: [], obligations: [], source: 'empty' };
  }

  const timeoutMs = Number(process.env.SPACY_TIMEOUT_MS || 10000);
  const pythonBin = process.env.PYTHON_BIN || 'python';

  try {
    const raw = await runPythonJson(pythonBin, [SPACY_SCRIPT], input, timeoutMs);
    const parsed = JSON.parse(raw || '{}');

    if (!parsed || parsed.ok === false) {
      return {
        dates: [],
        organizations: [],
        monetary_values: [],
        obligations: [],
        source: 'spacy_unavailable',
        warning: parsed?.error || 'spaCy unavailable'
      };
    }

    return {
      dates: arrayOfStrings(parsed.dates),
      organizations: arrayOfStrings(parsed.organizations),
      monetary_values: arrayOfStrings(parsed.monetary_values),
      obligations: arrayOfStrings(parsed.obligations),
      source: 'spacy'
    };
  } catch (err) {
    return {
      dates: [],
      organizations: [],
      monetary_values: [],
      obligations: [],
      source: 'spacy_error',
      warning: err?.message || 'spaCy extraction failed'
    };
  }
}

function runPythonJson(cmd, args, stdinText, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`spaCy process timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += String(d); });
    child.stderr.on('data', (d) => { stderr += String(d); });

    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(stderr || `spaCy process exited with code ${code}`));
      }
      resolve(stdout.trim());
    });

    child.stdin.write(stdinText);
    child.stdin.end();
  });
}

function arrayOfStrings(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);
}
