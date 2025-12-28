import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { profileService } from '../services/api';

export function useAvatarUpload(onSuccess?: () => void) {
  const [uploading, setUploading] = useState(false);

  const cropAndUploadImage = async (uri: string) => {
    try {
      // Crop image to 400x400
      const manipResult = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 400, height: 400 } }], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // Check file size (max 1MB)
      const response = await fetch(manipResult.uri);
      const blob = await response.blob();
      const fileSizeInMB = blob.size / (1024 * 1024);

      if (fileSizeInMB > 1) {
        Alert.alert('File quá lớn', 'Kích thước ảnh không được vượt quá 1MB. Vui lòng chọn ảnh khác.');
        return;
      }

      // Upload to server
      setUploading(true);
      await profileService.uploadAvatar(manipResult.uri);

      Alert.alert('Thành công', 'Cập nhật avatar thành công!');
      onSuccess?.();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const pickAndUploadAvatar = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tiếp tục.');
        return;
      }

      // Open image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        await cropAndUploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const takePhotoAndUpload = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập camera để tiếp tục.');
        return;
      }

      // Open camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        await cropAndUploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Lỗi', 'Không thể mở camera. Vui lòng thử lại.');
    }
  };

  const showAvatarOptions = () => {
    Alert.alert(
      'Chọn Ảnh Đại Diện',
      'Bạn muốn chọn ảnh từ đâu?',
      [
        {
          text: 'Chụp ảnh mới',
          onPress: takePhotoAndUpload,
        },
        {
          text: 'Chọn từ thư viện',
          onPress: pickAndUploadAvatar,
        },
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  };

  return {
    uploading,
    showAvatarOptions,
    pickAndUploadAvatar,
    takePhotoAndUpload,
  };
}
