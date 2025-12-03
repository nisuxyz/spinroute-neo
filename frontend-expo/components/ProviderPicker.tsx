import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { useClient } from 'react-supabase';
import { Colors, electricPurple } from '@/constants/theme';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useEnv } from '@/hooks/use-env';

interface Provider {
  name: string;
  displayName: string;
  capabilities: {
    profiles: string[];
    bikeTypes?: string[];
    multiModal: boolean;
    requiresPaidPlan: boolean;
  };
  available: boolean;
}

interface ProvidersResponse {
  providers: Provider[];
  defaultProvider: string;
}

interface ProviderPickerProps {
  visible: boolean;
  currentProvider: string | null;
  onClose: () => void;
}

export default function ProviderPicker({ visible, currentProvider, onClose }: ProviderPickerProps) {
  const supabase = useClient();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { settings, updateSettings } = useUserSettings();
  const { ROUTING_SERVICE } = useEnv();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchProviders();
    }
  }, [visible]);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${ROUTING_SERVICE}/api/routing/providers`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.statusText}`);
      }

      const data: ProvidersResponse = await response.json();
      setProviders(data.providers);
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = async (providerName: string | null) => {
    const success = await updateSettings({ preferred_routing_provider: providerName });
    if (success) {
      onClose();
    } else {
      Alert.alert('Error', 'Failed to update provider preference');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable>
          <GlassView style={styles.modalContent} glassEffectStyle="regular">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Routing Provider</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.modalCancel, { color: colors.icon }]}>Close</Text>
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={electricPurple} />
                <Text style={[styles.loadingText, { color: colors.icon }]}>
                  Loading providers...
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={48} color={colors.icon} />
                <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.buttonBackground }]}
                  onPress={fetchProviders}
                >
                  <Text style={[styles.retryButtonText, { color: colors.text }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loading && !error && (
              <ScrollView style={styles.providerList} showsVerticalScrollIndicator={false}>
                {/* Auto option */}
                <TouchableOpacity
                  style={[
                    styles.providerItem,
                    { borderBottomColor: colors.background },
                    currentProvider === null && { backgroundColor: colors.buttonBackground },
                  ]}
                  onPress={() => handleSelectProvider(null)}
                  activeOpacity={0.7}
                >
                  <View style={styles.providerIcon}>
                    <MaterialIcons name="auto-awesome" size={28} color={colors.text} />
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={[styles.providerName, { color: colors.text }]}>Auto</Text>
                    <Text style={[styles.providerDescription, { color: colors.icon }]}>
                      Automatically select best available provider
                    </Text>
                  </View>
                  {currentProvider === null && (
                    <MaterialIcons name="check" size={24} color={electricPurple} />
                  )}
                </TouchableOpacity>

                {/* Provider options */}
                {providers.map((provider) => {
                  const isSelected = provider.name === currentProvider;
                  return (
                    <TouchableOpacity
                      key={provider.name}
                      style={[
                        styles.providerItem,
                        { borderBottomColor: colors.background },
                        isSelected && { backgroundColor: colors.buttonBackground },
                      ]}
                      onPress={() => handleSelectProvider(provider.name)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.providerIcon}>
                        <MaterialIcons name="route" size={28} color={colors.text} />
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor: provider.available ? '#4ade80' : '#ef4444',
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.providerInfo}>
                        <View style={styles.providerNameRow}>
                          <Text style={[styles.providerName, { color: colors.text }]}>
                            {provider.displayName}
                          </Text>
                          {provider.capabilities.requiresPaidPlan && (
                            <View style={styles.premiumBadge}>
                              <Text style={styles.premiumBadgeText}>Premium</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.providerDescription, { color: colors.icon }]}>
                          {provider.available ? 'Available' : 'Unavailable'}
                        </Text>
                      </View>
                      {isSelected && (
                        <MaterialIcons name="check" size={24} color={electricPurple} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </GlassView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCancel: {
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  providerList: {
    maxHeight: 400,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
  providerIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  providerDescription: {
    fontSize: 12,
  },
  premiumBadge: {
    backgroundColor: electricPurple,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
