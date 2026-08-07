import { fetchAllEngines, loadSelemeneKey, SELEMENE_BASE_URL } from './integratedreading/selemene/fetcher.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const birth = {
  date: '1995-11-23',
  time: '09:44',
  timezone: 'Asia/Kolkata',
  latitude: 12.9768,
  longitude: 77.5901,
  name: 'Nikhai Jaysen'
};

async function main() {
  const key = await loadSelemeneKey();
  if (!key) { console.error('No SELEMENE_API_KEY'); process.exit(1); }
  console.log('Fetching engines for Nikhai Jaysen 1995-11-23 09:44 Asia/Kolkata...');
  const results = await fetchAllEngines(birth, { api_key: key, base_url: SELEMENE_BASE_URL, timeout_ms: 60000 });
  console.log('Fetched', results.length, 'engine results');
  const errors = results.filter((r: any) => r._error);
  if (errors.length) console.log('Errors:', errors.length, errors.map((e: any) => e.engine_id + ': ' + e._error));
  mkdirSync('.batch-inputs', { recursive: true });
  writeFileSync('.batch-inputs/nikhai-jaysen.json', JSON.stringify({ birth_data: birth, engines: results }, null, 2));
  console.log('Saved to .batch-inputs/nikhai-jaysen.json');

  const hd = results.find((r: any) => r.engine_id === 'human-design');
  const pan = results.find((r: any) => r.engine_id === 'panchanga');
  const vim = results.find((r: any) => r.engine_id === 'vimshottari');
  if (hd && !(hd as any)._error) { console.log('\n[HD] type:', hd.result?.hd_type, 'profile:', hd.result?.profile, 'auth:', hd.result?.authority); }
  if (pan && !(pan as any)._error) { console.log('[PANCHANGA] tithi:', pan.result?.tithi_name, 'nakshatra:', pan.result?.nakshatra_name); }
  if (vim && !(vim as any)._error) { console.log('[VIMSHOTTARI] dasha:', vim.result?.current_period?.mahadasha?.planet); }
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });