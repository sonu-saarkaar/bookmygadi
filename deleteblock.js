const fs = require('fs');
let s = fs.readFileSync('frontend/src/pages/app/HomePage.tsx', 'utf8');
const p1 = s.indexOf('Pricing screen: full map with bottom sheet');
const p2 = s.indexOf('{bookingState === \"searching\" && (');
if (p1 > 0 && p2 > p1) {
  let startIndex = s.lastIndexOf('{', p1);
  if (startIndex === -1) startIndex = p1;
  s = s.substring(0, startIndex) + s.substring(p2);
  fs.writeFileSync('frontend/src/pages/app/HomePage.tsx', s, 'utf8');
  console.log('done! replaced properly');
} else {
  console.log('failed', p1, p2);
}
