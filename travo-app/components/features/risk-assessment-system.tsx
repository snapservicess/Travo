import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { useWebSocket } from '@/hooks/useWebSocket';


interface ThreatAlert {
  id: string;
  type: 'behavioral_anomaly' | 'location_risk' | 'crowd_surge' | 'emergency_pattern' | 'system_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  affectedTourists: string[];
  detectedAt: Date;
  aiConfidence: number; // 0-100
  riskScore: number; // 0-100
  predictedImpact: string;
  recommendedActions: string[];
  isAcknowledged: boolean;
  escalationLevel: number; // 0-5
}

interface BehavioralAnomaly {
  id: string;
  touristId: string;
  touristName: string;
  anomalyType: 'route_deviation' | 'speed_anomaly' | 'location_anomaly' | 'time_anomaly' | 'panic_pattern';
  description: string;
  normalBehavior: string;
  currentBehavior: string;
  deviationScore: number; // 0-100
  detectedAt: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  aiAnalysis: {
    confidence: number;
    riskAssessment: string;
    potentialCauses: string[];
    recommendedResponse: string;
  };
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
}

interface RiskAssessment {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  activeThreats: number;
  anomaliesDetected: number;
  areasAtRisk: number;
  lastUpdated: Date;
  trendDirection: 'improving' | 'stable' | 'deteriorating';
  mlModelAccuracy: number;
}

