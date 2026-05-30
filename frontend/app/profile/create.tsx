import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '@/src/store';
import { createProfile, getProfiles } from '@/src/services/api';
import { getBreedsForPetType } from '@/src/constants/breeds';

export default function CreateProfile() {
  const router = useRouter();
  const { setProfiles, setActiveProfile, user } = useStore();
  const [loading, setLoading] = useState(false);

  // Profile type
  const [profileType, setProfileType] = useState<'human' | 'pet'>('human');
  
  // Common fields
  const [name, setName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weight, setWeight] = useState('');
  
  // Human fields
  const [biologicalSex, setBiologicalSex] = useState<'male' | 'female' | 'other'>('male');
  const [isPregnantNursing, setIsPregnantNursing] = useState(false);
  const [height, setHeight] = useState('');
  
  // Pet fields
  const [petType, setPetType] = useState<'dog' | 'cat' | 'bird' | 'exotic'>('dog');
  const [petBreed, setPetBreed] = useState<string>('');
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [fixedStatus, setFixedStatus] = useState<'neutered' | 'spayed' | 'intact'>('intact');

  const formatDob = (d: Date | null): string => {
    if (!d) return 'Select Date of Birth';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const computeAge = (d: Date | null): string => {
    if (!d) return '';
    const now = new Date();
    const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} old`;
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''} old`;
  };

  const handleSubmit = async () => {
    if (!name || !dob) {
      Alert.alert('Error', 'Please fill required fields (Name, Date of Birth)');
      return;
    }

    setLoading(true);
    try {
      const profileData: any = {
        name,
        profile_type: profileType,
        date_of_birth: dob.toISOString().split('T')[0],
        weight_kg: weight ? parseFloat(weight) : undefined,
      };

      if (profileType === 'human') {
        profileData.biological_sex = biologicalSex;
        profileData.is_pregnant_nursing = isPregnantNursing;
        profileData.height_cm = height ? parseFloat(height) : undefined;
      } else {
        profileData.pet_type = petType;
        profileData.pet_breed = petBreed || undefined;
        profileData.fixed_status = fixedStatus;
      }

      const newProfile = await createProfile(profileData);
      const profiles = await getProfiles();
      setProfiles(profiles);
      await setActiveProfile(newProfile);

      Alert.alert('Success', 'Profile created successfully!');
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDob(selectedDate);
    }
  };

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
              testID="profile-back-btn"
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Profile Type Selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Profile Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, profileType === 'human' && styles.typeButtonActive]}
                onPress={() => setProfileType('human')}
                testID="profile-type-human"
              >
                <Ionicons name="person" size={24} color={profileType === 'human' ? '#00d4ff' : '#808080'} />
                <Text style={[styles.typeText, profileType === 'human' && styles.typeTextActive]}>Human</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, profileType === 'pet' && styles.typeButtonActive]}
                onPress={() => setProfileType('pet')}
                testID="profile-type-pet"
              >
                <Ionicons name="paw" size={24} color={profileType === 'pet' ? '#00d4ff' : '#808080'} />
                <Text style={[styles.typeText, profileType === 'pet' && styles.typeTextActive]}>Pet</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder={profileType === 'human' ? "e.g., John" : "e.g., Buddy"}
              placeholderTextColor="#808080"
              value={name}
              onChangeText={setName}
              testID="profile-name-input"
            />
          </View>

          {/* Date of Birth */}
          <View style={styles.section}>
            <Text style={styles.label}>Date of Birth *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              testID="profile-dob-btn"
            >
              <Ionicons name="calendar" size={20} color="#00d4ff" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.dateText, !dob && styles.dateTextPlaceholder]}>
                  {formatDob(dob)}
                </Text>
                {dob && (
                  <Text style={styles.ageHint}>{computeAge(dob)}</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color="#808080" />
            </TouchableOpacity>
          </View>

          {/* Date picker - inline for Android, modal for iOS */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={dob || new Date()}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {Platform.OS === 'ios' && (
            <Modal
              visible={showDatePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.modalCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Select Date of Birth</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.modalDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={dob || new Date()}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={handleDateChange}
                    textColor="#ffffff"
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Human Specific Fields */}
          {profileType === 'human' && (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>Biological Sex</Text>
                <View style={styles.sexSelector}>
                  {(['male', 'female', 'other'] as const).map((sex) => (
                    <TouchableOpacity
                      key={sex}
                      style={[styles.sexButton, biologicalSex === sex && styles.sexButtonActive]}
                      onPress={() => setBiologicalSex(sex)}
                      testID={`profile-sex-${sex}`}
                    >
                      <Text style={[styles.sexText, biologicalSex === sex && styles.sexTextActive]}>
                        {sex.charAt(0).toUpperCase() + sex.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {biologicalSex === 'female' && (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setIsPregnantNursing(!isPregnantNursing)}
                    testID="profile-pregnant-toggle"
                  >
                    <View style={[styles.checkboxBox, isPregnantNursing && styles.checkboxBoxActive]}>
                      {isPregnantNursing && (
                        <Ionicons name="checkmark" size={16} color="#000000" />
                      )}
                    </View>
                    <Text style={styles.checkboxText}>Currently Pregnant or Nursing</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.row}>
                <View style={[styles.section, { flex: 1 }]}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="170"
                    placeholderTextColor="#808080"
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                  />
                </View>

                <View style={[styles.section, { flex: 1 }]}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="70"
                    placeholderTextColor="#808080"
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>
              </View>
            </>
          )}

          {/* Pet Specific Fields */}
          {profileType === 'pet' && (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>Pet Type</Text>
                <View style={styles.petTypeSelector}>
                  {(['dog', 'cat', 'bird', 'exotic'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.petTypeButton, petType === type && styles.petTypeButtonActive]}
                      onPress={() => {
                        setPetType(type);
                        setPetBreed(''); // reset breed when type changes
                      }}
                      testID={`profile-pet-${type}`}
                    >
                      <Text style={[styles.petTypeText, petType === type && styles.petTypeTextActive]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Breed Selector */}
              <View style={styles.section}>
                <Text style={styles.label}>Breed</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowBreedPicker(true)}
                  testID="profile-breed-btn"
                >
                  <Ionicons name="paw" size={20} color="#00d4ff" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dateText, !petBreed && styles.dateTextPlaceholder]}>
                      {petBreed || `Select ${petType} breed`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#808080" />
                </TouchableOpacity>
              </View>

              {/* Fixed Status */}
              <View style={styles.section}>
                <Text style={styles.label}>Fixed Status</Text>
                <View style={styles.sexSelector}>
                  {(['neutered', 'spayed', 'intact'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.sexButton, fixedStatus === status && styles.sexButtonActive]}
                      onPress={() => setFixedStatus(status)}
                      testID={`profile-fixed-${status}`}
                    >
                      <Text style={[styles.sexText, fixedStatus === status && styles.sexTextActive]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor="#808080"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>

              {/* Breed Picker Modal */}
              <Modal
                visible={showBreedPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowBreedPicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, { maxHeight: '70%' }]}>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={() => setShowBreedPicker(false)}>
                        <Text style={styles.modalCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.modalTitle}>
                        Select {petType.charAt(0).toUpperCase() + petType.slice(1)} Breed
                      </Text>
                      <View style={{ width: 60 }} />
                    </View>
                    <ScrollView style={{ maxHeight: 500 }}>
                      {getBreedsForPetType(petType).map((breed) => (
                        <TouchableOpacity
                          key={breed}
                          style={[
                            styles.breedItem,
                            petBreed === breed && styles.breedItemActive,
                          ]}
                          onPress={() => {
                            setPetBreed(breed);
                            setShowBreedPicker(false);
                          }}
                          testID={`breed-${breed}`}
                        >
                          <Text style={[
                            styles.breedItemText,
                            petBreed === breed && styles.breedItemTextActive,
                          ]}>
                            {breed}
                          </Text>
                          {petBreed === breed && (
                            <Ionicons name="checkmark" size={20} color="#00d4ff" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            testID="profile-submit-btn"
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.submitButtonText}>Create Profile</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 24, paddingTop: 60,
  },
  backButton: { padding: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16, fontSize: 16, color: '#ffffff',
  },
  dateButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  dateText: { fontSize: 16, color: '#ffffff', fontWeight: '500' },
  dateTextPlaceholder: { color: '#808080', fontWeight: '400' },
  ageHint: { fontSize: 12, color: '#00d4ff', marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancel: { fontSize: 16, color: '#808080' },
  modalDone: { fontSize: 16, fontWeight: 'bold', color: '#00d4ff' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  typeSelector: { flexDirection: 'row', gap: 12 },
  typeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeButtonActive: { borderColor: '#00d4ff', backgroundColor: 'rgba(0, 212, 255, 0.1)' },
  typeButtonLocked: { opacity: 0.5 },
  typeText: { fontSize: 16, fontWeight: '600', color: '#808080' },
  typeTextActive: { color: '#00d4ff' },
  lockBadge: { position: 'absolute', top: 8, right: 8 },
  sexSelector: { flexDirection: 'row', gap: 8 },
  sexButton: {
    flex: 1, padding: 12, borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  sexButtonActive: { borderColor: '#00d4ff', backgroundColor: 'rgba(0, 212, 255, 0.1)' },
  sexText: { fontSize: 14, fontWeight: '600', color: '#808080' },
  sexTextActive: { color: '#00d4ff' },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkboxBox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxBoxActive: { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
  checkboxText: { fontSize: 14, color: '#ffffff' },
  petTypeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  petTypeButton: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  petTypeButtonActive: { borderColor: '#00d4ff', backgroundColor: 'rgba(0, 212, 255, 0.1)' },
  petTypeText: { fontSize: 14, fontWeight: '600', color: '#808080' },
  petTypeTextActive: { color: '#00d4ff' },
  submitButton: {
    marginHorizontal: 24, marginTop: 8,
    backgroundColor: '#00d4ff', padding: 18,
    borderRadius: 12, alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 18, fontWeight: 'bold', color: '#000000' },
  breedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  breedItemActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  breedItemText: {
    fontSize: 16,
    color: '#ffffff',
  },
  breedItemTextActive: {
    color: '#00d4ff',
    fontWeight: '600',
  },
});
