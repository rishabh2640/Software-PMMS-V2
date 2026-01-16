const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
    machineId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['onoff', 'counter', 'current']
    },
    value: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for efficient queries
readingSchema.index({ machineId: 1, timestamp: -1 });

const machine_reading = mongoose.model('Reading', readingSchema);

module.exports = machine_reading;