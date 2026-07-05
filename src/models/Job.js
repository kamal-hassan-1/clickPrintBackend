const mongoose = require('mongoose');
const Draft = require('./Draft');

const jobSchema = Draft.draftSchema.clone();
const jobStatusEnum = [
  'submitted', 'queued', 'printing',
  'cancelled', 'completed', 'failed'
];

const statusHistorySchema = new mongoose.Schema({
  at: {
    type: Date,
    required: true,
    default: Date.now
  },
  by: {
    type: String,
    required: true,
    enum: ['user', 'shop'],
  },
  status: {
    type: String,
    required: true,
    enum: jobStatusEnum,
  },
}, {
  _id: false,
  timestamps: false,
  versionKey: false,
});

jobSchema.add({
  status: {
    type: String,
    required: true,
    enum: jobStatusEnum,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  statusHistory: {
    required: true,
    type: [ statusHistorySchema ],
  },
});

const Job = mongoose.model('Job', jobSchema);
Job.jobSchema = jobSchema;

Job.jobPopulate = [
  ...Draft.draftPopulate,
  { 'path': 'createdBy', 'select': 'name number' }
];

module.exports = Job;