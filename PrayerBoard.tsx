import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Button, 
  FlatList, 
  Alert, 
  TouchableOpacity,
  Modal
} from 'react-native';
import { useFirebase } from './FirebaseContext';
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
  getDoc,
  setDoc,
  getDocs
} from 'firebase/firestore';

interface Comment {
  id: string;
  text: string;
  userId: string;
  userEmail: string;
  createdAt: any;
}

interface PrayerRequest {
  id: string;
  text: string;
  userId: string;
  userEmail: string;
  createdAt: any;
  answered: boolean;
  likedBy: string[];
  commentCount: number;
}

const PrayerBoard: React.FC = () => {
  const { user, db } = useFirebase();
  const [newPrayer, setNewPrayer] = useState('');
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);

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
    //load comments when a prayer is selected
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

    try {
      const prayersCollection = collection(db, 'prayers');
      await addDoc(prayersCollection, {
        text: newPrayer.trim(),
        userId: user.uid,
        userEmail: user.email,
        createdAt: Timestamp.now(),
        answered: false,
        likedBy: [],
        commentCount: 0
      });
      
      setNewPrayer('');
    } catch (error) {
      console.error("Error adding prayer request:", error);
      Alert.alert("Error", "Failed to add prayer request. Please try again.");
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
    
    //only allow deletion if the current user created the prayer request
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
              //first delete all comments
              const commentsCollection = collection(db, `prayers/${prayerId}/comments`);
              const commentsSnapshot = await getDocs(commentsCollection);
              const deletePromises = commentsSnapshot.docs.map(commentDoc => 
                deleteDoc(doc(db, `prayers/${prayerId}/comments`, commentDoc.id))
              );
              await Promise.all(deletePromises);
              
              //then delete the prayer request
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
      
      //check if user already liked this prayer
      const isLiked = prayer.likedBy.includes(user.uid);
      
      if (isLiked) {
        //unlike
        await updateDoc(prayerDoc, {
          likedBy: arrayRemove(user.uid)
        });
      } else {
        //like
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

    try {
      const commentsCollection = collection(db, `prayers/${selectedPrayer.id}/comments`);
      
      //add the comment
      await addDoc(commentsCollection, {
        text: newComment.trim(),
        userId: user.uid,
        userEmail: user.email,
        createdAt: Timestamp.now()
      });
      
      //update comment count on the prayer document
      const prayerDoc = doc(db, 'prayers', selectedPrayer.id);
      await updateDoc(prayerDoc, {
        commentCount: (selectedPrayer.commentCount || 0) + 1
      });
      
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment. Please try again.");
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!user || !db || !selectedPrayer) return;
    
    //only allow deletion if the current user created the comment
    if (user.uid !== commentUserId) {
      Alert.alert("Permission Denied", "You can only delete your own comments.");
      return;
    }

    try {
      //delete the comment
      const commentDoc = doc(db, `prayers/${selectedPrayer.id}/comments`, commentId);
      await deleteDoc(commentDoc);
      
      //update comment count on the prayer document
      const prayerDoc = doc(db, 'prayers', selectedPrayer.id);
      await updateDoc(prayerDoc, {
        commentCount: Math.max((selectedPrayer.commentCount || 0) - 1, 0)
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Please log in to use the Prayer Board.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading Prayer Board...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prayer Board</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newPrayer}
          onChangeText={setNewPrayer}
          placeholder="Enter your prayer request..."
          multiline
        />
        <Button title="Add Prayer" onPress={handleAddPrayer} />
      </View>
      
      <FlatList
        data={prayers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.prayerItem, item.answered && styles.answeredPrayer]}>
            <Text style={styles.prayerText}>{item.text}</Text>
            <Text style={styles.prayerMeta}>
              Posted by: {item.userEmail?.split('@')[0]} 
              {item.answered ? ' (Answered)' : ''}
            </Text>
            
            <View style={styles.interactionBar}>
              <TouchableOpacity 
                style={styles.interactionButton} 
                onPress={() => handleToggleLike(item)}
              >
                <Text style={[
                  styles.interactionText,
                  item.likedBy.includes(user.uid) && styles.likedText
                ]}>
                  ❤️ {item.likedBy.length}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.interactionButton}
                onPress={() => openComments(item)}
              >
                <Text style={styles.interactionText}>
                  💬 {item.commentCount || 0}
                </Text>
              </TouchableOpacity>
            </View>
            
            {user.uid === item.userId && (
              <View style={styles.prayerActions}>
                <Button
                  title={item.answered ? "Mark Unanswered" : "Mark Answered"}
                  onPress={() => handleToggleAnswered(item.id, item.answered)}
                />
                <Button
                  title="Delete"
                  onPress={() => handleDeletePrayer(item.id, item.userId)}
                  color="#dc3545"
                />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.message}>No prayer requests yet. Be the first to add one!</Text>
        }
      />
      
      {/* Comments Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments</Text>
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
          
          {selectedPrayer && (
            <View style={styles.originalPrayer}>
              <Text style={styles.originalPrayerText}>{selectedPrayer.text}</Text>
              <Text style={styles.prayerMeta}>
                Posted by: {selectedPrayer.userEmail?.split('@')[0]}
                {selectedPrayer.answered ? ' (Answered)' : ''}
              </Text>
            </View>
          )}
          
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>
                    {item.userEmail?.split('@')[0]}:
                  </Text>
                  {user.uid === item.userId && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(item.id, item.userId)}
                    >
                      <Text style={styles.deleteCommentText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.commentText}>{item.text}</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.message}>No comments yet. Be the first to comment!</Text>
            }
          />
          
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Write a comment..."
              multiline
            />
            <Button title="Post" onPress={handleAddComment} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  input: {
    padding: 12,
    fontSize: 16,
    minHeight: 80,
  },
  prayerItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  answeredPrayer: {
    backgroundColor: '#e8f4f8',
    borderColor: '#a8dadc',
  },
  prayerText: {
    fontSize: 16,
    marginBottom: 8,
  },
  prayerMeta: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  interactionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 8,
    marginBottom: 8,
  },
  interactionButton: {
    marginRight: 16,
  },
  interactionText: {
    fontSize: 14,
    color: '#6c757d',
  },
  likedText: {
    color: '#e91e63',
  },
  prayerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  message: {
    padding: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  originalPrayer: {
    backgroundColor: '#e9ecef',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  originalPrayerText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  commentItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentText: {
    fontSize: 14,
  },
  deleteCommentText: {
    color: '#dc3545',
    fontSize: 12,
  },
  commentInputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ced4da',
    paddingTop: 16,
    marginTop: 8,
  },
  commentInput: {
    backgroundColor: 'white',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    fontSize: 16,
    minHeight: 60,
    marginBottom: 8,
  },
});

export default PrayerBoard;