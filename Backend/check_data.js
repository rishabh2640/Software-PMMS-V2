const http = require('http');

http.get('http://localhost:3000/get_live_data_of_all_machine', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.success) {
                console.log('--- Verification Data ---');
                parsed.data.forEach(m => {
                    console.log(`[${m.machine_type.toUpperCase()}] ${m.machine_name} (${m.machine_id}):`);
                    console.log(`   Status: ${m.current_status}`);
                    console.log(`   Last Value: ${m.last_value}`);
                    console.log(`   Efficiency: ${m.efficiency_percentage}%`);
                    console.log('-------------------------');
                });
            } else {
                console.log('Failed to get data:', parsed.message);
            }
        } catch (e) {
            console.error('Error parsing:', e);
            console.log('Raw data:', data);
        }
    });
});
