const express = require('express');
const app = express()
const initialize_mongoDB = require('./mongoose_helper');
const machine_info = require('./machine_info');
const machine_reading = require('./machine_reading');
const { startTCPServer } = require('./TCP_server');
const cors = require('cors');

// Global configuration - Add this at the top after imports
const MACHINE_DATA_UPLOAD_FREQ = 5; // seconds
const DEVIATION = 5; // seconds

/**Initialize application */
console.log("[ INFO ] Starting backend application");

/**Start the backend application sequentially */
async function start_backend() {
    /*Connect to database first */
    await initialize_mongoDB();
    app.use(express.json());
    app.use(cors());

    /*Create all routing for the HTTP server */
    app.get('/', (req, res) => {
        console.log('[ INFO ] Root directory of backend server accessed');
        res.send('PMMS application working');
    })

    /**Create new machine */
    app.post('/create_new_machine', async (req, res) => {
        console.log('Request body:', req.body);
        try {
            const { machine_id, machine_type, machine_name, scheduled_start_time,
                scheduled_stop_time, part_per_hour, idle_current, on_current } = req.body;

            // Validate required fields
            if (!machine_id || !machine_type || !machine_name ||
                !scheduled_start_time || !scheduled_stop_time) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: machine_id, machine_type, machine_name, scheduled_start_time, scheduled_stop_time'
                });
            }

            // Validate machine type
            const validTypes = ['onoff', 'counter', 'current'];
            if (!validTypes.includes(machine_type.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid machine_type. Must be: onoff, counter, or current'
                });
            }

            // Type-specific validation
            if (machine_type === 'counter' && !part_per_hour) {
                return res.status(400).json({
                    success: false,
                    message: 'part_per_hour is required for counter type machines'
                });
            }

            if (machine_type === 'current' && (!idle_current || !on_current)) {
                return res.status(400).json({
                    success: false,
                    message: 'idle_current and on_current are required for current type machines'
                });
            }

            // Check if machine_id already exists
            const existingMachine = await machine_info.findOne({ machine_id });
            if (existingMachine) {
                return res.status(409).json({
                    success: false,
                    message: `Machine with ID ${machine_id} already exists`
                });
            }

            // Create machine object based on type
            const machineData = {
                machine_id,
                machine_type: machine_type.toLowerCase(),
                machine_name,
                scheduled_start_time,
                scheduled_stop_time
            };

            // Add type-specific fields
            if (machine_type === 'counter') {
                machineData.part_per_hour = part_per_hour;
            } else if (machine_type === 'current') {
                machineData.idle_current = idle_current;
                machineData.on_current = on_current;
            }

            // Save to database
            const newMachine = new machine_info(machineData);
            await newMachine.save();

            res.status(201).json({
                success: true,
                message: 'Machine created successfully',
                data: newMachine
            });

        } catch (error) {
            console.error('Error creating machine:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    /**Get all machines */
    app.get('/get_all_machines_info', async (req, res) => {
        try {
            const { type } = req.query; // Optional filter by type

            const filter = type ? { machine_type: type.toLowerCase() } : {};
            const machines = await machine_info.find(filter).sort({ created_at: -1 });

            res.status(200).json({
                success: true,
                count: machines.length,
                data: machines
            });
        } catch (error) {
            console.error('Error fetching machines:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    /**Get machine by ID */
    app.get('/get_machine_info_by_ID/:machine_id', async (req, res) => {
        try {
            const machine = await machine_info.findOne({ machine_id: req.params.machine_id });

            if (!machine) {
                return res.status(404).json({
                    success: false,
                    message: 'Machine not found'
                });
            }

            res.status(200).json({
                success: true,
                data: machine
            });
        } catch (error) {
            console.error('Error fetching machine:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    /**Update machine */
    app.put('/update_machine_info_by_ID/:machine_id', async (req, res) => {
        try {
            const machine = await machine_info.findOne({ machine_id: req.params.machine_id });

            if (!machine) {
                return res.status(404).json({
                    success: false,
                    message: 'Machine not found'
                });
            }

            // Update fields
            Object.keys(req.body).forEach(key => {
                // Prevent changing ID and type. Its not changeable
                if (key !== 'machine_id' && key !== 'machine_type') {
                    machine[key] = req.body[key];
                }
            });

            await machine.save();

            res.status(200).json({
                success: true,
                message: 'Machine updated successfully',
                data: machine
            });
        } catch (error) {
            console.error('Error updating machine:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    /**Delete machine */
    app.delete('/delete_machine_by_ID/:machine_id', async (req, res) => {
        try {
            const machine = await machine_info.findOneAndDelete({ machine_id: req.params.machine_id });

            if (!machine) {
                return res.status(404).json({
                    success: false,
                    message: 'Machine not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Machine deleted successfully',
                data: machine
            });
        } catch (error) {
            console.error('Error deleting machine:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    /**Get live data for a specific machine - ALL TYPES */
    app.get('/get_live_data_by_machine_ID/:machine_id', async (req, res) => {
        try {
            const { machine_id } = req.params;
            console.log('[ INFO ] Fetching machine info for the machine: ', machine_id);
            // Get machine info
            const machine = await machine_info.findOne({ machine_id });
            if (!machine) {
                return res.status(404).json({
                    success: false,
                    message: 'Machine not found'
                });
            }
            console.log('[ INFO ] Machine info: ', machine);

            // Get today's start and end time
            const now = new Date();
            // Get UTC date components
            const year = now.getUTCFullYear();
            const month = now.getUTCMonth();
            const date = now.getUTCDate();
            const todayStart = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
            const todayEnd = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
            console.log('[ INFO ] Today start day: ', todayStart);
            console.log('[ INFO ] Today end day: ', todayEnd);

            // Get all readings for today only
            const readings = await machine_reading.find({
                machineId: machine_id,
                timestamp: { $gte: todayStart, $lte: todayEnd }
            }).sort({ timestamp: 1 });
            console.log('[ INFO ] Todays log: ', readings);

            // If no readings for today, return empty data
            if (readings.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'No data available for today',
                    data: {
                        machine_id,
                        machine_name: machine.machine_name,
                        machine_type: machine.machine_type,
                        date: now.toISOString().split('T')[0], // Use current date, not from reading
                        actual_start_time: null,
                        late_start_minutes: null,
                        total_on_time_minutes: 0,
                        total_off_time_minutes: 0,
                        current_status: 'unknown',
                        efficiency_percentage: 0,
                        early_stop_minutes: null,
                        scheduled_start_time: machine.scheduled_start_time,
                        scheduled_stop_time: machine.scheduled_stop_time,
                        last_updated: null,
                        last_value: null
                    }
                });
            }

            // Verify first reading is actually from today
            /*TODO: Don't know whether verification is required */
            const firstReading = readings[0];
            const firstReadingDate = new Date(firstReading.timestamp);
            if (firstReadingDate < todayStart || firstReadingDate > todayEnd) {
                // Readings exist but not from today (shouldn't happen with correct query)
                return res.status(200).json({
                    success: true,
                    message: 'No data available for today',
                    data: {
                        machine_id,
                        machine_name: machine.machine_name,
                        machine_type: machine.machine_type,
                        date: now.toISOString().split('T')[0],
                        actual_start_time: null,
                        late_start_minutes: null,
                        total_on_time_minutes: 0,
                        total_off_time_minutes: 0,
                        current_status: 'unknown',
                        efficiency_percentage: 0,
                        early_stop_minutes: null,
                        scheduled_start_time: machine.scheduled_start_time,
                        scheduled_stop_time: machine.scheduled_stop_time,
                        last_updated: null,
                        last_value: null
                    }
                });
            }

            // Calculate metrics based on machine type
            const liveData = calculateLiveDataAllTypes(machine, readings, now, todayStart);

            res.status(200).json({
                success: true,
                data: liveData
            });

        } catch (error) {
            console.error('Error fetching live data:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    /**Get live data for all machines - ALL TYPES */
    app.get('/get_live_data_of_all_machine', async (req, res) => {
        try {
            // Get all machines
            const machines = await machine_info.find();

            if (machines.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'No machines found',
                    data: []
                });
            }

            // Get today's start and end time (IST BASED)
            const now = new Date();

            // Create a date object shifted to IST to get the correct "Day" components
            // (e.g. if it's 00:30 IST on 16th, UTC is 19:00 on 15th. We want '16th'.)
            const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));

            const year = istDate.getUTCFullYear();
            const month = istDate.getUTCMonth();
            const date = istDate.getUTCDate();

            // todayStart should be 00:00 IST.
            // 00:00 IST = (00:00 - 5.5h) UTC = 18:30 UTC (Previous Day)
            const IST_Offset_Ms = 5.5 * 60 * 60 * 1000;
            const todayStartUTC = Date.UTC(year, month, date, 0, 0, 0, 0);

            const todayStart = new Date(todayStartUTC - IST_Offset_Ms);
            const todayEnd = new Date(todayStartUTC - IST_Offset_Ms + (24 * 60 * 60 * 1000) - 1);

            // Get live data for all machines
            const liveDataPromises = machines.map(async (machine) => {
                const readings = await machine_reading.find({
                    machineId: machine.machine_id,
                    timestamp: { $gte: todayStart, $lte: todayEnd }
                }).sort({ timestamp: 1 });

                // If no readings for today, return empty data structure
                if (readings.length === 0) {
                    return {
                        machine_id: machine.machine_id,
                        machine_name: machine.machine_name,
                        machine_type: machine.machine_type,
                        date: now.toISOString().split('T')[0], // Current date
                        actual_start_time: null,
                        late_start_minutes: null,
                        total_on_time_minutes: 0,
                        total_off_time_minutes: 0,
                        current_status: 'unknown',
                        efficiency_percentage: 0,
                        early_stop_minutes: null,
                        scheduled_start_time: machine.scheduled_start_time,
                        scheduled_stop_time: machine.scheduled_stop_time,
                        last_updated: null,
                        last_value: null
                    };
                }

                // Verify readings are from today
                const firstReading = readings[0];
                const firstReadingDate = new Date(firstReading.timestamp);
                if (firstReadingDate < todayStart || firstReadingDate > todayEnd) {
                    // Return empty data if readings aren't from today
                    return {
                        machine_id: machine.machine_id,
                        machine_name: machine.machine_name,
                        machine_type: machine.machine_type,
                        date: now.toISOString().split('T')[0],
                        actual_start_time: null,
                        late_start_minutes: null,
                        total_on_time_minutes: 0,
                        total_off_time_minutes: 0,
                        current_status: 'unknown',
                        efficiency_percentage: 0,
                        early_stop_minutes: null,
                        scheduled_start_time: machine.scheduled_start_time,
                        scheduled_stop_time: machine.scheduled_stop_time,
                        last_updated: null,
                        last_value: null
                    };
                }

                return calculateLiveDataAllTypes(machine, readings, now, todayStart);
            });

            const allLiveData = await Promise.all(liveDataPromises);

            res.status(200).json({
                success: true,
                count: allLiveData.length,
                data: allLiveData
            });

        } catch (error) {
            console.error('Error fetching live data for all machines:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    /**Get machine readings for graph visualization */
    app.get('/get_machine_readings/:machine_id', async (req, res) => {
        try {
            const { machine_id } = req.params;
            const { date } = req.query; // Optional date parameter (YYYY-MM-DD format)

            // Get machine info first
            const machine = await machine_info.findOne({ machine_id });
            if (!machine) {
                return res.status(404).json({
                    success: false,
                    message: 'Machine not found'
                });
            }

            // Determine date range
            let targetDate;
            if (date) {
                targetDate = new Date(date);
            } else {
                targetDate = new Date();
            }

            // Create a date object shifted to IST to get the correct "Day" components
            const istDate = new Date(targetDate.getTime() + (5.5 * 60 * 60 * 1000));
            const year = istDate.getUTCFullYear();
            const month = istDate.getUTCMonth();
            const dateNum = istDate.getUTCDate();

            // Calculate day boundaries in UTC
            const IST_Offset_Ms = 5.5 * 60 * 60 * 1000;
            const dayStartUTC = Date.UTC(year, month, dateNum, 0, 0, 0, 0);
            const dayStart = new Date(dayStartUTC - IST_Offset_Ms);
            const dayEnd = new Date(dayStartUTC - IST_Offset_Ms + (24 * 60 * 60 * 1000) - 1);

            // Fetch readings for the day
            const readings = await machine_reading.find({
                machineId: machine_id,
                timestamp: { $gte: dayStart, $lte: dayEnd }
            }).sort({ timestamp: 1 });

            // Transform readings to graph format
            const graphData = readings.map(reading => {
                let status = 'off';

                if (machine.machine_type === 'onoff') {
                    status = reading.value === 1 ? 'on' : 'off';
                } else if (machine.machine_type === 'current') {
                    status = reading.value >= machine.on_current ? 'on' : 'off';
                } else if (machine.machine_type === 'counter') {
                    // For counter, we need to check if it's increasing
                    const idx = readings.indexOf(reading);
                    if (idx > 0 && reading.value > readings[idx - 1].value) {
                        status = 'on';
                    } else if (idx === 0 && reading.value > 0) {
                        status = 'on';
                    }
                }

                return {
                    timestamp: reading.timestamp,
                    status: status,
                    value: reading.value
                };
            });

            res.status(200).json({
                success: true,
                machine_id,
                machine_type: machine.machine_type,
                date: targetDate.toISOString().split('T')[0],
                count: graphData.length,
                data: graphData
            });

        } catch (error) {
            console.error('Error fetching machine readings:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });


    /*Start listening to the server */
    app.listen(3000, () => {
        console.log('[ EXPRESS SERVER ] Server is running on http://localhost:3000')
    })

    /*Start TCP server for node to report data */
    startTCPServer();
}

start_backend();

/**Other functions */
/**Helper function to calculate live data for all machine types */
function calculateLiveDataAllTypes(machine, readings, now, todayStart) {
    // 1. Get Today's IST Components
    const nowISTComponents = getTimestampComponents(now);
    const nowIST_HR_MIN = (nowISTComponents.hours * 60) + nowISTComponents.minutes;

    // 2. Parse Scheduled Times
    const scheduled_start = parseTimeString(machine.scheduled_start_time);
    const scheduled_start_HR_MIN = (scheduled_start.hours * 60) + scheduled_start.minutes;

    const scheduled_stop = parseTimeString(machine.scheduled_stop_time);
    const scheduled_stop_HR_MIN = (scheduled_stop.hours * 60) + scheduled_stop.minutes;

    // 3. Determine 'Actual Start Time' (First reading of the day)
    const firstReading = readings[0];
    const actualStartTime = firstReading ? new Date(firstReading.timestamp) : null;
    let late_start_in_min = 0;

    if (actualStartTime) {
        const actualStartComponents = getTimestampComponents(actualStartTime);
        const actualStart_HR_MIN = (actualStartComponents.hours * 60) + actualStartComponents.minutes;

        // Late if actual start > scheduled start
        if (actualStart_HR_MIN > scheduled_start_HR_MIN) {
            late_start_in_min = actualStart_HR_MIN - scheduled_start_HR_MIN;
        }
    }

    // Construct Scheduled Stop Absolute Date (UTC)
    // todayStart is UTC representing IST 00:00.
    // scheduled_stop_HR_MIN is minutes from 00:00.
    const scheduledStopAbs = new Date(todayStart.getTime() + (scheduled_stop_HR_MIN * 60000));

    // Determine Effective End Time for Calculations (Clamp to Shift End)
    // If NOW is before start, Effective = Start (Result 0)
    // If NOW is after stop, Effective = Stop
    // If NOW is inside, Effective = NOW

    let effective_limit = new Date(now); // Default to now

    // If nowIST_HR_MIN > scheduled_stop_HR_MIN, we use the scheduled stop time as "now" for duration calcs.
    if (nowIST_HR_MIN > scheduled_stop_HR_MIN) {
        effective_limit = scheduledStopAbs;
    }


    // 4. Calculate Total ON Time
    // Pass 'effective_limit' to clamp strictly to shift end
    let total_on_time_in_sec = 0;
    if (machine.machine_type === 'onoff') {
        total_on_time_in_sec = calculateOnTimeForOnOff(readings, effective_limit);
    } else if (machine.machine_type === 'counter') {
        total_on_time_in_sec = calculateOnTimeForCounter(readings, machine.part_per_hour, effective_limit) / 1000;
    } else if (machine.machine_type === 'current') {
        total_on_time_in_sec = calculateOnTimeForCurrent(readings, machine.on_current, effective_limit) / 1000;
    }
    const total_on_time_in_min = Math.round(total_on_time_in_sec / 60);

    // 5. Calculate Total OFF Time and Efficiency
    // Logic: What is the "Elapsed Shift Time"?
    // It is the time from Scheduled Start to NOW, capped at Scheduled Stop.
    // If NOW < Scheduled Start, Elapsed = 0.

    let elapsed_shift_time_min = 0;

    if (nowIST_HR_MIN < scheduled_start_HR_MIN) {
        elapsed_shift_time_min = 0;
    } else if (nowIST_HR_MIN > scheduled_stop_HR_MIN) {
        // Shift over
        elapsed_shift_time_min = scheduled_stop_HR_MIN - scheduled_start_HR_MIN;
    } else {
        // Shift ongoing
        elapsed_shift_time_min = nowIST_HR_MIN - scheduled_start_HR_MIN;
    }

    // Ensure non-negative
    if (elapsed_shift_time_min < 0) elapsed_shift_time_min = 0;

    // Total OFF Time = Elapsed Shift Time - Total ON Time
    // (We only care about OFF time *within* the shift hours)
    let total_off_time_in_min = elapsed_shift_time_min - total_on_time_in_min;
    if (total_off_time_in_min < 0) total_off_time_in_min = 0;

    // Efficiency = (Total ON Time / Elapsed Shift Time) * 100
    let efficiency_percentage = 0;
    if (elapsed_shift_time_min > 0) {
        efficiency_percentage = Math.round((total_on_time_in_min / elapsed_shift_time_min) * 100);
    }
    // Clamp efficiency > 100% (can happen if machine runs slightly over shift sync or noise)
    if (efficiency_percentage > 100) efficiency_percentage = 100;


    // 6. Calculate Early Stop
    // User Requirement: "Machine has been shut down before shift is OVER, and the duration of that before stop time should be displayed"
    // Interpretation: If Machine is currently OFF, calculate how early it stopped relative to the Scheduled Stop.
    // This allows real-time monitoring of "potential early stop".

    const currentStatus = calculateCurrentStatus(machine, readings, now);
    let early_stop_in_min = 0;

    // Only calculate if machine is currently OFF (and we have data)
    if (currentStatus === 'off' && readings.length > 0) {
        // Find last *ACTIVE* ON timestamp
        let lastActiveReading = null;

        for (let i = readings.length - 1; i >= 0; i--) {
            const r = readings[i];
            let isActive = false;

            if (machine.machine_type === 'onoff') {
                isActive = (r.value === 1);
            } else if (machine.machine_type === 'current') {
                isActive = (r.value >= machine.on_current);
            } else if (machine.machine_type === 'counter') {
                // For counter, check if value increased relative to previous
                if (i > 0 && r.value > readings[i - 1].value) isActive = true;
                else if (i === 0 && r.value > 0) isActive = true;
            }

            if (isActive) {
                lastActiveReading = r;
                break;
            }
        }

        if (lastActiveReading) {
            const lastOnComponents = getTimestampComponents(lastActiveReading.timestamp);
            const lastOn_HR_MIN = (lastOnComponents.hours * 60) + lastOnComponents.minutes;

            // Difference between Scheduled Stop and Last Active
            // E.g. Stop 21:00, Last Active 12:00 -> 9 hours early stop
            if (scheduled_stop_HR_MIN > lastOn_HR_MIN) {
                early_stop_in_min = scheduled_stop_HR_MIN - lastOn_HR_MIN;
            }
        } else {
            // If machine is OFF and NO active readings found today?
            // It means it never started? Or started but was never "active"?
            // Logic: If it never started, Early Stop = Shift Duration?
            // But Late Start already covers "Never Started" (Late Start = Elapsed).
            // Let's keep Early Stop as 0 to avoid duplication/confusion with Late Start.
        }
    }

    return {
        machine_id: machine.machine_id,
        machine_name: machine.machine_name,
        machine_type: machine.machine_type,
        date: actualStartTime ? actualStartTime.toISOString().split('T')[0] : now.toISOString().split('T')[0],
        actual_start_time: actualStartTime ? formatTime(actualStartTime) : '-',
        late_start_minutes: late_start_in_min > 0 ? late_start_in_min : 0,
        total_on_time_minutes: total_on_time_in_min,
        total_off_time_minutes: total_off_time_in_min,
        current_status: currentStatus,
        efficiency_percentage: efficiency_percentage,
        early_stop_minutes: early_stop_in_min > 0 ? early_stop_in_min : 0,
        scheduled_start_time: machine.scheduled_start_time,
        scheduled_stop_time: machine.scheduled_stop_time,
        last_updated: readings.length > 0 ? readings[readings.length - 1].timestamp : null,
        last_value: readings.length > 0 ? readings[readings.length - 1].value : null
    };
}

/**Calculate ON time for ON/OFF type machines */
function calculateOnTimeForOnOff(readings, limitDate) {
    let totalOnTimeSec = 0;
    const MAX_GAP_SEC = MACHINE_DATA_UPLOAD_FREQ + DEVIATION;
    const limitTime = limitDate.getTime();

    for (let i = 0; i < (readings.length - 1); i++) {
        const currentReading = readings[i];
        const nextReading = readings[i + 1];

        let startTime = currentReading.timestamp.getTime();
        let endTime = nextReading.timestamp.getTime();

        // Clamp to limit
        if (startTime >= limitTime) break; // Entire segment is post-shift
        if (endTime > limitTime) endTime = limitTime;

        let duration = endTime - startTime;
        if (duration < 0) duration = 0;
        duration = duration / 1000;

        if (currentReading.value === 1 && nextReading.value === 1) {
            // For intermediate segments, we trust the gap if it started valid
            // Check original duration for gap validity? Or clamped?
            // If gap was HUGE but crossed limit, we shouldn't count it?
            // Original check: nextReading.timestamp - currentReading.timestamp
            const originalGap = (nextReading.timestamp.getTime() - currentReading.timestamp.getTime()) / 1000;

            if (originalGap < MAX_GAP_SEC) {
                totalOnTimeSec += duration;
            }
        }
    }

    // Handle Final Segment
    if (readings.length > 0) {
        const lastReading = readings[readings.length - 1];
        if (lastReading.value === 1) {
            let startTime = lastReading.timestamp.getTime();
            if (startTime < limitTime) {
                // Calculate time until now (which is passed as limitDate effectively)
                // Wait, limitDate IS passed as effective_now or scheduled_stop via caller.
                // If 'now' is BEFORE 'limitTime' (shift ongoing), limitDate passed from caller is 'now'.
                // If 'now' is AFTER 'shift end', limitDate passed is 'scheduledStop'.
                // Function signature: 'limitDate'.

                // What if limitDate is way in future? (unlikely from caller logic)
                // What if limitDate is 'now' but last reading was seconds ago?

                let duration = limitTime - startTime; // limitTime is the CAP

                if (duration > 0) {
                    const durationSec = duration / 1000;
                    if (durationSec < MAX_GAP_SEC) {
                        totalOnTimeSec += durationSec;
                    }
                }
            }
        }
    }

    return totalOnTimeSec;
}

/**Calculate ON time for Counter type machines */
function calculateOnTimeForCounter(readings, part_per_hour, limitDate) {
    let totalOnTimeMs = 0;
    const limitTime = limitDate.getTime();

    // Time required per part in ms
    const timePerPartMs = (3600 / part_per_hour) * 1000;

    for (let i = 0; i < (readings.length - 1); i++) {
        const currentReading = readings[i];
        const nextReading = readings[i + 1];

        let startTime = currentReading.timestamp.getTime();

        if (startTime >= limitTime) break;

        // Logic for counter: If count increased, we assume it was working during the gap
        // But we cap the work time by the gap duration
        if (nextReading.value > currentReading.value) {
            let endTime = nextReading.timestamp.getTime();
            if (endTime > limitTime) endTime = limitTime;

            let duration = endTime - startTime;
            if (duration < 0) duration = 0;

            // Theoretical time needed
            const partsProduced = nextReading.value - currentReading.value;
            const theoreticalTime = partsProduced * timePerPartMs;

            // Take min of actual duration vs theoretical
            let workTime = Math.min(duration, theoreticalTime);
            totalOnTimeMs += workTime;
        }
    }

    return totalOnTimeMs;
}

/**Calculate ON time for Current type machines */
/**Calculate ON time for Current type machines */
function calculateOnTimeForCurrent(readings, on_current, limitDate) {
    let totalOnTimeMs = 0;
    const MAX_GAP_SEC = MACHINE_DATA_UPLOAD_FREQ + DEVIATION;
    const limitTime = limitDate.getTime();

    for (let i = 0; i < (readings.length - 1); i++) {
        const currentReading = readings[i];
        const nextReading = readings[i + 1];

        let startTime = currentReading.timestamp.getTime();
        let endTime = nextReading.timestamp.getTime();

        if (startTime >= limitTime) break;
        if (endTime > limitTime) endTime = limitTime;

        if (currentReading.value >= on_current && nextReading.value >= on_current) {
            const originalGap = (nextReading.timestamp.getTime() - currentReading.timestamp.getTime()) / 1000;
            if (originalGap < MAX_GAP_SEC) {
                let duration = endTime - startTime;
                if (duration > 0) totalOnTimeMs += duration;
            }
        }
    }

    // Final Segment
    if (readings.length > 0) {
        const lastReading = readings[readings.length - 1];
        if (lastReading.value >= on_current) {
            let startTime = lastReading.timestamp.getTime();
            if (startTime < limitTime) {
                let duration = limitTime - startTime;
                const durationSec = duration / 1000;
                if (durationSec < MAX_GAP_SEC) {
                    totalOnTimeMs += duration;
                }
            }
        }
    }
    return totalOnTimeMs;
}

/**Calculate current status based on machine type */
function calculateCurrentStatus(machine, readings, now) {
    const latestReading = readings[readings.length - 1];
    const current_time = get_local_time();
    const timeSinceLastReading = (current_time - latestReading.timestamp) / 1000; // in seconds
    console.log('[ INFO ] Now time: ', current_time);
    console.log('[ INFO ] Latest reading time: ', latestReading.timestamp);
    console.log('[ INFO ] Time since last reading', timeSinceLastReading);
    const threshold = MACHINE_DATA_UPLOAD_FREQ + DEVIATION;

    // If no recent data, machine is OFF
    if (timeSinceLastReading > threshold) {
        return 'off';
    }

    // Check based on machine type
    if (machine.machine_type === 'onoff') {
        return latestReading.value === 1 ? 'on' : 'off';
    }
    else if (machine.machine_type === 'counter') {
        // Check if counter is increasing at expected rate
        if (readings.length < 2) return 'unknown';

        const prevReading = readings[readings.length - 2];
        const timeDiffMin = (latestReading.timestamp - prevReading.timestamp) / 60000;
        const expectedIncrease = (machine.part_per_hour / 60) * timeDiffMin;
        const actualIncrease = latestReading.value - prevReading.value;

        return actualIncrease >= expectedIncrease * 0.8 ? 'on' : 'off';
    }
    else if (machine.machine_type === 'current') {
        return latestReading.value >= machine.on_current ? 'on' : 'off';
    }

    return 'unknown';
}

/**Helper function to parse time string (HH:MM) */
function parseTimeString(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
}

/**Helper function to format Date to HH:MM:SS (in IST) */
function formatTime(date) {
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    const hours = String(istDate.getUTCHours()).padStart(2, '0');
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/** Pass timestamp of machine reading - Returns components in IST (UTC + 5:30) */
function getTimestampComponents(timestamp) {
    const d = new Date(timestamp);
    const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    return {
        year: istDate.getUTCFullYear(),
        month: istDate.getUTCMonth() + 1,
        day: istDate.getUTCDate(),
        hours: istDate.getUTCHours(),
        minutes: istDate.getUTCMinutes(),
        seconds: istDate.getUTCSeconds(),
        millis: istDate.getUTCMilliseconds()
    };
}

/** Returns current time as a Date object shifted to IST */
/** Returns current time as a Date object in UTC */
function get_local_time() {
    return new Date();
}