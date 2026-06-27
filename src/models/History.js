const mongoose = require('mongoose');
const Job = require('./Job');

const historySchema = Job.jobSchema.clone();
module.exports = mongoose.model('History', historySchema);