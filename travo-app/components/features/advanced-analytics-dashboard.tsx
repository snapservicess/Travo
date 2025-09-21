import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { AIAnalyticsEngine, AnalyticsInsight, SafetyPrediction } from '@/services/AIAnalyticsEngine';

const { width: screenWidth } = Dimensions.get('window');

interface AnalyticsMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  color: string;
  icon: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

export default function AdvancedAnalyticsDashboard() {
  const colorScheme = useColorScheme();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'safety' | 'behavior' | 'operations'>('all');
  const [aiEngine] = useState(() => new AIAnalyticsEngine());
  
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [safetyPredictions, setSafetyPredictions] = useState<SafetyPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Key metrics for the dashboard
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([
    {
      id: 'tourists_active',
      label: 'Active Tourists',
      value: 1247,
      unit: '',
      trend: 'up',
      trendValue: 12.5,
      color: Colors[colorScheme ?? 'light'].primary,
      icon: 'person.3.fill'
    },
    {
      id: 'safety_score',
      label: 'Avg Safety Score',
      value: 87.3,
      unit: '%',
      trend: 'up',
      trendValue: 2.1,
      color: Colors[colorScheme ?? 'light'].success,
      icon: 'shield.checkered.fill'
    },
    {
      id: 'risk_incidents',
      label: 'Risk Incidents',
      value: 3,
      unit: '',
      trend: 'down',
      trendValue: -45.2,
      color: Colors[colorScheme ?? 'light'].error,
      icon: 'exclamationmark.triangle.fill'
    },
    {
      id: 'response_time',
      label: 'Avg Response Time',
      value: 4.2,
      unit: 'min',
      trend: 'down',
      trendValue: -8.7,
      color: Colors[colorScheme ?? 'light'].warning,
      icon: 'clock.fill'
    }
  ]);

  const [chartData] = useState<ChartData>({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Safety Score',
        data: [85, 87, 84, 89, 92, 88, 87],
        color: '#10B981' // Green for safety
      },
      {
        label: 'Tourist Activity', 
        data: [12, 14, 13, 16, 19, 15, 14], // Normalized for better visualization
        color: '#3B82F6' // Blue for activity
      }
    ]
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const analyticsInsights = await aiEngine.generateAnalyticsInsights();
        setInsights(analyticsInsights);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const generatePreds = async () => {
      try {
        const predictions = await Promise.all([
          aiEngine.generateSafetyPrediction(28.6139, 77.2090, 200),
          aiEngine.generateSafetyPrediction(28.6200, 77.2100, 300),
          aiEngine.generateSafetyPrediction(28.6562, 77.2410, 250),
        ]);
        setSafetyPredictions(predictions);
      } catch (error) {
        console.error('Error generating predictions:', error);
      }
    };

    loadData();
    generatePreds();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      updateMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedTimeRange, aiEngine]);



  const updateMetrics = () => {
    // Simulate real-time metric updates
    setMetrics(prev => prev.map(metric => ({
      ...metric,
      value: metric.value + (Math.random() - 0.5) * (metric.value * 0.02),
      trendValue: metric.trendValue + (Math.random() - 0.5) * 2
    })));
  };

  const filteredInsights = insights.filter(insight => 
    selectedCategory === 'all' || insight.type === selectedCategory
  );

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '1h': return 'Last Hour';
      case '24h': return 'Last 24 Hours';
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      default: return 'Last 24 Hours';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'arrow.up.right';
      case 'down': return 'arrow.down.right';
      case 'stable': return 'minus';
      default: return 'minus';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isPositive: boolean = true) => {
    if (trend === 'stable') return Colors[colorScheme ?? 'light'].text;
    
    const isGood = (trend === 'up' && isPositive) || (trend === 'down' && !isPositive);
    return isGood ? Colors[colorScheme ?? 'light'].success : Colors[colorScheme ?? 'light'].error;
  };

  const getSeverityColor = (severity: AnalyticsInsight['severity']) => {
    switch (severity) {
      case 'info': return Colors[colorScheme ?? 'light'].primary;
      case 'warning': return Colors[colorScheme ?? 'light'].warning;
      case 'critical': return Colors[colorScheme ?? 'light'].error;
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const getRiskLevelColor = (riskLevel: SafetyPrediction['riskLevel']) => {
    switch (riskLevel) {
      case 'low': return Colors[colorScheme ?? 'light'].success;
      case 'medium': return Colors[colorScheme ?? 'light'].warning;
      case 'high': return '#FF7043';
      case 'critical': return Colors[colorScheme ?? 'light'].error;
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const renderSimpleChart = (data: ChartData) => {
    const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
    const chartHeight = 100;
    const barWidth = (screenWidth - 80) / data.labels.length;
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartArea}>
          {data.labels.map((label, index) => (
            <View key={index} style={[styles.chartGroup, { width: barWidth }]}>
              {data.datasets.map((dataset, datasetIndex) => {
                const height = (dataset.data[index] / maxValue) * chartHeight;
                return (
                  <View
                    key={`${index}-${datasetIndex}`}
                    style={[
                      styles.chartBar,
                      {
                        height: height || 2,
                        backgroundColor: dataset.color,
                        opacity: 0.8,
                        marginLeft: datasetIndex > 0 ? 2 : 0,
                        width: (barWidth - 16) / data.datasets.length,
                      }
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
        
        <View style={styles.chartLabels}>
          {data.labels.map((label, index) => (
            <View key={index} style={[styles.chartLabelContainer, { width: barWidth }]}>
              <ThemedText style={styles.chartLabel}>{label}</ThemedText>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="chart.bar.xaxis" size={24} color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText type="title" style={styles.title}>AI Analytics</ThemedText>
        </View>

        <View style={styles.headerRight}>
          {isLoading && (
            <View style={styles.loadingIndicator}>
              <IconSymbol name="arrow.triangle.2.circlepath" size={16} color={Colors[colorScheme ?? 'light'].primary} />
            </View>
          )}
        </View>
      </View>

      {/* Time Range Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.timeRangeSelector}
        contentContainerStyle={styles.timeRangeSelectorContent}
      >
        {(['1h', '24h', '7d', '30d'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              {
                backgroundColor: selectedTimeRange === range 
                  ? Colors[colorScheme ?? 'light'].primary
                  : Colors[colorScheme ?? 'light'].card,
                borderColor: Colors[colorScheme ?? 'light'].border,
              }
            ]}
            onPress={() => setSelectedTimeRange(range)}
          >
            <ThemedText style={[
              styles.timeRangeButtonText,
              { color: selectedTimeRange === range ? 'white' : Colors[colorScheme ?? 'light'].text }
            ]}>
              {getTimeRangeLabel(range)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <View 
              key={metric.id} 
              style={[
                styles.metricCard,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].card,
                  width: (screenWidth - 60) / 2,
                  marginRight: index % 2 === 0 ? 12 : 0
                }
              ]}
            >
              <View style={styles.metricHeader}>
                <IconSymbol name={metric.icon as any} size={20} color={metric.color} />
                <View style={[
                  styles.trendIndicator,
                  { backgroundColor: getTrendColor(metric.trend, metric.id !== 'risk_incidents') + '20' }
                ]}>
                  <IconSymbol 
                    name={getTrendIcon(metric.trend) as any} 
                    size={12} 
                    color={getTrendColor(metric.trend, metric.id !== 'risk_incidents')} 
                  />
                  <ThemedText style={[
                    styles.trendText,
                    { color: getTrendColor(metric.trend, metric.id !== 'risk_incidents') }
                  ]}>
                    {Math.abs(metric.trendValue).toFixed(1)}%
                  </ThemedText>
                </View>
              </View>
              
              <ThemedText style={styles.metricValue}>
                {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
                <ThemedText style={styles.metricUnit}>{metric.unit}</ThemedText>
              </ThemedText>
              
              <ThemedText style={styles.metricLabel}>{metric.label}</ThemedText>
            </View>
          ))}
        </View>

        {/* Trend Chart */}
        <View style={[
          styles.chartCard, 
          { 
            backgroundColor: Colors[colorScheme ?? 'light'].card,
            borderWidth: 0,
          }
        ]}>
          <View style={styles.chartHeader}>
            <ThemedText style={styles.chartTitle}>Trend Analysis</ThemedText>
            <View style={styles.chartLegend}>
              {chartData.datasets.map((dataset, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: dataset.color }]} />
                  <ThemedText style={[styles.legendLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                    {dataset.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
          {renderSimpleChart(chartData)}
        </View>

        {/* AI Insights Section */}
        <View style={styles.insightsSection}>
          <View style={styles.insightsHeader}>
            <ThemedText style={styles.sectionTitle}>AI-Generated Insights</ThemedText>
            
            {/* Category Filter */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryFilter}
            >
              {(['all', 'safety', 'behavior', 'operations'] as const).map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: selectedCategory === category 
                        ? Colors[colorScheme ?? 'light'].primary + '20'
                        : 'transparent',
                      borderColor: selectedCategory === category 
                        ? Colors[colorScheme ?? 'light'].primary
                        : Colors[colorScheme ?? 'light'].border,
                    }
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <ThemedText style={[
                    styles.categoryButtonText,
                    { 
                      color: selectedCategory === category 
                        ? Colors[colorScheme ?? 'light'].primary 
                        : Colors[colorScheme ?? 'light'].text 
                    }
                  ]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {filteredInsights.map((insight) => (
            <View 
              key={insight.id} 
              style={[
                styles.insightCard,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].card,
                  borderLeftColor: getSeverityColor(insight.severity)
                }
              ]}
            >
              <View style={styles.insightHeader}>
                <View style={styles.insightTitleRow}>
                  <ThemedText style={styles.insightTitle}>{insight.title}</ThemedText>
                  <View style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(insight.severity) }
                  ]}>
                    <ThemedText style={styles.severityText}>
                      {insight.severity.toUpperCase()}
                    </ThemedText>
                  </View>
                </View>
                
                <ThemedText style={styles.insightDescription}>{insight.description}</ThemedText>
              </View>

              <View style={styles.insightMetrics}>
                {Object.entries(insight.data.metrics).slice(0, 4).map(([key, value]) => (
                  <View key={key} style={styles.insightMetric}>
                    <ThemedText style={styles.insightMetricValue}>
                      {typeof value === 'number' ? value.toFixed(1) : value}
                    </ThemedText>
                    <ThemedText style={styles.insightMetricLabel}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </ThemedText>
                  </View>
                ))}
              </View>

              {insight.recommendations.length > 0 && (
                <View style={styles.recommendations}>
                  <ThemedText style={styles.recommendationsTitle}>Recommendations:</ThemedText>
                  {insight.recommendations.slice(0, 2).map((rec, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <IconSymbol name="lightbulb" size={12} color={Colors[colorScheme ?? 'light'].warning} />
                      <ThemedText style={styles.recommendationText}>{rec.action}</ThemedText>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.insightFooter}>
                <ThemedText style={styles.confidenceText}>
                  Confidence: {insight.confidence}%
                </ThemedText>
                <ThemedText style={styles.timestampText}>
                  {insight.generatedAt.toLocaleTimeString()}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Safety Predictions */}
        <View style={styles.predictionsSection}>
          <ThemedText style={styles.sectionTitle}>Safety Predictions</ThemedText>
          
          {safetyPredictions.map((prediction) => (
            <View 
              key={prediction.id}
              style={[
                styles.predictionCard,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].card,
                  borderLeftColor: getRiskLevelColor(prediction.riskLevel)
                }
              ]}
            >
              <View style={styles.predictionHeader}>
                <View style={styles.predictionLocation}>
                  <IconSymbol name="location.fill" size={16} color={Colors[colorScheme ?? 'light'].primary} />
                  <ThemedText style={styles.predictionLocationText}>
                    {prediction.location.latitude.toFixed(4)}, {prediction.location.longitude.toFixed(4)}
                  </ThemedText>
                </View>
                
                <View style={[
                  styles.riskBadge,
                  { backgroundColor: getRiskLevelColor(prediction.riskLevel) }
                ]}>
                  <ThemedText style={styles.riskText}>
                    {prediction.riskLevel.toUpperCase()}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.predictionDetails}>
                <View style={styles.riskScore}>
                  <ThemedText style={styles.riskScoreLabel}>Risk Score:</ThemedText>
                  <ThemedText style={[
                    styles.riskScoreValue,
                    { color: getRiskLevelColor(prediction.riskLevel) }
                  ]}>
                    {prediction.riskScore}/100
                  </ThemedText>
                </View>

                <View style={styles.riskFactors}>
                  <ThemedText style={styles.riskFactorsTitle}>Key Factors:</ThemedText>
                  {prediction.factors.slice(0, 3).map((factor, index) => (
                    <View key={index} style={styles.riskFactor}>
                      <IconSymbol 
                        name={factor.impact > 0 ? "plus.circle" : "minus.circle"} 
                        size={12} 
                        color={factor.impact > 0 ? Colors[colorScheme ?? 'light'].error : Colors[colorScheme ?? 'light'].success} 
                      />
                      <ThemedText style={styles.riskFactorText}>
                        {factor.description}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                <View style={styles.predictionFooter}>
                  <ThemedText style={styles.validUntilText}>
                    Valid until: {prediction.validUntil.toLocaleTimeString()}
                  </ThemedText>
                  <ThemedText style={styles.affectedCountText}>
                    {prediction.affectedTourists.length} tourists affected
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingIndicator: {
    padding: 4,
  },
  timeRangeSelector: {
    paddingLeft: 20,
    marginBottom: 15,
  },
  timeRangeSelectorContent: {
    paddingRight: 20,
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  timeRangeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  metricCard: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    opacity: 0.7,
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  chartContainer: {
    height: 130,
    paddingVertical: 10,
  },
  chartArea: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  chartGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  chartBar: {
    borderRadius: 3,
    minHeight: 2,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  chartLabelContainer: {
    alignItems: 'center',
  },
  chartLabel: {
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
  },
  insightsSection: {
    marginBottom: 20,
  },
  insightsHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoryFilter: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  insightHeader: {
    marginBottom: 12,
  },
  insightTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  insightDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 18,
  },
  insightMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  insightMetric: {
    alignItems: 'center',
  },
  insightMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  insightMetricLabel: {
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
  },
  recommendations: {
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    flex: 1,
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  timestampText: {
    fontSize: 11,
    opacity: 0.6,
  },
  predictionsSection: {
    marginBottom: 20,
  },
  predictionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  predictionLocationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  predictionDetails: {
    gap: 8,
  },
  riskScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskScoreLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  riskScoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  riskFactors: {},
  riskFactorsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  riskFactor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  riskFactorText: {
    fontSize: 12,
    flex: 1,
  },
  predictionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  validUntilText: {
    fontSize: 11,
    opacity: 0.7,
  },
  affectedCountText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
  },
});