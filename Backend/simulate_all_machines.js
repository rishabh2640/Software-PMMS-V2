const net = require('net');
const http = require('http');

const TCP_PORT = 5000;
const HTTP_PORT = 3000;
const SIMULATION_INTERVAL = 5000; // 5 seconds

// State to keep track of counters and current values
const machineStates = {};

function getAllMachines() {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:${HTTP_PORT}/get_all_machines_info`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.success) {
                        resolve(parsed.data);
                    } else {
                        reject(new Error(parsed.message));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => reject(err));
    });
}

function simulateMachineData(machine) {
    // Initialize state if not present
    if (!machineStates[machine.machine_id]) {
        machineStates[machine.machine_id] = {
            count: 0,
            current: machine.idle_current || 0,
            onOffState: 0
        };
    }

    const state = machineStates[machine.machine_id];
    let value;

    // Generate value based on type
    switch (machine.machine_type) {
        case 'onoff':
            // Toggle every few intervals or keep ON
            // For demo, let's keep it ON 80% of the time
            value = Math.random() > 0.2 ? 1 : 0; 
            break;
            
        case 'counter':
            // Increment count
            // Increase by random amount close to part_per_hour rate
            const partsPerSimInterval = (machine.part_per_hour / 3600) * (SIMULATION_INTERVAL / 1000);
            // Add some randomness
            const increase = Math.round(partsPerSimInterval * (0.8 + Math.random() * 0.4)); 
            state.count += Math.max(1, increase); // Ensure at least 1 increments for demo effects
            value = state.count;
            break;
            
        case 'current':
            // Fluctuate around ON current if active
            const baseCurrent = machine.on_current;
            const fluctuation = (Math.random() - 0.5) * 2; // +/- 1 Amp
            value = parseFloat((baseCurrent + fluctuation).toFixed(2));
            // Occasionally drop to idle
            if (Math.random() > 0.9) {
                value = machine.idle_current;
            }
            break;
            
        default:
            console.warn(`Unknown machine type: ${machine.machine_type}`);
            return;
    }

    const payload = {
        id: machine.machine_id,
        type: machine.machine_type,
        value: value
    };

    sendData(payload);
}

function sendData(payload) {
    const client = new net.Socket();
    
    client.connect(TCP_PORT, 'localhost', () => {
        const message = JSON.stringify(payload) + '\n';
        client.write(message);
        // console.log(`[ SIMULATOR ] Sent for ${payload.id}: ${payload.value}`);
    });

    client.on('data', (data) => {
        // console.log(`[ SIMULATOR ] Ack for ${payload.id}`);
        client.destroy();
    });

    client.on('error', (err) => {
        console.error(`[ SIMULATOR ] Error for ${payload.id}: ${err.message}`);
        client.destroy();
    });
}

async function runSimulation() {
    try {
        console.log('[ SIMULATOR ] Fetching machines...');
        const machines = await getAllMachines();
        console.log(`[ SIMULATOR ] Found ${machines.length} machines. Starting simulation...`);

        if (machines.length === 0) {
            console.log('[ SIMULATOR ] No machines found. Create some via the UI first.');
            return;
        }

        // Run immediately
        machines.forEach(simulateMachineData);

        // Run interval
        setInterval(async () => {
            // Refetch machines occasionally in case new ones are added? 
            // For now just use the initial list or refetch slightly less frequently implies complexity.
            // Let's just simulate the list we have.
            machines.forEach(simulateMachineData);
            console.log(`[ SIMULATOR ] Sent data for ${machines.length} machines`);
        }, SIMULATION_INTERVAL);

    } catch (error) {
        console.error('[ SIMULATOR ] Failed to start:', error.message);
    }
}

runSimulation();
