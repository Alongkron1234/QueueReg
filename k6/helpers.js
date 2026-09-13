import { SharedArray } from 'k6/data';

// SharedArray memory-efficiently loads 10,000 tokens across all VUs
export const tokens = new SharedArray('student_tokens', function () {
  const data = JSON.parse(open('./data/tokens.json'));
  return data;
});

export function getTokenForVU(vuIndex) {
  const index = (vuIndex - 1) % tokens.length;
  return tokens[index].token;
}
