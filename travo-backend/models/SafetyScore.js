const mongoose = require('mongoose');

const safetyScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  touristId: {
    type: String,
    required: true
  },
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String,
    city: String,
    country: String,
    region: String
  },
  scores: {
    overall: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    crimeRate: {
      type: Number,
      min: 0,
      max: 100
    },
    trafficSafety: {
      type: Number,
      min: 0,
      max: 100
    },
    naturalDisasters: {
      type: Number,
      min: 0,
      max: 100
    },
    healthRisks: {
      type: Number,
      min: 0,
      max: 100
    },
    politicalStability: {
      type: Number,
      min: 0,
      max: 100
    },
    tourismSafety: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  factors: [{
    category: {
      type: String,
      enum: ['crime', 'health', 'weather', 'political', 'infrastructure', 'tourism'],
      required: true
    },
    description: String,
    impact: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    source: String
  }],
  recommendations: [{
    category: String,
    message: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    actionable: Boolean
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['warning', 'advisory', 'alert', 'emergency'],
      required: true
    },
    message: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    validUntil: Date,
    source: String
  }],
  dataSource: {
    government: Boolean,
    community: Boolean,
    historical: Boolean,
    realTime: Boolean,
    lastUpdated: Date
  },
  period: {
    startDate: Date,
    endDate: Date,
    timeRange: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'realtime'],
      default: 'daily'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
safetyScoreSchema.index({ touristId: 1, createdAt: -1 });
safetyScoreSchema.index({ 'location.country': 1, 'location.city': 1 });
safetyScoreSchema.index({ 'scores.overall': -1 });

// Pre-save middleware to update timestamp
safetyScoreSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate overall score based on factors
safetyScoreSchema.methods.calculateOverallScore = function() {
  const scores = this.scores;
  const weights = {
    crimeRate: 0.25,
    trafficSafety: 0.15,
    naturalDisasters: 0.15,
    healthRisks: 0.20,
    politicalStability: 0.15,
    tourismSafety: 0.10
  };

  let totalScore = 0;
  let totalWeight = 0;

  Object.keys(weights).forEach(key => {
    if (scores[key] !== undefined && scores[key] !== null) {
      totalScore += scores[key] * weights[key];
      totalWeight += weights[key];
    }
  });

  this.scores.overall = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
  return this.scores.overall;
};

// Static method to find latest score for user
safetyScoreSchema.statics.findLatestForUser = function(touristId) {
  return this.findOne({ touristId }).sort({ createdAt: -1 });
};

// Static method to find scores by location
safetyScoreSchema.statics.findByLocation = function(country, city) {
  const query = { 'location.country': country };
  if (city) query['location.city'] = city;
  return this.find(query).sort({ createdAt: -1 }).limit(10);
};

module.exports = mongoose.model('SafetyScore', safetyScoreSchema);