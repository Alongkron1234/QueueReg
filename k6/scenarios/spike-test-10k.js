import http from 'k6/http';
import { check } from 'k6';
import { getTokenForVU } from '../helpers.js';

export const options = {
  scenarios: {
    instant_spike: {
      executor: 'per-vu-iterations',
      vus: 10000,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% HTTP failure rate
    http_req_duration: ['p(95)<2000'], // Admission response within 2 seconds
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

export function setup() {
  const token = getTokenForVU(1);
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // Fetch target section for high-concurrency contention
  const res = http.get(`${BASE_URL}/courses`, params);
  console.log(`[SETUP] GET ${BASE_URL}/courses -> Status: ${res.status}`);
  if (res.status === 200) {
    const courses = res.json();
    if (courses.length > 0 && courses[0].sections.length > 0) {
      console.log(`[SETUP] Targeting Section ID: ${courses[0].sections[0].id}`);
      return { sectionId: courses[0].sections[0].id };
    }
  }
  console.error(`[SETUP ERROR] Could not fetch target section from ${BASE_URL}/courses! Status: ${res.status}`);
  return { sectionId: null };
}

export default function (data) {
  const token = getTokenForVU(__VU);
  const sectionId = data.sectionId;

  if (!sectionId) return;

  const payload = JSON.stringify({ sectionId });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  const res = http.post(`${BASE_URL}/registrations`, payload, params);

  check(res, {
    'status is 202 Accepted': (r) => r.status === 202,
    'has requestId': (r) => r.json('requestId') !== undefined,
  });
}
