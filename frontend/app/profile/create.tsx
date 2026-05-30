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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/src/store';
import { createProfile, getProfiles } from '@/src/services/api';

export default function CreateProfile() {
  const router = useRouter();
  const { setProfiles, setActiveProfile, user } = useStore();
  const [loading, setLoading] = useState(false);

  // Profile type
  const [profileType, setProfileType] = useState<'human' | 'pet'>('human');
  
  // Common fields
  const [name, setName] = useState('');
  const [ageValue, setAgeValue] = useState('');
  const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('years');
  const [weight, setWeight] = useState('');
  
  // Human fields
  const [biologicalSex, setBiologicalSex] = useState<'male' | 'female' | 'other'>('male');
  const [isPregnantNursing, setIsPregnantNursing] = useState(false);
  const [height, setHeight] = useState('');
  const [skinType, setSkinType] = useState<'normal' | 'dry' | 'oily' | 'combination' | 'sensitive'>('normal');
  const [hairType, setHairType] = useState<'straight' | 'wavy' | 'curly' | 'coily' | 'dry' | 'oily' | 'color-treated'>('straight');
  
  // Pet fields
  const [petType, setPetType] = useState<'dog' | 'cat' | 'bird' | 'exotic'>('dog');
  const [fixedStatus, setFixedStatus] = useState<'neutered' | 'spayed' | 'intact'>('intact');

  const handleSubmit = async () => {
    if (!name || !ageValue) {
      Alert.alert('Error', 'Please fill required fields (Name, Age)');
      return;
    }

    // Check subscription limits
    if (profileType === 'pet' && user?.subscription_status === 'free') {
      Alert.alert('Premium Required', 'Pet profiles require Premium subscription');
      return;
    }

    setLoading(true);
    try {
      const profileData: any = {
        name,
        profile_type: profileType,
        age_value: parseInt(ageValue),
        age_unit: ageUnit,
        weight_kg: weight ? parseFloat(weight) : undefined,
      };

      if (profileType === 'human') {
        profileData.biological_sex = biologicalSex;
        profileData.is_pregnant_nursing = isPregnantNursing;
        profileData.height_cm = height ? parseFloat(height) : undefined;
        profileData.skin_type = skinType;
        profileData.hair_type = hairType;
      } else {
        profileData.pet_type = petType;
        profileData.fixed_status = fixedStatus;
      }

      const newProfile = await createProfile(profileData);
      
      // Refresh profiles list
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
                style={[
                  styles.typeButton,
                  profileType === 'human' && styles.typeButtonActive,
                ]}
                onPress={() => setProfileType('human')}
              >
                <Ionicons 
                  name="person" 
                  size={24} 
                  color={profileType === 'human' ? '#00d4ff' : '#808080'} 
                />
                <Text style={[
                  styles.typeText,
                  profileType === 'human' && styles.typeTextActive,
                ]}>
                  Human
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  profileType === 'pet' && styles.typeButtonActive,
                  user?.subscription_status === 'free' && styles.typeButtonLocked,
                ]}
                onPress={() => {
                  if (user?.subscription_status === 'free') {
                    Alert.alert('Premium Required', 'Pet profiles require Premium subscription');
                  } else {
                    setProfileType('pet');
                  }
                }}
              >
                <Ionicons 
                  name="paw" 
                  size={24} 
                  color={profileType === 'pet' ? '#00d4ff' : '#808080'} 
                />
                <Text style={[
                  styles.typeText,
                  profileType === 'pet' && styles.typeTextActive,
                ]}>
                  Pet
                </Text>
                {user?.subscription_status === 'free' && (
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={12} color="#ffaa00" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Common Fields */}
          <View style={styles.section}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder={profileType === 'human' ? "e.g., John" : "e.g., Buddy"}
              placeholderTextColor="#808080"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.label}>Age *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#808080"
                keyboardType="numeric"
                value={ageValue}
                onChangeText={setAgeValue}
              />
            </View>

            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    ageUnit === 'months' && styles.unitButtonActive,
                  ]}
                  onPress={() => setAgeUnit('months')}
                >
                  <Text style={[
                    styles.unitText,
                    ageUnit === 'months' && styles.unitTextActive,
                  ]}>
                    Months
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    ageUnit === 'years' && styles.unitButtonActive,
                  ]}
                  onPress={() => setAgeUnit('years')}
                >
                  <Text style={[
                    styles.unitText,
                    ageUnit === 'years' && styles.unitTextActive,
                  ]}>
                    Years
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Human Specific Fields */}
          {profileType === 'human' && (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>Biological Sex</Text>
                <View style={styles.sexSelector}>
                  {(['male', 'female', 'other'] as const).map((sex) => (
                    <TouchableOpacity
                      key={sex}
                      style={[
                        styles.sexButton,
                        biologicalSex === sex && styles.sexButtonActive,
                      ]}
                      onPress={() => setBiologicalSex(sex)}
                    >
                      <Text style={[
                        styles.sexText,
                        biologicalSex === sex && styles.sexTextActive,
                      ]}>
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
                  >
                    <View style={[
                      styles.checkboxBox,
                      isPregnantNursing && styles.checkboxBoxActive,
                    ]}>
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
                      style={[
                        styles.petTypeButton,
                        petType === type && styles.petTypeButtonActive,
                      ]}
                      onPress={() => setPetType(type)}
                    >
                      <Text style={[
                        styles.petTypeText,
                        petType === type && styles.petTypeTextActive,
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
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
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
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
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeButtonActive: {
    borderColor: '#00d4ff',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  typeButtonLocked: {
    opacity: 0.5,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#808080',
  },
  typeTextActive: {
    color: '#00d4ff',
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  unitButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: '#00d4ff',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#808080',
  },
  unitTextActive: {
    color: '#000000',
  },
  sexSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  sexButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  sexButtonActive: {
    borderColor: '#00d4ff',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  sexText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#808080',
  },
  sexTextActive: {
    color: '#00d4ff',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: '#00d4ff',
    borderColor: '#00d4ff',
  },
  checkboxText: {
    fontSize: 14,
    color: '#ffffff',
  },
  petTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  petTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  petTypeButtonActive: {
    borderColor: '#00d4ff',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  petTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#808080',
  },
  petTypeTextActive: {
    color: '#00d4ff',
  },
  submitButton: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: '#00d4ff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
});
