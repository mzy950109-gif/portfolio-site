const res = await fetch('https://portfolio-site-production-b33b.up.railway.app/api/categories');
console.log('Status:', res.status);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
