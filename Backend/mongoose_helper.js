const mongoose = require('mongoose');
const mongoDB_PMMS_URL = 'mongodb://localhost:27017/PMMS';  // Local MongoDB

/**Initialize connection with the mongo DB */
async function initialize_mongoDB() {
    console.log("[ INFO ] Establishing connection with mongoDB");
    await mongoose
        .connect(mongoDB_PMMS_URL)
        .then(() => console.log('[ INFO ] MongoDB Connected!'))
        .catch(err => console.log('[ ERROR ] MongoDB connection error', err));
}

/*Export the required functions */
module.exports = initialize_mongoDB;