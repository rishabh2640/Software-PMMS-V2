const net = require('net');
const machine_reading = require('./machine_reading');
const machine_info = require('./machine_info');

const TCP_PORT = 5000;
const clients = new Map(); // Track connected clients

function startTCPServer() {
    const server = net.createServer((socket) => {
        // This function runs every time a machine connects
        const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[ TCP ] New connection from ${clientAddress}`);

        clients.set(clientAddress, socket);

        // Buffer for incomplete messages
        let buffer = '';

        socket.on('data', async (data) => {
            try {
                // Append incoming data to buffer
                console.log('Received data from node', data.toString());
                buffer += data.toString();  // accumulate incoming data

                // Process complete messages (separated by newline)
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    // Extract one complete message
                    const message = buffer.substring(0, newlineIndex).trim();
                    buffer = buffer.substring(newlineIndex + 1);

                    // Skip empty messages
                    if (!message) continue;

                    console.log(`[ TCP ] Received from ${clientAddress}: ${message}`);

                    // Parse and save the data
                    await processMessage(message, socket, clientAddress);
                }
            } catch (error) {
                console.error(`[ TCP ] Error processing data from ${clientAddress}:`, error.message);
                socket.write(JSON.stringify({
                    success: false,
                    message: 'Error processing data',
                    error: error.message
                }) + '\n');
            }
        });

        socket.on('end', () => {
            console.log(`[ TCP ] Client disconnected: ${clientAddress}`);
            clients.delete(clientAddress);
        });

        socket.on('error', (error) => {
            console.error(`[ TCP ] Socket error from ${clientAddress}:`, error.message);
            clients.delete(clientAddress);
        });

        // Send welcome message
        socket.write(JSON.stringify({
            success: true,
            message: 'Connected to PMMS TCP Server'
        }) + '\n');
    });

    server.listen(TCP_PORT, () => {
        console.log(`[ TCP ] Server listening on port ${TCP_PORT}`);
    });

    server.on('error', (error) => {
        console.error('[ TCP ] Server error:', error);
    });

    return server;
}

async function processMessage(message, socket, clientAddress) {
    try {
        // Convert JSON string to object
        const data = JSON.parse(message);

        // Validate required fields
        if (!data.id || !data.type || data.value === undefined) {
            socket.write(JSON.stringify({
                success: false,
                message: 'Missing required fields: id, type, value'
            }) + '\n');
            return;
        }

        // Validate machine type
        const validTypes = ['onoff', 'counter', 'current'];
        if (!validTypes.includes(data.type)) {
            socket.write(JSON.stringify({
                success: false,
                message: 'Invalid type. Must be: onoff, counter, or current'
            }) + '\n');
            return;
        }

        // Validate machine exists in database
        const machine = await machine_info.findOne({ machine_id: data.id });
        if (!machine) {
            socket.write(JSON.stringify({
                success: false,
                message: `Machine ${data.id} not found in database`
            }) + '\n');
            return;
        }

        // Validate machine type matches
        if (machine.machine_type !== data.type) {
            socket.write(JSON.stringify({
                success: false,
                message: `Machine type mismatch. Expected ${machine.machine_type}, got ${data.type}`
            }) + '\n');
            return;
        }

        // Type-specific validations
        if (data.type === 'onoff' && (data.value !== 0 && data.value !== 1)) {
            socket.write(JSON.stringify({
                success: false,
                message: 'For onoff type, value must be 0 or 1'
            }) + '\n');
            return;
        }

        if (data.type === 'counter' && (!Number.isInteger(data.value) || data.value < 0)) {
            socket.write(JSON.stringify({
                success: false,
                message: 'For counter type, value must be a positive integer'
            }) + '\n');
            return;
        }

        if (data.type === 'current' && (typeof data.value !== 'number' || data.value < 0)) {
            socket.write(JSON.stringify({
                success: false,
                message: 'For current type, value must be a positive number'
            }) + '\n');
            return;
        }

        /*Create new object which needs to be saved in database*/
        /* As of now just using UTC */
        const new_reading = new machine_reading({
            machineId: data.id,
            type: data.type,
            value: data.value,
            timestamp: new Date()
        });
        console.log('New reading: ', new_reading);

        // Save to database
        await new_reading.save();

        console.log(`[ TCP ] Saved reading: ${data.id} | ${data.type} | ${data.value}`);

        // Send acknowledgment
        socket.write(JSON.stringify({
            success: true,
            message: 'Data saved successfully',
            timestamp: new_reading.timestamp
        }) + '\n');

    } catch (error) {
        console.error(`[ TCP ] Error processing message:`, error.message);
        socket.write(JSON.stringify({
            success: false,
            message: 'Error saving data',
            error: error.message
        }) + '\n');
    }
}

module.exports = { startTCPServer };