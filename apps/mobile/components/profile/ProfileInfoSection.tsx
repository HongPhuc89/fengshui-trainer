import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ProfileInfoSectionProps {
  dateOfBirth?: string | null;
  gender?: string | null;
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
  prefer_not_to_say: 'Không muốn tiết lộ',
};

export const ProfileInfoSection: React.FC<ProfileInfoSectionProps> = ({ dateOfBirth, gender }) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: vi });
    } catch {
      return 'Không hợp lệ';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ℹ️ Thông Tin Cá Nhân</Text>

      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={20} color="#888" />
        <Text style={styles.label}>Ngày sinh:</Text>
        <Text style={styles.value}>{dateOfBirth ? formatDate(dateOfBirth) : 'Chưa cập nhật'}</Text>
      </View>

      <View style={styles.row}>
        <Ionicons name="person-outline" size={20} color="#888" />
        <Text style={styles.label}>Giới tính:</Text>
        <Text style={styles.value}>{gender ? GENDER_LABELS[gender] || gender : 'Chưa cập nhật'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2A2A3E',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginLeft: 8,
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});
