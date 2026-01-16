const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
    machine_id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    machine_type: {
        type: String,
        required: true,
        enum: ['onoff', 'counter', 'current'],
        lowercase: true
    },
    machine_name: {
        type: String,
        required: true,
        trim: true
    },
    scheduled_start_time: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
    },
    scheduled_stop_time: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
    },
    // Counter machine specific field
    part_per_hour: {
        type: Number,
        required: function () {
            return this.machine_type === 'counter';
        }
    },
    // Current machine specific fields
    idle_current: {
        type: Number,
        required: function () {
            return this.machine_type === 'current';
        }
    },
    on_current: {
        type: Number,
        required: function () {
            return this.machine_type === 'current';
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    location: {
        type: String,
        default: "Factory Floor 1"
    }
});

// Update the updated_at timestamp before saving
machineSchema.pre('save', function () {
    this.updated_at = Date.now();
});

const machine_info = mongoose.model('Machine_info', machineSchema);

module.exports = machine_info;