import { fetchAllEngines, loadSelemeneKey, SELEMENE_BASE_URL } from './integratedreading/selemene/fetcher.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const birth = {
  date: '1966-01-27',
  time: '05:48',
  timezone: 'Asia/Kolkata',
  latitude: 12.9716,
  longitude: 77.5946,
  name: 'Sapna Sabharwal'
};

async function main() {
  const key = await loadSelemeneKey();
  if (!key) {
    console.error('ERROR: No SELEMENE_API_KEY');
    process.exit(1);
  }
  console.log('Fetching full Selemene engines for Sapna Sabharwal 1966-01-27 05:48 Asia/Kolkata...');
  const results = await fetchAllEngines(birth, {
    api_key: key,
    base_url: SELEMENE_BASE_URL,
    timeout_ms: 60000
  });

  mkdirSync('.batch-inputs', { recursive: true });
  const out = join('.batch-inputs', 'sapna-sabharwal.json');
  writeFileSync(out, JSON.stringify({ birth_data: birth, engines: results }, null, 2));
  console.log('\nSaved raw engine data to', out);

  // Print critical deterministic facts for verification
  const hd = results.find(r => r.engine_id === 'human-design');
  const gk = results.find(r => r.engine_id === 'gene-keys');
  const pan = results.find(r => r.engine_id === 'panchanga');
  const vim = results.find(r => r.engine_id === 'vimshottari');
  const num = results.find(r => r.engine_id === 'numerology');

  console.log('\n========== SELEMENE LIVE OUTPUT (for screenshot verification) ==========');
  if (hd && !hd._error) {
    console.log('\n[HUMAN-DESIGN]');
    console.dir(hd.result, { depth: 3 });
  } else {
    console.log('[HUMAN-DESIGN] ERROR:', hd?._error);
  }
  if (gk && !gk._error) {
    console.log('\n[GENE-KEYS]');
    console.dir(gk.result, { depth: 3 });
  } else {
    console.log('[GENE-KEYS] ERROR:', gk?._error);
  }
  if (pan && !pan._error) {
    console.log('\n[PANCHANGA] nakshatra/tithi/vara:', pan.result?.nakshatra, pan.result?.tithi, pan.result?.vara);
  }
  if (vim && !vim._error) {
    console.log('\n[VIMSHOTTARI] current:', vim.result?.current_mahadasha, vim.result?.current_antardasha);
  }
  if (num && !num._error) {
    console.log('\n[NUMEROLOGY] life_path / destiny:', num.result?.life_path_number, num.result?.destiny_number);
  }
  console.log('\n========== END SELEMENE RAW ==========');
  console.log('\nPlease provide humdes / Selemene screenshots for HD + Gene Keys so we can match before any interpretation.');
}

main().catch(e => { console.error(e); process.exit(1); });
