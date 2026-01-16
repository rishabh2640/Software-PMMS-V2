const net = require('net');

/**
 * PMMS TCP Simulation Script
 * This script mimics a machine node sending data to the TCP server.
 */

const TCP_HOST = 'localhost';
const TCP_PORT = 5000;

const client = new net.Socket();

// Data packet to send (Must match a machine ID created in the UI)
const payload = {
    id: "M001",
    type: "onoff",
    value: 1,
    // efficiency_percentage: 90
};

console.log(`[ SIMULATOR ] Connecting to ${TCP_HOST}:${TCP_PORT}...`);

client.connect(TCP_PORT, TCP_HOST, () => {
    console.log('[ SIMULATOR ] Connected to TCP Server');

    // Send data ending with newline (required by server buffer logic)
    const message = JSON.stringify(payload) + '\n';
    client.write(message);
    console.log('[ SIMULATOR ] Sent:', message.trim());
});

client.on('data', (data) => {
    console.log('[ SIMULATOR ] Server Response:', data.toString().trim());
    client.destroy(); // Close connection after response
});

client.on('close', () => {
    console.log('[ SIMULATOR ] Connection closed');
});

client.on('error', (err) => {
    console.error('[ SIMULATOR ] Error:', err.message);
    process.exit(1);
});
