const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/create_new_machine',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const machines = [
    {
        machine_id: "C_TEST_01",
        machine_name: "Counter Test Machine",
        machine_type: "counter",
        scheduled_start_time: "08:00",
        scheduled_stop_time: "20:00",
        part_per_hour: 120
    },
    {
        machine_id: "A_TEST_01",
        machine_name: "Current Test Machine",
        machine_type: "current",
        scheduled_start_time: "08:00",
        scheduled_stop_time: "20:00",
        idle_current: 1.5,
        on_current: 5.0
    }
];

function createMachine(data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log(`Response for ${data.machine_id}: ${res.statusCode} ${body}`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
            resolve(); // Resolve anyway to continue
        });

        req.write(JSON.stringify(data));
        req.end();
    });
}

async function run() {
    for (const m of machines) {
        await createMachine(m);
    }
}

run();