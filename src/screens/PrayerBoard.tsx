import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import { useFirebase } from '../context/FirebaseContext';
import { useTheme } from '../context/ThemeProvider';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  Timestamp,
  arrayUnion,
  arrayRemove,
  getDocs
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

interface Comment {
  id: string;
  text: string;
  userId: string;
  userEmail: string;
  username?: string;
  createdAt: any;
}

interface PrayerRequest {
  id: string;
  text: string;
  userId: string;
  userEmail: string;
  username?: string;
  createdAt: any;
  answered: boolean;
  likedBy: string[];
  commentCount: number;
}

const PrayerBoard: React.FC = () => {
  const { user, db, userProfile } = useFirebase();
  const { theme } = useTheme();
  const [newPrayer, setNewPrayer] = useState('');
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!db || !user) {
      setLoading(false);
      return;
    }

    const prayersCollection = collection(db, 'prayers');
    const prayersQuery = query(prayersCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      prayersQuery,
      (snapshot) => {
        const fetchedPrayers: PrayerRequest[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedPrayers.push({
            ...data,
            id: doc.id,
            likedBy: data.likedBy || [],
            commentCount: data.commentCount || 0
          } as PrayerRequest);
        });
        setPrayers(fetchedPrayers);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching prayer requests:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [db, user]);

  useEffect(() => {
    // Load comments when a prayer is selected
    if (!db || !selectedPrayer) {
      setComments([]);
      return;
    }

    const commentsCollection = collection(db, `prayers/${selectedPrayer.id}/comments`);
    const commentsQuery = query(commentsCollection, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const fetchedComments: Comment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedComments.push({
            ...data,
            id: doc.id,
          } as Comment);
        });
        setComments(fetchedComments);
      },
      (error) => {
        console.error("Error fetching comments:", error);
      }
    );

    return unsubscribe;
  }, [db, selectedPrayer]);

  const handleAddPrayer = async () => {
    if (!user || !db || !newPrayer.trim()) return;
    setSubmitting(true);

    try {
      const prayersCollection = collection(db, 'prayers');
      await addDoc(prayersCollection, {
        text: newPrayer.trim(),
        userId: user.uid,
        userEmail: user.email,
        username: userProfile?.username || user.email?.split('@')[0] || 'Anonymous',
        createdAt: Timestamp.now(),
        answered: false,
        likedBy: [],
        commentCount: 0
      });
      
      setNewPrayer('');
    } catch (error) {
      console.error("Error adding prayer request:", error);
      Alert.alert("Error", "Failed to add prayer request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAnswered = async (prayerId: string, currentAnswered: boolean) => {
    if (!db) return;
    
    try {
      const prayerDoc = doc(db, 'prayers', prayerId);
      await updateDoc(prayerDoc, {
        answered: !currentAnswered,
      });
    } catch (error) {
      console.error("Error updating prayer request:", error);
    }
  };

  const handleDeletePrayer = async (prayerId: string, prayerUserId: string) => {
    if (!user || !db) return;
    
    // Only allow deletion if the current user created the prayer request
    if (user.uid !== prayerUserId) {
      Alert.alert("Permission Denied", "You can only delete your own prayer requests.");
      return;
    }

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this prayer request? This will also delete all comments.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              // First delete all comments
              const commentsCollection = collection(db, `prayers/${prayerId}/comments`);
              const commentsSnapshot = await getDocs(commentsCollection);
              const deletePromises = commentsSnapshot.docs.map(commentDoc => 
                deleteDoc(doc(db, `prayers/${prayerId}/comments`, commentDoc.id))
              );
              await Promise.all(deletePromises);
              
              // Then delete the prayer request
              const prayerDoc = doc(db, 'prayers', prayerId);
              await deleteDoc(prayerDoc);
            } catch (error) {
              console.error("Error deleting prayer request:", error);
              Alert.alert("Error", "Failed to delete prayer request. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleToggleLike = async (prayer: PrayerRequest) => {
    if (!user || !db) return;
    
    try {
      const prayerDoc = doc(db, 'prayers', prayer.id);
      
      // Check if user already liked this prayer
      const isLiked = prayer.likedBy.includes(user.uid);
      
      if (isLiked) {
        // Unlike
        await updateDoc(prayerDoc, {
          likedBy: arrayRemove(user.uid)
        });
      } else {
        // Like
        await updateDoc(prayerDoc, {
          likedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const openComments = (prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
    setModalVisible(true);
  };

  const handleAddComment = async () => {
    if (!user || !db || !selectedPrayer || !newComment.trim()) return;
    setSubmitting(true);

    try {
      const commentsCollection = collection(db, `prayers/${selectedPrayer.id}/comments`);
      
      // Add the comment
      await addDoc(commentsCollection, {
        text: newComment.trim(),
        userId: user.uid,
        userEmail: user.email,
        username: userProfile?.username || user.email?.split('@')[0] || 'Anonymous',
        createdAt: Timestamp.now()
      });
      
      // Update comment count on the prayer document
      const prayerDoc = doc(db, 'prayers', selectedPrayer.id);
      await updateDoc(prayerDoc, {
        commentCount: (selectedPrayer.commentCount || 0) + 1
      });
      
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!user || !db || !selectedPrayer) return;
    
    // Only allow deletion if the current user created the comment
    if (user.uid !== commentUserId) {
      Alert.alert("Permission Denied", "You can only delete your own comments.");
      return;
    }

    try {
      // Delete the comment
      const commentDoc = doc(db, `prayers/${selectedPrayer.id}/comments`, commentId);
      await deleteDoc(commentDoc);
      
      // Update comment count on the prayer document
      const prayerDoc = doc(db, 'prayers', selectedPrayer.id);
      await updateDoc(prayerDoc, {
        commentCount: Math.max((selectedPrayer.commentCount || 0) - 1, 0)
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  // Function to format the timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.message, { color: theme.colors.text, marginTop: 16 }]}>
          Loading Prayer Board...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="person-circle-outline" size={48} color={theme.colors.primary} />
        <Text style={[styles.message, { color: theme.colors.text, marginTop: 16 }]}>
          Please log in to use the Prayer Board.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, ...getShadowStyle(theme) }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Prayer Board</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Share your prayer requests and support others
          </Text>
        </View>
        
        <View style={[styles.inputContainer, { 
          borderColor: theme.colors.border, 
          backgroundColor: theme.colors.card,
          ...getShadowStyle(theme)
        }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={newPrayer}
            onChangeText={setNewPrayer}
            placeholder="Enter your prayer request..."
            placeholderTextColor={theme.colors.secondary}
            multiline
          />
          <TouchableOpacity 
            style={[
              styles.addButton, 
              { backgroundColor: theme.colors.primary },
              submitting && { opacity: 0.7 }
            ]}
            onPress={handleAddPrayer}
            disabled={submitting || !newPrayer.trim()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.addButtonText}>Add Prayer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={prayers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[
              styles.prayerItem, 
              { 
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                ...getShadowStyle(theme)
              },
              item.answered && [styles.answeredPrayer, { borderColor: theme.colors.success }]
            ]}>
              <View style={styles.prayerHeader}>
                <View style={styles.userInfo}>
                  <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {(item.username || item.userEmail)[0].toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.username, { color: theme.colors.text }]}>
                      {item.username || item.userEmail?.split('@')[0]}
                    </Text>
                    <Text style={[styles.prayerDate, { color: theme.colors.textSecondary }]}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
                
                {item.answered && (
                  <View style={[styles.answeredBadge, { backgroundColor: theme.colors.success }]}>
                    <Text style={styles.answeredText}>Answered</Text>
                  </View>
                )}
              </View>
              
              <Text style={[styles.prayerText, { color: theme.colors.text }]}>
                {item.text}
              </Text>
              
              <View style={[styles.interactionBar, { borderTopColor: theme.colors.divider }]}>
                <TouchableOpacity 
                  style={styles.interactionButton} 
                  onPress={() => handleToggleLike(item)}
                >
                  <Ionicons 
                    name={item.likedBy.includes(user.uid) ? "heart" : "heart-outline"} 
                    size={20} 
                    color={item.likedBy.includes(user.uid) ? theme.colors.danger : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.interactionText,
                    { color: item.likedBy.includes(user.uid) ? theme.colors.danger : theme.colors.textSecondary }
                  ]}>
                    {item.likedBy.length}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.interactionButton}
                  onPress={() => openComments(item)}
                >
                  <Ionicons 
                    name="chatbubble-outline" 
                    size={18} 
                    color={theme.colors.textSecondary} 
                  />
                  <Text style={[styles.interactionText, { color: theme.colors.textSecondary }]}>
                    {item.commentCount || 0}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {user.uid === item.userId && (
                <View style={[styles.ownerActions, { borderTopColor: theme.colors.divider }]}>
                  <TouchableOpacity
                    style={[styles.ownerActionButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handleToggleAnswered(item.id, item.answered)}
                  >
                    <Ionicons 
                      name={item.answered ? "close-circle-outline" : "checkmark-circle-outline"} 
                      size={18} 
                      color={item.answered ? theme.colors.danger : theme.colors.success} 
                    />
                    <Text style={[
                      styles.ownerActionText, 
                      { 
                        color: item.answered ? theme.colors.danger : theme.colors.success 
                      }
                    ]}>
                      {item.answered ? "Mark Unanswered" : "Mark Answered"}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.ownerActionButton, { backgroundColor: `${theme.colors.danger}15` }]}
                    onPress={() => handleDeletePrayer(item.id, item.userId)}
                  >
                    <Ionicons 
                      name="trash-outline" 
                      size={18} 
                      color={theme.colors.danger} 
                    />
                    <Text style={[styles.ownerActionText, { color: theme.colors.danger }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={theme.colors.secondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No prayer requests yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Be the first to add a prayer request
              </Text>
            </View>
          }
        />
        
        {/* Comments Modal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
              <View style={[styles.modalHeader, { 
                backgroundColor: theme.colors.card,
                borderBottomColor: theme.colors.divider,
                ...getShadowStyle(theme)
              }]}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Comments</Text>
                <View style={{ width: 24 }} />
              </View>
              
              {selectedPrayer && (
                <View style={[
                  styles.originalPrayer, 
                  { 
                    backgroundColor: theme.colors.card,
                    borderLeftColor: theme.colors.primary,
                    ...getShadowStyle(theme)
                  }
                ]}>
                  <View style={styles.prayerHeader}>
                    <View style={styles.userInfo}>
                      <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.avatarText}>
                          {(selectedPrayer.username || selectedPrayer.userEmail)[0].toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.username, { color: theme.colors.text }]}>
                          {selectedPrayer.username || selectedPrayer.userEmail?.split('@')[0]}
                        </Text>
                        <Text style={[styles.prayerDate, { color: theme.colors.textSecondary }]}>
                          {formatDate(selectedPrayer.createdAt)}
                        </Text>
                      </View>
                    </View>
                    
                    {selectedPrayer.answered && (
                      <View style={[styles.answeredBadge, { backgroundColor: theme.colors.success }]}>
                        <Text style={styles.answeredText}>Answered</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.originalPrayerText, { color: theme.colors.text }]}>
                    {selectedPrayer.text}
                  </Text>
                </View>
              )}
              
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.commentsList}
                ListHeaderComponent={
                  comments.length > 0 ? (
                    <Text style={[styles.commentsCount, { color: theme.colors.textSecondary }]}>
                      {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                    </Text>
                  ) : null
                }
                renderItem={({ item }) => (
                  <View style={[
                    styles.commentItem, 
                    { 
                      backgroundColor: user?.uid === item.userId 
                        ? `${theme.colors.primary}15` 
                        : theme.colors.card,
                      borderLeftColor: user?.uid === item.userId 
                        ? theme.colors.primary 
                        : theme.colors.border
                    }
                  ]}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentUser}>
                        <View style={[
                          styles.smallAvatarCircle, 
                          { 
                            backgroundColor: user?.uid === item.userId 
                              ? theme.colors.primary 
                              : theme.colors.secondary
                          }
                        ]}>
                          <Text style={styles.smallAvatarText}>
                            {(item.username || item.userEmail)[0].toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.commentAuthor, { color: theme.colors.text }]}>
                          {item.username || item.userEmail?.split('@')[0]}
                        </Text>
                      </View>
                      
                      {user?.uid === item.userId && (
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(item.id, item.userId)}
                        >
                          <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.commentText, { color: theme.colors.text }]}>
                      {item.text}
                    </Text>
                    <Text style={[styles.commentDate, { color: theme.colors.textSecondary }]}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyCommentsContainer}>
                    <Ionicons name="chatbubble-outline" size={40} color={theme.colors.secondary} />
                    <Text style={[styles.emptyCommentsText, { color: theme.colors.textSecondary }]}>
                      No comments yet. Be the first to comment!
                    </Text>
                  </View>
                }
              />
              
              <View style={[
                styles.commentInputContainer, 
                { 
                  borderTopColor: theme.colors.divider,
                  backgroundColor: theme.colors.card
                }
              ]}>
                <TextInput
                  style={[
                    styles.commentInput, 
                    { 
                      backgroundColor: theme.colors.background, 
                      borderColor: theme.colors.border,
                      color: theme.colors.text 
                    }
                  ]}
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Write a comment..."
                  placeholderTextColor={theme.colors.secondary}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity 
                  style={[
                    styles.postButton, 
                    { backgroundColor: theme.colors.primary },
                    (submitting || !newComment.trim()) && { opacity: 0.5 }
                  ]}
                  onPress={handleAddComment}
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send" size={20} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

// Helper function for consistent shadow styling
const getShadowStyle = (theme: any) => {
  if (Platform.OS === 'ios') {
      return {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.8,
          shadowRadius: 3,
      };
  } else {
      return {
          elevation: 3,
      };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    padding: 16,
    borderRadius: 0,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  inputContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 0,
  },
  input: {
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    margin: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24
  },
  prayerItem: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 0,
    overflow: 'hidden',
  },
  answeredPrayer: {
    borderLeftWidth: 4,
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  prayerDate: {
    fontSize: 12,
  },
  answeredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  answeredText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  interactionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  interactionText: {
    marginLeft: 4,
    fontSize: 14,
  },
  ownerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderTopWidth: 1,
  },
  ownerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  ownerActionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  message: {
    padding: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  originalPrayer: {
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  originalPrayerText: {
    fontSize: 16,
    lineHeight: 24,
    padding: 12,
  },
  commentsList: {
    padding: 16,
    paddingBottom: 80,
  },
  commentsCount: {
    fontSize: 14,
    marginBottom: 12,
  },
  commentItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  smallAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentAuthor: {
    fontWeight: '600',
    fontSize: 14,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
  },
  commentDate: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyCommentsText: {
    marginTop: 8,
    textAlign: 'center',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  postButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PrayerBoard;