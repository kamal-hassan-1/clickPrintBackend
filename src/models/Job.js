const mongoose = require('mongoose');
const Draft = require('./Draft');

const jobSchema = Draft.draftSchema.clone();

jobSchema.add({
  status: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now },
  statusHistory: { type: [{ status: String, by: String, at: Date }], default: [] },
});

const Job = mongoose.model('Job', jobSchema);
Job.jobSchema = jobSchema;

module.exports = Job;