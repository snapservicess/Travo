import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { useNavigation } from '@/contexts/NavigationContext';

const { width } = Dimensions.get('window');

export default function SafetyScoreDashboard() {
  const colorScheme = useColorScheme();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const { goBack } = useNavigation();

  const safetyScore = 85;
  const safetyLevel = safetyScore >= 80 ? 'Excellent' : safetyScore >= 60 ? 'Good' : 'Needs Attention';
  const scoreColor = safetyScore >= 80 ? '#4CAF50' : safetyScore >= 60 ? '#FF9800' : '#FF4444';

  const metrics = [
    {
      title: 'Location Safety',
      score: 92,
      icon: 'location.fill',
      trend: '+5%',
      trendUp: true,
    },
    {
      title: 'Health Precautions',
      score: 88,
      icon: 'cross.fill',
      trend: '+2%',
      trendUp: true,
    },
    {
      title: 'Transport Safety',
      score: 75,
      icon: 'car.fill',
      trend: '-3%',
      trendUp: false,
    },
    {
      title: 'Weather Awareness',
      score: 85,
      icon: 'cloud.sun.fill',
      trend: '+8%',
      trendUp: true,
    },
  ];

  const recommendations = [
    {
      title: 'Update Emergency Contacts',
      description: 'Add local emergency contacts for your destination',
      priority: 'high',
      icon: 'phone.fill',
    },
    {
      title: 'Check Weather Updates',
      description: 'Monitor weather conditions for the next 3 days',
      priority: 'medium',
      icon: 'cloud.fill',
    },
    {
      title: 'Download Offline Maps',
      description: 'Ensure you have offline maps for your area',
      priority: 'medium',
      icon: 'map.fill',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF4444';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#4CAF50';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Safety Score Dashboard
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Track and improve your travel safety
          </ThemedText>
        </View>

        {/* Main Safety Score */}
        <View style={[styles.scoreCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <View style={styles.scoreHeader}>
            <View>
              <ThemedText style={styles.scoreLabel}>Overall Safety Score</ThemedText>
              <ThemedText style={[styles.scoreLevel, { color: scoreColor }]}>
                {safetyLevel}
              </ThemedText>
            </View>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <ThemedText style={[styles.scoreNumber, { color: scoreColor }]}>
                {safetyScore}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.scoreProgress}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${safetyScore}%`, backgroundColor: scoreColor }
                ]} 
              />
            </View>
            <ThemedText style={styles.progressText}>
              {safetyScore}/100
            </ThemedText>
          </View>
        </View>

        {/* Time Period Selector */}
        <View style={styles.periodSelector}>
          {['week', 'month', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && { backgroundColor: Colors[colorScheme ?? 'light'].tint }
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <ThemedText style={[
                styles.periodText,
                selectedPeriod === period && { color: 'white' }
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Safety Metrics */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Safety Metrics
        </ThemedText>

        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <View
              key={index}
              style={[
                styles.metricCard,
                { backgroundColor: Colors[colorScheme ?? 'light'].background }
              ]}
            >
              <View style={styles.metricHeader}>
                <IconSymbol name={metric.icon as any} size={24} color={Colors[colorScheme ?? 'light'].tint} />
                <View style={[
                  styles.trendBadge,
                  { backgroundColor: metric.trendUp ? '#E8F5E8' : '#FFE8E8' }
                ]}>
                  <IconSymbol 
                    name={metric.trendUp ? 'arrow.up' : 'arrow.down'} 
                    size={12} 
                    color={metric.trendUp ? '#4CAF50' : '#FF4444'} 
                  />
                  <ThemedText style={[
                    styles.trendText,
                    { color: metric.trendUp ? '#4CAF50' : '#FF4444' }
                  ]}>
                    {metric.trend}
                  </ThemedText>
                </View>
              </View>
              
              <ThemedText style={styles.metricScore}>{metric.score}</ThemedText>
              <ThemedText style={styles.metricTitle}>{metric.title}</ThemedText>
              
              <View style={styles.metricProgress}>
                <View 
                  style={[
                    styles.metricProgressFill,
                    { 
                      width: `${metric.score}%`,
                      backgroundColor: metric.score >= 80 ? '#4CAF50' : metric.score >= 60 ? '#FF9800' : '#FF4444'
                    }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>

        {/* Recommendations */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Safety Recommendations
        </ThemedText>

        <View style={styles.recommendationsList}>
          {recommendations.map((rec, index) => (
            <View
              key={index}
              style={[
                styles.recommendationCard,
                { backgroundColor: Colors[colorScheme ?? 'light'].background }
              ]}
            >
              <View style={styles.recommendationHeader}>
                <View style={[
                  styles.recommendationIcon,
                  { backgroundColor: getPriorityColor(rec.priority) + '20' }
                ]}>
                  <IconSymbol 
                    name={rec.icon as any} 
                    size={20} 
                    color={getPriorityColor(rec.priority)} 
                  />
                </View>
                <View style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(rec.priority) }
                ]}>
                  <ThemedText style={styles.priorityText}>
                    {rec.priority.toUpperCase()}
                  </ThemedText>
                </View>
              </View>
              
              <ThemedText style={styles.recommendationTitle}>
                {rec.title}
              </ThemedText>
              <ThemedText style={styles.recommendationDescription}>
                {rec.description}
              </ThemedText>
              
              <TouchableOpacity style={[
                styles.actionButton,
                { borderColor: getPriorityColor(rec.priority) }
              ]}>
                <ThemedText style={[
                  styles.actionButtonText,
                  { color: getPriorityColor(rec.priority) }
                ]}>
                  Take Action
                </ThemedText>
              </TouchableOpacity>
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
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#007AFF',
    borderRadius: 25,
    alignSelf: 'flex-start',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  header: {
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  scoreCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 16,
    opacity: 0.7,
  },
  scoreLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 25,
    gap: 10,
  },
  periodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 15,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 25,
  },
  metricCard: {
    width: (width - 55) / 2,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricScore: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  metricTitle: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  metricProgress: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  metricProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  recommendationsList: {
    gap: 15,
  },
  recommendationCard: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  recommendationDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 15,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});