import express from 'express';
import { rateLimit } from 'express-rate-limit';
import http from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runTests() {
  console.log('='.repeat(75));
  console.log('🛡️ CampusQuest Express Proxy Trust & Rate Limiting Verification');
  console.log('='.repeat(75) + '\n');

  // Create an isolated Express instance configured exactly as CampusQuest server.ts
  const app = express();

  // Express proxy trust configured safely with 1 hop (matching single reverse proxy)
  app.set('trust proxy', 1);

  // Rate limiter with max 3 requests for testing
  const testLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests' },
  });

  let lastResolvedIp = '';
  app.use('/test-ip', (req, res) => {
    lastResolvedIp = req.ip || '';
    res.json({ ip: req.ip, ips: req.ips });
  });

  app.use('/test-rate-limit', testLimiter, (req, res) => {
    res.json({ success: true, ip: req.ip });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const testPort = address.port;
  const testUrl = `http://127.0.0.1:${testPort}`;

  try {
    // -------------------------------------------------------------------------
    // Test 1: Single Hop Proxy Trust (Extracts real client IP from trusted proxy)
    // -------------------------------------------------------------------------
    console.log('Test 1: Testing real client IP extraction through trusted reverse proxy hop...');
    // Real client 203.0.113.50 forwarded through proxy
    const res1 = await fetch(`${testUrl}/test-ip`, {
      headers: {
        'X-Forwarded-For': '203.0.113.50',
      },
    });
    const data1: any = await res1.json();
    assert(data1.ip === '203.0.113.50', `Expected IP 203.0.113.50, got ${data1.ip}`);
    results.push({
      name: 'Trusted Proxy IP Extraction',
      passed: true,
      details: 'Express correctly resolved client IP 203.0.113.50 from 1-hop reverse proxy header.',
    });
    console.log('  ✅ PASSED: Real client IP correctly extracted from trusted proxy.');

    // -------------------------------------------------------------------------
    // Test 2: Spoofed Header Injection Protection
    // Client attempts to spoof IP by prepending a fake IP: '198.51.100.1, 203.0.113.50'
    // -------------------------------------------------------------------------
    console.log('Test 2: Testing spoofed header injection protection...');
    const res2 = await fetch(`${testUrl}/test-ip`, {
      headers: {
        // Attacker attempts to spoof 198.51.100.1; proxy appended 203.0.113.50
        'X-Forwarded-For': '198.51.100.1, 203.0.113.50',
      },
    });
    const data2: any = await res2.json();
    // With trust proxy: 1, Express trusts 1 hop from the right, so it takes 203.0.113.50 and ignores 198.51.100.1
    assert(data2.ip === '203.0.113.50', `Expected trusted client IP 203.0.113.50, got spoofed ${data2.ip}`);
    results.push({
      name: 'Spoofed Header Protection',
      passed: true,
      details: 'Express safely ignored client-injected 198.51.100.1 and bound rate limiting to true client 203.0.113.50.',
    });
    console.log('  ✅ PASSED: Spoofed headers rejected; only trusted proxy hop accepted.');

    // -------------------------------------------------------------------------
    // Test 3: Rate Limiting Enforcement Under Proxy Headers
    // -------------------------------------------------------------------------
    console.log('Test 3: Testing rate limiting enforcement across requests from same client IP...');
    const clientIp = '192.0.2.77';
    let hitCount = 0;
    let blockedOnFourth = false;

    for (let i = 1; i <= 4; i++) {
      const rlRes = await fetch(`${testUrl}/test-rate-limit`, {
        headers: { 'X-Forwarded-For': clientIp },
      });
      if (rlRes.status === 200) {
        hitCount++;
      } else if (rlRes.status === 429) {
        blockedOnFourth = true;
      }
    }

    assert(hitCount === 3, `Expected 3 successful requests before limit, got ${hitCount}`);
    assert(blockedOnFourth, 'Fourth request must be blocked with HTTP 429 Too Many Requests');

    results.push({
      name: 'Rate Limiting Under Proxy',
      passed: true,
      details: 'First 3 requests accepted (200 OK); 4th request blocked with 429 Too Many Requests.',
    });
    console.log('  ✅ PASSED: Rate limiter correctly triggered at threshold for client IP.');

    // -------------------------------------------------------------------------
    // Test 4: Attacker cannot bypass rate limit by varying left-most spoofed IP
    // -------------------------------------------------------------------------
    console.log('Test 4: Verifying attacker cannot bypass rate limit by varying fake X-Forwarded-For prefixes...');
    // Attacker sends a fake prefix, but their real client IP remains clientIp (192.0.2.77)
    const bypassAttemptRes = await fetch(`${testUrl}/test-rate-limit`, {
      headers: {
        'X-Forwarded-For': `10.${Math.floor(Math.random() * 250)}.1.1, ${clientIp}`,
      },
    });

    assert(bypassAttemptRes.status === 429, 'Spoofed prefix must NOT evade active rate limit');

    results.push({
      name: 'Anti-Evasion Rate Limit Verification',
      passed: true,
      details: 'Attacker attempting to rotate spoofed IP prefix was strictly blocked with 429 based on verified client hop.',
    });
    console.log('  ✅ PASSED: Spoofing prefix failed to evade rate limiter.');
  } finally {
    server.close();
  }

  console.log('\n' + '='.repeat(75));
  console.log('📊 PROXY TRUST & RATE LIMITING TEST SUMMARY');
  console.log('='.repeat(75));
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    console.log(`   ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log('='.repeat(75));

  if (allPassed) {
    console.log(`Result: ${results.length}/${results.length} tests passed.\n`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
