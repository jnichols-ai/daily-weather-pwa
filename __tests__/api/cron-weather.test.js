import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/cron/weather/route.js';
import { runWeatherPull } from '@/lib/weatherPull.js';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      status: init?.status ?? 200,
      async json() {
        return data;
      },
    })),
  },
}));

vi.mock('@/lib/weatherPull.js', () => ({
  runWeatherPull: vi.fn(),
}));

const PULL_RESULT = {
  ranAt: '2026-06-26T00:00:00.000Z',
  succeeded: 51,
  failed: 0,
  failures: [],
};

describe('GET /api/cron/weather', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    runWeatherPull.mockResolvedValue(PULL_RESULT);
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it('returns 401 when CRON_SECRET is set and Authorization header is absent', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const req = new Request('http://localhost/api/cron/weather');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
    expect(runWeatherPull).not.toHaveBeenCalled();
  });

  it('returns 401 when CRON_SECRET is set and the token is wrong', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const req = new Request('http://localhost/api/cron/weather', {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(runWeatherPull).not.toHaveBeenCalled();
  });

  it('returns 401 when CRON_SECRET is set and Bearer prefix is missing', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const req = new Request('http://localhost/api/cron/weather', {
      headers: { Authorization: 'test-secret' },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(runWeatherPull).not.toHaveBeenCalled();
  });

  it('calls runWeatherPull and returns its result when the token is correct', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const req = new Request('http://localhost/api/cron/weather', {
      headers: { Authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(PULL_RESULT);
    expect(runWeatherPull).toHaveBeenCalledOnce();
  });

  it('skips auth and proceeds when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const req = new Request('http://localhost/api/cron/weather');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(runWeatherPull).toHaveBeenCalledOnce();
  });
});
