import http from 'http';

const BASE_URL = 'http://localhost:3000';
const CONCURRENT_REQUESTS = 10;
const TOTAL_REQUESTS = 100;

let completedRequests = 0;
let failedRequests = 0;
let totalDuration = 0;

function makeRequest() {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const req = http.get(`${BASE_URL}/`, (res) => {
            const duration = Date.now() - startTime;
            if (res.statusCode >= 200 && res.statusCode < 400) {
                resolve({ success: true, duration });
            } else {
                resolve({ success: false, duration });
            }
        });
        req.on('error', () => {
            resolve({ success: false, duration: Date.now() - startTime });
        });
        req.setTimeout(5000, () => {
            req.destroy();
            resolve({ success: false, duration: 5000 });
        });
    });
}

async function runLoadTest() {
    console.log('🧪 Starting HRM Module Load Test');
    console.log(`📊 Configuration: ${CONCURRENT_REQUESTS} concurrent, ${TOTAL_REQUESTS} total requests`);
    console.log('─'.repeat(50));

    const allPromises = [];
    
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
        allPromises.push(makeRequest());
        
        if (allPromises.length >= CONCURRENT_REQUESTS || i === TOTAL_REQUESTS - 1) {
            const results = await Promise.all(allPromises);
            results.forEach(result => {
                if (result.success) {
                    completedRequests++;
                } else {
                    failedRequests++;
                }
                totalDuration += result.duration;
            });
            allPromises.length = 0;
        }
    }

    const avgDuration = totalDuration / TOTAL_REQUESTS;
    
    console.log('─'.repeat(50));
    console.log('📈 Test Results:');
    console.log(`✅ Successful: ${completedRequests}`);
    console.log(`❌ Failed: ${failedRequests}`);
    console.log(`⏱️  Average response time: ${avgDuration.toFixed(2)}ms`);
    console.log(`📊 Success rate: ${((completedRequests / TOTAL_REQUESTS) * 100).toFixed(1)}%`);
}

runLoadTest().catch(console.error);
