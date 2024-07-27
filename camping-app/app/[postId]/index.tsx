import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Image, Dimensions, ScrollView, TouchableOpacity, Animated, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JWT from 'expo-jwt';
import axios from 'axios';

const { width } = Dimensions.get('window');

// Define TypeScript interfaces for your data
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  profileImage?: string; // Optional, used for campmates
}

interface JoinCampingPost {
  userId: string;
  postId: number;
  rating: number;
  reviews: string;
  favorite: string;
  notification: string;
  user: User;
}

interface CampingEventData {
  id: number;
  title: string;
  description: string;
  location: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  equipment: string[];
  places: number;
  ageCategory: string;
  images: string[];
  organizerId: number;
  user: User;
  joinCampingPosts: JoinCampingPost[];
}

interface ApiResponse {
  status: number;
  data: CampingEventData;
}

const PostDetailScreen: React.FC = () => {
  const [user, setUser] = useState<User>({ id: "", name: "", email: "", role: "" });
  const [post, setPost] = useState<CampingEventData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<boolean>(false);
  const [hasJoined, setHasJoined] = useState<boolean>(false); // Track if user has joined

  const { postId } = useLocalSearchParams();
  const postIdString = typeof postId === 'string' ? postId : Array.isArray(postId) ? postId[0] : '';

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const joinPost = async (body: JoinCampingPost) => {
    try {
      const response = await axios.post('http://192.168.10.4:5000/api/joinPosts/add', body);
      console.log('Success', response.data.data);
      Alert.alert('Success', 'Successfully joined the post');
      setRefresh(prev => !prev); // Trigger data refresh
    } catch (error) {
      Alert.alert('Error', 'Failed to join the post');
      console.log(error);
    }
  };

  const cancelPost = async (body: JoinCampingPost) => {
    try {
      const response = await axios.post('http://192.168.10.4:5000/api/joinPosts/cancel', body);
      console.log('Success', response.data);
      Alert.alert('Success', 'Successfully canceled the post');
      setRefresh(prev => !prev); // Trigger data refresh
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel the post');
      console.log(error);
    }
  };

  useEffect(() => {
    const fetchPostDetails = async (id: string) => {
      setLoading(true);
      try {
        const response = await axios.get<ApiResponse>(`http://192.168.10.4:5000/api/camps/${id}`);
        setPost(response.data.data);
        console.log(response.data.data);
        // Check if user has joined
        if (user.id) {
          const joined = response.data.data.joinCampingPosts.some(post => post.userId === user.id);
          setHasJoined(joined);
        }
      } catch (error) {
        setError('Failed to fetch post details');
      } finally {
        setLoading(false);
      }
    };

    fetchPostDetails(postIdString);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, postIdString, refresh, user.id]); // Add refresh and user.id to dependencies

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await AsyncStorage.getItem('token');
        if (data) {
          const token = data.startsWith('Bearer ') ? data.replace('Bearer ', '') : data;
          const key = 'mySuperSecretPrivateKey'; // Ensure this matches the encoding key

          try {
            const decodedToken = JWT.decode(token, key);
            if (decodedToken) {
              setUser({
                id: decodedToken.id || '',
                name: decodedToken.name || '',
                email: decodedToken.email || '',
                role: decodedToken.role || '',
              });
            } else {
              console.error('Failed to decode token');
            }
          } catch (decodeError) {
            console.error('Error decoding token:', decodeError);
          }
        } else {
          console.error('Token not found in AsyncStorage');
        }
      } catch (storageError) {
        console.error('Failed to fetch token from AsyncStorage:', storageError);
      }
    };

    fetchUser();
  }, [refresh]); // Refresh to be included as dependency
  console.log('user',user)

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Post not found!</Text>
      </View>
    );
  }

  const handleJoinPress = () => {
    if (!user.id) {
      Alert.alert('Error', 'You need to be logged in to join the post');
      return;
    }

    const joinPostData: JoinCampingPost = {
      userId: user.id,
      postId: post.id,
      rating: 5,
      reviews: 'Great camping experience!',
      favorite: 'Yes',
      notification: 'Great camping experience!',
      user: user,
    };

    joinPost(joinPostData);
  };

  const handleCancelPress = () => {
    if (!user.id) {
      Alert.alert('Error', 'You need to be logged in to cancel the post');
      return;
    }

    const cancelPostData: JoinCampingPost = {
      userId: user.id,
      postId: post.id,
      rating: 5,
      reviews: 'Great camping experience!',
      favorite: 'Yes',
      notification: 'Great camping experience!',
      user: user,
    };

    cancelPost(cancelPostData);
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={[styles.imageCardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: post.images[0] }} style={styles.postImage} />
          <View style={styles.overlay}>
            <View style={styles.infoRow}>
              <View style={[styles.infoCard, { backgroundColor: 'rgba(179, 73, 45, 0.7)' }]}>
                <FontAwesome name="map-marker" size={30} color="#fff" />
                <Text style={styles.infoText}>{post.location}</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: 'rgba(0, 89, 94, 0.7)' }]}>
                <FontAwesome name="users" size={30} color="#fff" />
                <Text style={styles.infoText}>{post.ageCategory}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoCard, { backgroundColor: 'rgba(179, 73, 45, 0.7)' }]}>
                <FontAwesome name="calendar" size={30} color="#fff" />
                <Text style={styles.infoText}>{post.startDate}</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: 'rgba(0, 89, 94, 0.7)' }]}>
                <FontAwesome name="user-plus" size={30} color="#fff" />
                <Text style={styles.infoText}>{post.joinCampingPosts.length}/{post.places}</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
      <Animated.View style={[styles.detailsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.postInfo}>
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postDescription}>{post.description}</Text>
          <View style={styles.equipmentSection}>
            <Text style={styles.equipmentSubtitle}>Equipment:</Text>
            {post.equipment.map((item, index) => (
              <Text key={index} style={styles.equipmentItem}>- {item}</Text>
            ))}
          </View>
          {post.user && (
            <View style={styles.hostInfo}>
              <Image source={{ uri: post.user.profileImage || 'https://via.placeholder.com/50' }} style={styles.hostProfileImage} />
              <Text style={styles.hostName}>{post.user.name}</Text>
            </View>
          )}
          <View style={styles.campMatesSection}>
            <Text style={styles.campMatesTitle}>Campmates:</Text>
            <View style={styles.campMatesList}>
              {post.joinCampingPosts.map((mate, index) => (
                <View key={index} style={styles.campMate}>
                  <Image source={{ uri: mate.user.profileImage || 'https://via.placeholder.com/40' }} style={styles.campMateImage} />
                  <Text style={styles.campMateName}>{mate.user.name}</Text>
                </View>
              ))}
            </View>
          </View>
          {!hasJoined ? (
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinPress}>
              <Text style={styles.joinButtonText}>Join Us</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.joinButton} onPress={handleCancelPress}>
              <Text style={styles.joinButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00595E',
  },
  imageCardContainer: {
    height: 380,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 0,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  infoCard: {
    width: width * 0.5 - 80,
    height: width * 0.5 - 80,
    padding: 10,
    borderRadius: 15,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
    fontSize: 10,
  },
  detailsContainer: {
    width: width - 30,
    marginHorizontal: 15,
    marginTop: -100, // Position the details container to overlap the image
  },
  postInfo: {
    backgroundColor: '#004d49',
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
  },
  postTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  postDescription: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  equipmentSection: {
    marginBottom: 10,
  },
  equipmentSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  equipmentItem: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 3,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  hostProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  hostName: {
    color: '#fff',
    fontSize: 18,
  },
  campMatesSection: {
    marginTop: 20,
  },
  campMatesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  campMatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  campMate: {
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 15,
  },
  campMateImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 5,
  },
  campMateName: {
    color: '#fff',
    fontSize: 14,
  },
  joinButton: {
    backgroundColor: '#B3492D',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 20,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default PostDetailScreen;



