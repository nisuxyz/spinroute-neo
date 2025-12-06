import React from 'react';
import { StyleSheet } from 'react-native';
import { useUserSettings } from '@/contexts/user-settings-context';
import SettingsCard from './SettingsCard';
import SettingsRow from './SettingsRow';

export default function DevSettingsSection() {
  const { settings, updateDevSettings } = useUserSettings();

  const handleToggleDevServices = (value: boolean) => {
    updateDevSettings({ useDevUrls: value });
  };

  return (
    <SettingsCard title="Developer" icon="code">
      <SettingsRow
        label="Use Dev Services"
        description="Connect to local development services instead of production"
        switchValue={settings?.useDevUrls ?? false}
        onSwitchChange={handleToggleDevServices}
      />
    </SettingsCard>
  );
}

const styles = StyleSheet.create({});
