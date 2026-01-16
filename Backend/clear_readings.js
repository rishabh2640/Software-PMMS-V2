const mongoose = require('mongoose');
const MachineReading = require('./machine_reading');

const mongoURI = 'mongodb://localhost:27017/PMMS';

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('Connected to MongoDB');
        const result = await MachineReading.deleteMany({});
        console.log(`Deleted ${result.deletedCount} readings.`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