export default function RiskAssessmentSystem() {
  const colorScheme = useColorScheme();
  const [selectedAlert, setSelectedAlert] = useState<ThreatAlert | null>(null);
  const [showAnomalyDetails, setShowAnomalyDetails] = useState(false);
  
  const { isConnected } = useWebSocket({
    callbacks: {
      onEmergencyAlert: (data) => {
        handleRealTimeThreat(data);
      }
    }
  });

  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment>({
    overallRiskLevel: 'medium',
    riskScore: 65,
    activeThreats: 3,
    anomaliesDetected: 7,
    areasAtRisk: 2,
    lastUpdated: new Date(),
    trendDirection: 'stable',
    mlModelAccuracy: 92.3
  });

  const [threatAlerts, setThreatAlerts] = useState<ThreatAlert[]>([
    {
      id: 'threat-001',
      type: 'crowd_surge',
      severity: 'high',
      title: 'Crowd Surge Detected',
      description: 'Unusual crowd accumulation detected near India Gate with potential for overcrowding',
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'India Gate, New Delhi'
      },
      affectedTourists: ['tourist-001', 'tourist-002', 'tourist-003'],
      detectedAt: new Date(Date.now() - 300000),
      aiConfidence: 94,
      riskScore: 78,
      predictedImpact: 'High risk of crowd-related incidents in next 30 minutes',
      recommendedActions: [
        'Deploy additional security personnel',
        'Activate crowd control measures',
        'Redirect tourist flow to alternative areas',
        'Monitor crowd density every 5 minutes'
      ],
      isAcknowledged: false,
      escalationLevel: 3
    },
    {
      id: 'threat-002',
      type: 'behavioral_anomaly',
      severity: 'medium',
      title: 'Multiple Behavioral Anomalies',
      description: 'Several tourists showing unusual movement patterns suggesting potential distress or confusion',
      affectedTourists: ['tourist-004', 'tourist-005'],
      detectedAt: new Date(Date.now() - 600000),
      aiConfidence: 87,
      riskScore: 45,
      predictedImpact: 'Moderate risk of tourist safety incidents',
      recommendedActions: [
        'Contact affected tourists for welfare check',
        'Dispatch assistance team to area',
        'Monitor for escalation patterns'
      ],
      isAcknowledged: true,
      escalationLevel: 2
    },
    {
      id: 'threat-003',
      type: 'location_risk',
      severity: 'critical',
      title: 'High Risk Area Alert',
      description: 'AI detected elevated risk factors in Red Fort area including crime pattern correlation',
      location: {
        latitude: 28.6562,
        longitude: 77.2410,
        address: 'Red Fort, New Delhi'
      },
      affectedTourists: ['tourist-006'],
      detectedAt: new Date(Date.now() - 150000),
      aiConfidence: 96,
      riskScore: 89,
      predictedImpact: 'Critical safety risk - immediate intervention required',
      recommendedActions: [
        'Emergency response team dispatch',
        'Immediate tourist evacuation from area',
        'Establish security perimeter',
        'Activate emergency protocols'
      ],
      isAcknowledged: false,
      escalationLevel: 5
    }
  ]);

  const [behavioralAnomalies, setBehavioralAnomalies] = useState<BehavioralAnomaly[]>([
    {
      id: 'anomaly-001',
      touristId: 'tourist-007',
      touristName: 'Sarah Johnson',
      anomalyType: 'route_deviation',
      description: 'Tourist deviated significantly from planned route and typical patterns',
      normalBehavior: 'Usually visits tourist attractions during daylight with 2-3 hour stays',
      currentBehavior: 'Rapidly moving through multiple locations, avoiding main areas',
      deviationScore: 78,
      detectedAt: new Date(Date.now() - 900000),
      location: {
        latitude: 28.6200,
        longitude: 77.2100
      },
      aiAnalysis: {
        confidence: 89,
        riskAssessment: 'Moderate concern - possible distress or urgency',
        potentialCauses: [
          'Emergency situation requiring assistance',
          'Following incorrect directions',
          'Avoiding crowded areas due to discomfort',
          'Responding to external threat or concern'
        ],
        recommendedResponse: 'Proactive contact to offer assistance and verify safety'
      },
      status: 'new'
    },
    {
      id: 'anomaly-002',
      touristId: 'tourist-008',
      touristName: 'Michael Chen',
      anomalyType: 'speed_anomaly',
      description: 'Movement speed significantly above normal patterns suggesting urgency or distress',
      normalBehavior: 'Leisurely walking pace averaging 2.8 km/h with frequent stops',
      currentBehavior: 'Rapid movement at 7.2 km/h with no stops for past 45 minutes',
      deviationScore: 92,
      detectedAt: new Date(Date.now() - 450000),
      location: {
        latitude: 28.6350,
        longitude: 77.2250
      },
      aiAnalysis: {
        confidence: 94,
        riskAssessment: 'High concern - possible emergency or panic situation',
        potentialCauses: [
          'Medical emergency requiring urgent response',
          'Safety threat causing flight response',
          'Lost and attempting to find familiar location quickly',
          'Late for important appointment or transport'
        ],
        recommendedResponse: 'Immediate welfare check and assistance offer'
      },
      status: 'investigating'
    }
  ]);

  useEffect(() => {
    // Real-time risk assessment updates
    const interval = setInterval(() => {
      const updateAssessment = () => {
        const activeThreats = threatAlerts.filter(alert => !alert.isAcknowledged).length;
        const criticalThreats = threatAlerts.filter(alert => alert.severity === 'critical' && !alert.isAcknowledged).length;
        const newAnomalies = behavioralAnomalies.filter(anomaly => anomaly.status === 'new').length;

        let overallRiskLevel: RiskAssessment['overallRiskLevel'] = 'low';
        let riskScore = 20;

        if (criticalThreats > 0) {
          overallRiskLevel = 'critical';
          riskScore = 90;
        } else if (activeThreats > 3 || newAnomalies > 5) {
          overallRiskLevel = 'high';
          riskScore = 75;
        } else if (activeThreats > 1 || newAnomalies > 2) {
          overallRiskLevel = 'medium';
          riskScore = 55;
        }

        setRiskAssessment(prev => ({
          ...prev,
          overallRiskLevel,
          riskScore,
          activeThreats,
          anomaliesDetected: behavioralAnomalies.length,
          areasAtRisk: threatAlerts.filter(alert => alert.location).length,
          lastUpdated: new Date(),
          trendDirection: riskScore > prev.riskScore ? 'deteriorating' : riskScore < prev.riskScore ? 'improving' : 'stable'
        }));
      };

      const detectAnomalies = () => {
        // Simulate AI detecting new behavioral anomalies
        if (Math.random() < 0.1) { // 10% chance of new anomaly detection
          const newAnomaly: BehavioralAnomaly = {
            id: `anomaly-${Date.now()}`,
            touristId: `tourist-${Math.floor(Math.random() * 1000)}`,
            touristName: 'New Tourist',
            anomalyType: ['route_deviation', 'speed_anomaly', 'location_anomaly'][Math.floor(Math.random() * 3)] as any,
            description: 'AI detected unusual behavioral pattern requiring investigation',
            normalBehavior: 'Typical tourist behavior pattern',
            currentBehavior: 'Deviation from expected patterns',
            deviationScore: Math.floor(Math.random() * 40) + 60,
            detectedAt: new Date(),
            location: {
              latitude: 28.6139 + (Math.random() - 0.5) * 0.01,
              longitude: 77.2090 + (Math.random() - 0.5) * 0.01
            },
            aiAnalysis: {
              confidence: Math.floor(Math.random() * 20) + 80,
              riskAssessment: 'Requires investigation',
              potentialCauses: ['Possible distress', 'Navigation issues', 'External factors'],
              recommendedResponse: 'Monitor and assess'
            },
            status: 'new'
          };

          setBehavioralAnomalies(prev => [newAnomaly, ...prev.slice(0, 19)]); // Keep last 20 anomalies
        }
      };

      updateAssessment();
      detectAnomalies();
    }, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, [threatAlerts, behavioralAnomalies]);

  const handleRealTimeThreat = (threatData: any) => {
    const newThreat: ThreatAlert = {
      id: `threat-${Date.now()}`,
      type: threatData.type || 'system_anomaly',
      severity: threatData.severity || 'medium',
      title: threatData.title || 'Real-time Threat Detected',
      description: threatData.description || 'AI detected potential threat requiring attention',
      location: threatData.location,
      affectedTourists: threatData.affectedTourists || [],
      detectedAt: new Date(),
      aiConfidence: threatData.confidence || 85,
      riskScore: threatData.riskScore || 60,
      predictedImpact: threatData.impact || 'Moderate risk requiring monitoring',
      recommendedActions: threatData.actions || ['Investigate and monitor situation'],
      isAcknowledged: false,
      escalationLevel: threatData.escalationLevel || 2
    };

    setThreatAlerts(prev => [newThreat, ...prev]);
    
    if (newThreat.severity === 'critical') {
      Alert.alert(
        'CRITICAL THREAT DETECTED',
        newThreat.description,
        [
          { text: 'View Details', onPress: () => setSelectedAlert(newThreat) },
          { text: 'Acknowledge', onPress: () => acknowledgeAlert(newThreat.id) }
        ]
      );
    }
  };



  const acknowledgeAlert = (alertId: string) => {
    setThreatAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, isAcknowledged: true } : alert
    ));
  };

  const updateAnomalyStatus = (anomalyId: string, newStatus: BehavioralAnomaly['status']) => {
    setBehavioralAnomalies(prev => prev.map(anomaly =>
      anomaly.id === anomalyId ? { ...anomaly, status: newStatus } : anomaly
    ));
  };

  const escalateAlert = (alertId: string) => {
    const alert = threatAlerts.find(a => a.id === alertId);
    if (alert) {
      Alert.alert(
        'Escalate Alert',
        `Escalate "${alert.title}" to next level?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Escalate', 
            onPress: () => {
              setThreatAlerts(prev => prev.map(a =>
                a.id === alertId ? { ...a, escalationLevel: Math.min(5, a.escalationLevel + 1) } : a
              ));
            }
          }
        ]
      );
    }
  };

  const getSeverityColor = (severity: ThreatAlert['severity']) => {
    switch (severity) {
      case 'low': return Colors[colorScheme ?? 'light'].success;
      case 'medium': return Colors[colorScheme ?? 'light'].warning;
      case 'high': return '#FF7043';
      case 'critical': return Colors[colorScheme ?? 'light'].error;
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const getRiskLevelColor = (level: RiskAssessment['overallRiskLevel']) => {
    switch (level) {
      case 'low': return Colors[colorScheme ?? 'light'].success;
      case 'medium': return Colors[colorScheme ?? 'light'].warning;
      case 'high': return '#FF7043';
      case 'critical': return Colors[colorScheme ?? 'light'].error;
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const getTrendIcon = (trend: RiskAssessment['trendDirection']) => {
    switch (trend) {
      case 'improving': return 'arrow.down.right.circle';
      case 'deteriorating': return 'arrow.up.right.circle';
      case 'stable': return 'minus.circle';
      default: return 'minus.circle';
    }
  };

  const getAnomalyStatusColor = (status: BehavioralAnomaly['status']) => {
    switch (status) {
      case 'new': return Colors[colorScheme ?? 'light'].error;
      case 'investigating': return Colors[colorScheme ?? 'light'].warning;
      case 'resolved': return Colors[colorScheme ?? 'light'].success;
      case 'false_positive': return Colors[colorScheme ?? 'light'].secondary;
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const unacknowledgedAlerts = threatAlerts.filter(alert => !alert.isAcknowledged);
  const criticalAlerts = threatAlerts.filter(alert => alert.severity === 'critical' && !alert.isAcknowledged);
  const newAnomalies = behavioralAnomalies.filter(anomaly => anomaly.status === 'new');

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="brain.head.profile" size={24} color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText type="title" style={styles.title}>AI Risk Assessment</ThemedText>
        </View>

        <View style={styles.headerRight}>
          <View style={[
            styles.connectionStatus,
            {
              backgroundColor: isConnected 
                ? Colors[colorScheme ?? 'light'].success + '20'
                : Colors[colorScheme ?? 'light'].error + '20'
            }
          ]}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? Colors[colorScheme ?? 'light'].success : Colors[colorScheme ?? 'light'].error }
            ]} />
            <ThemedText style={styles.connectionText}>
              {isConnected ? 'AI Active' : 'Offline'}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Critical Alert Banner */}
      {criticalAlerts.length > 0 && (
        <View style={[styles.criticalBanner, { backgroundColor: Colors[colorScheme ?? 'light'].error }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color="white" />
          <ThemedText style={styles.criticalText}>
            {criticalAlerts.length} CRITICAL THREAT{criticalAlerts.length > 1 ? 'S' : ''} DETECTED
          </ThemedText>
          <TouchableOpacity
            style={styles.criticalButton}
            onPress={() => setSelectedAlert(criticalAlerts[0])}
          >
            <ThemedText style={styles.criticalButtonText}>RESPOND</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Risk Assessment Overview */}
      <View style={[styles.riskOverview, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
        <View style={styles.riskHeader}>
          <View style={styles.riskLevelContainer}>
            <View style={[
              styles.riskLevelIndicator,
              { backgroundColor: getRiskLevelColor(riskAssessment.overallRiskLevel) }
            ]}>
              <ThemedText style={styles.riskLevelText}>
                {riskAssessment.overallRiskLevel.toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText style={styles.riskScoreText}>
              Risk Score: {riskAssessment.riskScore}/100
            </ThemedText>
          </View>

          <View style={styles.riskTrend}>
            <IconSymbol 
              name={getTrendIcon(riskAssessment.trendDirection) as any}
              size={16}
              color={
                riskAssessment.trendDirection === 'improving' ? Colors[colorScheme ?? 'light'].success :
                riskAssessment.trendDirection === 'deteriorating' ? Colors[colorScheme ?? 'light'].error :
                Colors[colorScheme ?? 'light'].text
              }
            />
            <ThemedText style={styles.trendText}>
              {riskAssessment.trendDirection.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        <View style={styles.riskMetrics}>
          <View style={styles.riskMetric}>
            <ThemedText style={styles.metricValue}>{riskAssessment.activeThreats}</ThemedText>
            <ThemedText style={styles.metricLabel}>Active Threats</ThemedText>
          </View>
          <View style={styles.riskMetric}>
            <ThemedText style={styles.metricValue}>{riskAssessment.anomaliesDetected}</ThemedText>
            <ThemedText style={styles.metricLabel}>Anomalies</ThemedText>
          </View>
          <View style={styles.riskMetric}>
            <ThemedText style={styles.metricValue}>{riskAssessment.areasAtRisk}</ThemedText>
            <ThemedText style={styles.metricLabel}>Risk Areas</ThemedText>
          </View>
          <View style={styles.riskMetric}>
            <ThemedText style={styles.metricValue}>{riskAssessment.mlModelAccuracy.toFixed(1)}%</ThemedText>
            <ThemedText style={styles.metricLabel}>AI Accuracy</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.lastUpdated}>
          Last updated: {riskAssessment.lastUpdated.toLocaleTimeString()}
        </ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Threat Alerts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Active Threat Alerts ({unacknowledgedAlerts.length})
            </ThemedText>
          </View>

          {threatAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertCard,
                {
                  backgroundColor: Colors[colorScheme ?? 'light'].card,
                  borderLeftColor: getSeverityColor(alert.severity),
                  opacity: alert.isAcknowledged ? 0.6 : 1
                }
              ]}
              onPress={() => setSelectedAlert(alert)}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertTitleRow}>
                  <IconSymbol 
                    name={alert.type === 'crowd_surge' ? 'person.3.fill' : 
                          alert.type === 'behavioral_anomaly' ? 'brain.head.profile' :
                          alert.type === 'location_risk' ? 'location.fill' :
                          'exclamationmark.triangle.fill'} 
                    size={18} 
                    color={getSeverityColor(alert.severity)} 
                  />
                  <ThemedText style={styles.alertTitle}>{alert.title}</ThemedText>
                  {!alert.isAcknowledged && (
                    <View style={[styles.newBadge, { backgroundColor: Colors[colorScheme ?? 'light'].error }]}>
                      <ThemedText style={styles.newBadgeText}>NEW</ThemedText>
                    </View>
                  )}
                </View>
                
                <View style={styles.alertMeta}>
                  <ThemedText style={styles.confidenceText}>
                    AI: {alert.aiConfidence}%
                  </ThemedText>
                  <ThemedText style={styles.timeText}>
                    {alert.detectedAt.toLocaleTimeString()}
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={styles.alertDescription}>{alert.description}</ThemedText>

              {alert.location && (
                <View style={styles.alertLocation}>
                  <IconSymbol name="mappin" size={12} color={Colors[colorScheme ?? 'light'].primary} />
                  <ThemedText style={styles.locationText}>{alert.location.address}</ThemedText>
                </View>
              )}

              <View style={styles.alertFooter}>
                <View style={styles.impactInfo}>
                  <ThemedText style={styles.impactLabel}>Impact:</ThemedText>
                  <ThemedText style={styles.impactText}>{alert.predictedImpact}</ThemedText>
                </View>

                <View style={styles.alertActions}>
                  {!alert.isAcknowledged && (
                    <TouchableOpacity
                      style={[styles.acknowledgeButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        acknowledgeAlert(alert.id);
                      }}
                    >
                      <ThemedText style={styles.acknowledgeButtonText}>Acknowledge</ThemedText>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.escalateButton, { backgroundColor: Colors[colorScheme ?? 'light'].warning }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      escalateAlert(alert.id);
                    }}
                  >
                    <ThemedText style={styles.escalateButtonText}>Escalate</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Behavioral Anomalies Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Behavioral Anomalies ({newAnomalies.length} new)
            </ThemedText>
            <TouchableOpacity onPress={() => setShowAnomalyDetails(true)}>
              <ThemedText style={[styles.viewAllText, { color: Colors[colorScheme ?? 'light'].primary }]}>
                View All
              </ThemedText>
            </TouchableOpacity>
          </View>

          {behavioralAnomalies.slice(0, 3).map((anomaly) => (
            <TouchableOpacity
              key={anomaly.id}
              style={[
                styles.anomalyCard,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].card,
                  borderLeftColor: getAnomalyStatusColor(anomaly.status)
                }
              ]}
              onPress={() => setShowAnomalyDetails(true)}
            >
              <View style={styles.anomalyHeader}>
                <View style={styles.anomalyTitleRow}>
                  <ThemedText style={styles.anomalyTourist}>{anomaly.touristName}</ThemedText>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getAnomalyStatusColor(anomaly.status) }
                  ]}>
                    <ThemedText style={styles.statusText}>
                      {anomaly.status.replace('_', ' ').toUpperCase()}
                    </ThemedText>
                  </View>
                </View>
                
                <ThemedText style={styles.anomalyType}>
                  {anomaly.anomalyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </ThemedText>
              </View>

              <ThemedText style={styles.anomalyDescription}>{anomaly.description}</ThemedText>

              <View style={styles.anomalyMetrics}>
                <View style={styles.deviationScore}>
                  <ThemedText style={styles.deviationLabel}>Deviation:</ThemedText>
                  <ThemedText style={[
                    styles.deviationValue,
                    { color: anomaly.deviationScore > 70 ? Colors[colorScheme ?? 'light'].error : Colors[colorScheme ?? 'light'].warning }
                  ]}>
                    {anomaly.deviationScore}%
                  </ThemedText>
                </View>
                
                <View style={styles.confidenceScore}>
                  <ThemedText style={styles.confidenceLabel}>AI Confidence:</ThemedText>
                  <ThemedText style={styles.confidenceValue}>
                    {anomaly.aiAnalysis.confidence}%
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <Modal
          visible={!!selectedAlert}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedAlert(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">Threat Details</ThemedText>
                <TouchableOpacity onPress={() => setSelectedAlert(null)}>
                  <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={[styles.severityHeader, { backgroundColor: getSeverityColor(selectedAlert.severity) + '20' }]}>
                  <ThemedText style={[styles.severityTitle, { color: getSeverityColor(selectedAlert.severity) }]}>
                    {selectedAlert.severity.toUpperCase()} THREAT
                  </ThemedText>
                  <ThemedText style={styles.threatTitle}>{selectedAlert.title}</ThemedText>
                </View>

                <View style={styles.threatDetails}>
                  <ThemedText style={styles.threatDescription}>{selectedAlert.description}</ThemedText>

                  <View style={styles.threatMetrics}>
                    <View style={styles.threatMetric}>
                      <ThemedText style={styles.metricLabel}>AI Confidence</ThemedText>
                      <ThemedText style={styles.metricValue}>{selectedAlert.aiConfidence}%</ThemedText>
                    </View>
                    <View style={styles.threatMetric}>
                      <ThemedText style={styles.metricLabel}>Risk Score</ThemedText>
                      <ThemedText style={styles.metricValue}>{selectedAlert.riskScore}/100</ThemedText>
                    </View>
                    <View style={styles.threatMetric}>
                      <ThemedText style={styles.metricLabel}>Escalation Level</ThemedText>
                      <ThemedText style={styles.metricValue}>{selectedAlert.escalationLevel}/5</ThemedText>
                    </View>
                  </View>

                  <View style={styles.recommendedActions}>
                    <ThemedText style={styles.actionsTitle}>Recommended Actions:</ThemedText>
                    {selectedAlert.recommendedActions.map((action, index) => (
                      <View key={index} style={styles.actionItem}>
                        <IconSymbol name="checkmark.circle" size={16} color={Colors[colorScheme ?? 'light'].primary} />
                        <ThemedText style={styles.actionText}>{action}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Anomaly Details Modal */}
      <Modal
        visible={showAnomalyDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAnomalyDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Behavioral Anomalies</ThemedText>
              <TouchableOpacity onPress={() => setShowAnomalyDetails(false)}>
                <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {behavioralAnomalies.map((anomaly) => (
                <View 
                  key={anomaly.id}
                  style={[
                    styles.anomalyDetailCard,
                    { 
                      backgroundColor: Colors[colorScheme ?? 'light'].card,
                      borderLeftColor: getAnomalyStatusColor(anomaly.status)
                    }
                  ]}
                >
                  <View style={styles.anomalyDetailHeader}>
                    <ThemedText style={styles.anomalyDetailTitle}>
                      {anomaly.touristName} - {anomaly.anomalyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </ThemedText>
                    
                    <View style={styles.anomalyActions}>
                      {anomaly.status === 'new' && (
                        <TouchableOpacity
                          style={[styles.investigateButton, { backgroundColor: Colors[colorScheme ?? 'light'].warning }]}
                          onPress={() => updateAnomalyStatus(anomaly.id, 'investigating')}
                        >
                          <ThemedText style={styles.investigateButtonText}>Investigate</ThemedText>
                        </TouchableOpacity>
                      )}
                      
                      {anomaly.status === 'investigating' && (
                        <TouchableOpacity
                          style={[styles.resolveButton, { backgroundColor: Colors[colorScheme ?? 'light'].success }]}
                          onPress={() => updateAnomalyStatus(anomaly.id, 'resolved')}
                        >
                          <ThemedText style={styles.resolveButtonText}>Resolve</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <ThemedText style={styles.anomalyDetailDescription}>{anomaly.description}</ThemedText>

                  <View style={styles.behaviorComparison}>
                    <View style={styles.behaviorItem}>
                      <ThemedText style={styles.behaviorLabel}>Normal Behavior:</ThemedText>
                      <ThemedText style={styles.behaviorText}>{anomaly.normalBehavior}</ThemedText>
                    </View>
                    <View style={styles.behaviorItem}>
                      <ThemedText style={styles.behaviorLabel}>Current Behavior:</ThemedText>
                      <ThemedText style={[styles.behaviorText, { color: Colors[colorScheme ?? 'light'].error }]}>
                        {anomaly.currentBehavior}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.aiAnalysisSection}>
                    <ThemedText style={styles.aiAnalysisTitle}>AI Analysis:</ThemedText>
                    <ThemedText style={styles.aiAnalysisText}>{anomaly.aiAnalysis.riskAssessment}</ThemedText>
                    <ThemedText style={styles.aiRecommendation}>
                      Recommended: {anomaly.aiAnalysis.recommendedResponse}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  criticalText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  criticalButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  criticalButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  riskOverview: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskLevelContainer: {
    flex: 1,
  },
  riskLevelIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  riskLevelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  riskScoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  riskTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  riskMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  riskMetric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 11,
    opacity: 0.6,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertCard: {
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
  alertHeader: {
    marginBottom: 8,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  timeText: {
    fontSize: 12,
    opacity: 0.6,
  },
  alertDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  alertLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    opacity: 0.8,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  impactInfo: {
    flex: 1,
  },
  impactLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  impactText: {
    fontSize: 12,
    lineHeight: 16,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acknowledgeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  acknowledgeButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  escalateButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  escalateButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  anomalyCard: {
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
  anomalyHeader: {
    marginBottom: 8,
  },
  anomalyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  anomalyTourist: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  anomalyType: {
    fontSize: 14,
    opacity: 0.8,
  },
  anomalyDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  anomalyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviationScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deviationLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  deviationValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  confidenceScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalBody: {
    flex: 1,
    paddingVertical: 20,
  },
  severityHeader: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  severityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  threatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  threatDetails: {
    gap: 16,
  },
  threatDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  threatMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  threatMetric: {
    alignItems: 'center',
  },
  recommendedActions: {
    gap: 8,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    flex: 1,
  },
  anomalyDetailCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  anomalyDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  anomalyDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  anomalyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  investigateButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  investigateButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  resolveButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resolveButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  anomalyDetailDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 12,
  },
  behaviorComparison: {
    gap: 8,
    marginBottom: 12,
  },
  behaviorItem: {},
  behaviorLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.7,
    marginBottom: 2,
  },
  behaviorText: {
    fontSize: 14,
    lineHeight: 18,
  },
  aiAnalysisSection: {
    gap: 4,
  },
  aiAnalysisTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiAnalysisText: {
    fontSize: 14,
    lineHeight: 18,
  },
  aiRecommendation: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.8,
  },
});